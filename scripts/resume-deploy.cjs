/**
 * Resume the Base Sepolia deploy after the public RPC dropped `createPolicy`.
 *
 * The initial `hardhat run scripts/deploy.cjs` deployed all 5 contracts and ran
 * `demoProvision` successfully, then the public sepolia.base.org endpoint returned
 * "this request method is not supported" on `createPolicy` (a flaky backend node),
 * so the script exited before writing deployments.json.
 *
 * This script does NOT redeploy anything. It reuses the already-mined addresses and
 * finishes the tail — register+activate the policy, then persist deployments.json —
 * using raw viem with a fallback() transport across several Base Sepolia endpoints so
 * a single degraded node can't stall it. It is idempotent: if an active policy already
 * exists for the agent, it skips straight to writing deployments.json.
 */
const fs = require("fs");
const path = require("path");
try {
  require("dotenv").config();
} catch (_) {
  /* env may come from the shell */
}
const {
  createWalletClient,
  createPublicClient,
  http,
  fallback,
  parseUnits,
  formatUnits,
  getAddress,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const { baseSepolia } = require("viem/chains");

const registryArtifact = require("../artifacts/contracts/ScopePolicyRegistry.sol/ScopePolicyRegistry.json");
const usdcArtifact = require("../artifacts/contracts/MockUSDC.sol/MockUSDC.json");

// Addresses mined by the initial (partial) deploy — from /tmp/scope-deploy.log.
const CONTRACTS = {
  MockUSDC: getAddress("0x2dfe7e9db1f37ae3381806e0128d6aae91fc1e02"),
  ScopePolicyRegistry: getAddress("0xc7d3ffadd13b5731c046e2c6b1940242e7c152a0"),
  ScopeExecutor: getAddress("0xee62ffa33e8c42772ad16499f6d6ccd2aa620a4d"),
  SafeMerchant: getAddress("0x2743b0d8bf2f16b0bf686f26bc717f558d03ed97"),
  MaliciousMerchant: getAddress("0xb78c6dd8f1d8b6b0324ce3b75f85ec41cff02697"),
};

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

function normalizeKey(k) {
  if (!k) return undefined;
  const t = k.trim();
  return t.startsWith("0x") ? t : `0x${t}`;
}

// Multiple public Base Sepolia endpoints. fallback() rotates to the next on any error,
// so one node returning "method not supported" no longer stalls the send.
const RPC_URLS = [
  process.env.BASE_SEPOLIA_RPC_URL,
  process.env.RPC_URL,
  "https://sepolia.base.org",
  "https://base-sepolia-rpc.publicnode.com",
  "https://base-sepolia.gateway.tenderly.co",
  "https://1rpc.io/base-sepolia",
].filter(Boolean);

async function main() {
  const deployerKey = normalizeKey(process.env.DEPLOYER_PRIVATE_KEY || process.env.PRIVATE_KEY);
  if (!deployerKey) throw new Error("DEPLOYER_PRIVATE_KEY (or PRIVATE_KEY) is not set in the environment");
  const deployer = privateKeyToAccount(deployerKey);

  const agentKey = normalizeKey(process.env.AGENT_PRIVATE_KEY);
  const agentAddress = agentKey
    ? privateKeyToAccount(agentKey).address
    : getAddress("0xc18AcD2e8B9b1984358D92C7C989856f44a63E55");

  // testnet path (deploy.cjs): supplier == SafeMerchant, single allowed recipient.
  const supplierAddress = CONTRACTS.SafeMerchant;
  const attackerAddress = getAddress("0x" + "9".repeat(36) + "beef");

  const transport = fallback(
    RPC_URLS.map((u) => http(u, { timeout: 20_000 })),
    { retryCount: 4, retryDelay: 800 }
  );
  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  const walletClient = createWalletClient({ account: deployer, chain: baseSepolia, transport });

  const chainId = await publicClient.getChainId();
  console.log(`=== Resuming SCOPE deploy on chainId ${chainId} — deployer ${deployer.address} ===`);
  if (chainId !== 84532) throw new Error(`Expected Base Sepolia (84532) but connected to ${chainId}`);

  // Confirm demoProvision actually landed before the failure (non-fatal — informational).
  try {
    const [bal, allowance] = await Promise.all([
      publicClient.readContract({
        address: CONTRACTS.MockUSDC,
        abi: usdcArtifact.abi,
        functionName: "balanceOf",
        args: [agentAddress],
      }),
      publicClient.readContract({
        address: CONTRACTS.MockUSDC,
        abi: usdcArtifact.abi,
        functionName: "allowance",
        args: [agentAddress, CONTRACTS.ScopeExecutor],
      }),
    ]);
    console.log(`   Agent USDC balance: ${formatUnits(bal, 6)} | allowance -> executor: ${formatUnits(allowance, 6)}`);
  } catch (e) {
    console.log(`   (Could not read USDC state: ${e.shortMessage || e.message})`);
  }

  // Idempotency: is a policy already active for the agent?
  let policyHash = await publicClient.readContract({
    address: CONTRACTS.ScopePolicyRegistry,
    abi: registryArtifact.abi,
    functionName: "agentActivePolicy",
    args: [agentAddress],
  });

  if (policyHash && policyHash !== ZERO_BYTES32) {
    console.log(`   Active policy already present (${policyHash}) — skipping createPolicy.`);
  } else {
    const now = Math.floor(Date.now() / 1000);
    const args = [
      agentAddress,
      [CONTRACTS.SafeMerchant], // allowedTargets
      [CONTRACTS.MockUSDC], // allowedAssets
      [supplierAddress], // allowedRecipients (testnet path)
      parseUnits("500", 6), // maxPerAction
      parseUnits("2000", 6), // dailyLimit
      BigInt(now - 3600), // validAfter
      BigInt(now + 30 * 86400), // validUntil (30 days)
    ];

    console.log("Registering default Procurement policy (createPolicy also activates)...");
    const { request } = await publicClient.simulateContract({
      account: deployer,
      address: CONTRACTS.ScopePolicyRegistry,
      abi: registryArtifact.abi,
      functionName: "createPolicy",
      args,
    });
    const txHash = await walletClient.writeContract(request);
    console.log(`   createPolicy tx: ${txHash}`);
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`   Mined in block ${receipt.blockNumber} (status: ${receipt.status})`);
    if (receipt.status !== "success") throw new Error("createPolicy transaction reverted onchain");

    policyHash = await publicClient.readContract({
      address: CONTRACTS.ScopePolicyRegistry,
      abi: registryArtifact.abi,
      functionName: "agentActivePolicy",
      args: [agentAddress],
    });
    console.log(`   Policy registered & active! Hash: ${policyHash}`);
  }

  const deploymentData = {
    chainId,
    deployedAt: new Date().toISOString(),
    contracts: CONTRACTS,
    demoAccounts: {
      owner: deployer.address,
      agent: agentAddress,
      supplier: supplierAddress,
      attacker: attackerAddress,
    },
    defaultPolicyHash: policyHash,
  };

  const outputDir = path.join(__dirname, "..", "lib", "blockchain");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "deployments.json"), JSON.stringify(deploymentData, null, 2));
  console.log("Deployments saved to lib/blockchain/deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
