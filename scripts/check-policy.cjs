/**
 * Read the true active-policy hash for the agent from Base Sepolia and patch it into
 * deployments.json. The resume script's post-write read was served by a lagging fallback
 * node and returned a stale zero; createPolicy provably sets agentActivePolicy in the same
 * tx (ScopePolicyRegistry.sol:102-104), so we re-query a single consistent node until the
 * chain reflects the mined state, then also print the on-chain policy params as proof.
 */
const fs = require("fs");
const path = require("path");
try {
  require("dotenv").config();
} catch (_) {}
const { createPublicClient, http, formatUnits, getAddress } = require("viem");
const { baseSepolia } = require("viem/chains");
const registryArtifact = require("../artifacts/contracts/ScopePolicyRegistry.sol/ScopePolicyRegistry.json");

const REGISTRY = getAddress("0xc7d3ffadd13b5731c046e2c6b1940242e7c152a0");
const AGENT = getAddress("0xc18AcD2e8B9b1984358D92C7C989856f44a63E55");
const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const ENDPOINTS = [
  process.env.BASE_SEPOLIA_RPC_URL,
  "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function readActiveHash() {
  // Poll a single consistent node until it reports the mined state (non-zero hash).
  for (let attempt = 0; attempt < 8; attempt++) {
    for (const url of ENDPOINTS) {
      try {
        const client = createPublicClient({ chain: baseSepolia, transport: http(url, { timeout: 20_000 }) });
        const hash = await client.readContract({
          address: REGISTRY,
          abi: registryArtifact.abi,
          functionName: "agentActivePolicy",
          args: [AGENT],
        });
        if (hash && hash !== ZERO32) return { hash, url, client };
      } catch (_) {
        /* try next endpoint */
      }
    }
    await sleep(2500);
  }
  throw new Error("agentActivePolicy still zero after retries across all endpoints");
}

async function main() {
  const { hash, url, client } = await readActiveHash();
  console.log(`Active policy hash (via ${url}): ${hash}`);

  // Prove the policy is real and carries the intended economic envelope.
  const total = await client.readContract({ address: REGISTRY, abi: registryArtifact.abi, functionName: "totalPolicies" });
  const p = await client.readContract({
    address: REGISTRY,
    abi: registryArtifact.abi,
    functionName: "getActivePolicyForAgent",
    args: [AGENT],
  });
  console.log(`totalPolicies: ${total}`);
  console.log(`  owner:            ${p.owner}`);
  console.log(`  agent:            ${p.agent}`);
  console.log(`  active:           ${p.active}`);
  console.log(`  maxPerAction:     ${formatUnits(p.maxPerAction, 6)} USDC`);
  console.log(`  dailyLimit:       ${formatUnits(p.dailyLimit, 6)} USDC`);
  console.log(`  allowedTargets:   ${p.allowedTargets.join(", ")}`);
  console.log(`  allowedAssets:    ${p.allowedAssets.join(", ")}`);
  console.log(`  allowedRecipients:${p.allowedRecipients.join(", ")}`);
  console.log(`  validAfter:       ${new Date(Number(p.validAfter) * 1000).toISOString()}`);
  console.log(`  validUntil:       ${new Date(Number(p.validUntil) * 1000).toISOString()}`);

  // Patch deployments.json with the real hash.
  const depPath = path.join(__dirname, "..", "lib", "blockchain", "deployments.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf-8"));
  const before = dep.defaultPolicyHash;
  dep.defaultPolicyHash = hash;
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  console.log(`\ndeployments.json defaultPolicyHash: ${before} -> ${hash}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e.shortMessage || e.message);
    process.exit(1);
  });
