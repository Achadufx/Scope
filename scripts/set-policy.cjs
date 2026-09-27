/**
 * Register an expanded active policy that additionally allowlists MaliciousMerchant as a
 * target + recipient. This lets the OUTCOME_SLIPPAGE scenario reach the ScopeExecutor's
 * postcondition check (step 12) instead of being short-circuited by the target allowlist
 * (step 5) — so the demo showcases OUTCOME_VIOLATION (the postcondition catching an
 * underdelivering-but-allowlisted merchant), the headline "verify outcome" differentiator.
 *
 * createPolicy computes a fresh hash (allPolicyHashes.length changed) and repoints
 * agentActivePolicy[agent] at it, so the new policy becomes authoritative for the agent.
 * Uses a fallback() transport across several Base Sepolia endpoints and reads the resulting
 * hash back from a single consistent node (retrying) to avoid a stale lagging-node read.
 */
const fs = require("fs");
const path = require("path");
try {
  require("dotenv").config();
} catch (_) {}
const { createWalletClient, createPublicClient, http, fallback, parseUnits, getAddress } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");
const registryArtifact = require("../artifacts/contracts/ScopePolicyRegistry.sol/ScopePolicyRegistry.json");

const REGISTRY = getAddress("0xc7d3ffaDd13b5731C046e2c6b1940242e7c152A0");
const SAFE = getAddress("0x2743b0D8BF2f16b0bf686F26bC717F558D03eD97");
const MALICIOUS = getAddress("0xB78c6Dd8F1d8b6b0324CE3B75f85Ec41cFF02697");
const USDC = getAddress("0x2dFe7e9DB1f37AE3381806e0128d6Aae91fC1e02");
const AGENT = getAddress("0xc18AcD2e8B9b1984358D92C7C989856f44a63E55");
const ZERO32 = "0x0000000000000000000000000000000000000000000000000000000000000000";
const RPCS = [process.env.RPC_URL, "https://sepolia.base.org", "https://base-sepolia-rpc.publicnode.com", "https://base-sepolia.gateway.tenderly.co"].filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeKey(k) {
  if (!k) return undefined;
  const t = k.trim();
  return t.startsWith("0x") ? t : `0x${t}`;
}

async function main() {
  const deployerKey = normalizeKey(process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY);
  if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  const deployer = privateKeyToAccount(deployerKey);
  const transport = fallback(RPCS.map((u) => http(u, { timeout: 20_000 })), { retryCount: 4, retryDelay: 800 });
  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  const walletClient = createWalletClient({ account: deployer, chain: baseSepolia, transport });

  const chainId = await publicClient.getChainId();
  if (chainId !== 84532) throw new Error(`Expected 84532, got ${chainId}`);

  const prev = await publicClient.readContract({ address: REGISTRY, abi: registryArtifact.abi, functionName: "agentActivePolicy", args: [AGENT] });
  console.log(`Previous active policy: ${prev}`);

  const now = Math.floor(Date.now() / 1000);
  const args = [
    AGENT,
    [SAFE, MALICIOUS], // allowedTargets (MaliciousMerchant now passes step 5)
    [USDC], // allowedAssets
    [SAFE, MALICIOUS], // allowedRecipients
    parseUnits("500", 6),
    parseUnits("2000", 6),
    BigInt(now - 3600),
    BigInt(now + 30 * 86400),
  ];

  console.log("Registering expanded Procurement policy (SafeMerchant + MaliciousMerchant)...");
  const { request } = await publicClient.simulateContract({ account: deployer, address: REGISTRY, abi: registryArtifact.abi, functionName: "createPolicy", args });
  const txHash = await walletClient.writeContract(request);
  console.log(`   createPolicy tx: ${txHash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`   Mined in block ${receipt.blockNumber} (status: ${receipt.status})`);
  if (receipt.status !== "success") throw new Error("createPolicy reverted");

  // Read the new active hash back from a single consistent node, retrying for propagation.
  let hash = ZERO32;
  for (let i = 0; i < 8 && (hash === ZERO32 || hash === prev); i++) {
    for (const url of RPCS) {
      try {
        const c = createPublicClient({ chain: baseSepolia, transport: http(url, { timeout: 20_000 }) });
        const h = await c.readContract({ address: REGISTRY, abi: registryArtifact.abi, functionName: "agentActivePolicy", args: [AGENT] });
        if (h && h !== ZERO32 && h !== prev) { hash = h; break; }
      } catch (_) {}
    }
    if (hash === ZERO32 || hash === prev) await sleep(2500);
  }
  if (hash === ZERO32 || hash === prev) throw new Error("New policy hash did not propagate");
  console.log(`   New active policy hash: ${hash}`);

  const depPath = path.join(__dirname, "..", "lib", "blockchain", "deployments.json");
  const dep = JSON.parse(fs.readFileSync(depPath, "utf-8"));
  dep.defaultPolicyHash = hash;
  fs.writeFileSync(depPath, JSON.stringify(dep, null, 2));
  console.log(`   deployments.json defaultPolicyHash updated -> ${hash}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e.shortMessage || e.message); process.exit(1); });
