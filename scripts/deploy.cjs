const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { parseUnits } = require("viem");
const { privateKeyToAccount } = require("viem/accounts");

function normalizeKey(k) {
  if (!k) return undefined;
  const t = k.trim();
  return t.startsWith("0x") ? t : `0x${t}`;
}

async function main() {
  const walletClients = await hre.viem.getWalletClients();
  const [deployer, agentClient, attackerClient, supplierClient] = walletClients;
  const publicClient = await hre.viem.getPublicClient();
  const chainId = await publicClient.getChainId();

  console.log(`=== Deploying SCOPE on chainId ${chainId} — deployer ${deployer.account.address} ===`);

  // Resolve demo principals. On a local devnet these come from unlocked wallets; on a public
  // testnet only the deployer exists, so the agent is derived from AGENT_PRIVATE_KEY and the
  // supplier/attacker fall back to fixed demo values.
  const agentKey = normalizeKey(process.env.AGENT_PRIVATE_KEY);
  const agentAddress = agentClient
    ? agentClient.account.address
    : agentKey
      ? privateKeyToAccount(agentKey).address
      : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  // 0x9999...beef per PRD §7 (valid lowercase 20-byte address).
  const attackerAddress = attackerClient
    ? attackerClient.account.address
    : "0x" + "9".repeat(36) + "beef";

  // 1. MockUSDC
  console.log("1. Deploying MockUSDC (Demo USD Coin)...");
  const mockUSDC = await hre.viem.deployContract("MockUSDC", [parseUnits("10000000", 6)]);
  console.log(`   MockUSDC: ${mockUSDC.address}`);

  // 2. ScopePolicyRegistry
  console.log("2. Deploying ScopePolicyRegistry...");
  const registry = await hre.viem.deployContract("ScopePolicyRegistry");
  console.log(`   ScopePolicyRegistry: ${registry.address}`);

  // 3. ScopeExecutor
  console.log("3. Deploying ScopeExecutor...");
  const executor = await hre.viem.deployContract("ScopeExecutor", [registry.address]);
  console.log(`   ScopeExecutor: ${executor.address}`);

  // 4. SafeMerchant (Acme Components / ProcurementRouter)
  console.log("4. Deploying SafeMerchant (Acme Components)...");
  const safeMerchant = await hre.viem.deployContract("SafeMerchant", [
    "Acme Components",
    supplierClient ? supplierClient.account.address : deployer.account.address,
  ]);
  console.log(`   SafeMerchant: ${safeMerchant.address}`);

  // 5. MaliciousMerchant (phishing clone / rogue recipient)
  console.log("5. Deploying MaliciousMerchant...");
  const maliciousMerchant = await hre.viem.deployContract("MaliciousMerchant", [attackerAddress]);
  console.log(`   MaliciousMerchant: ${maliciousMerchant.address}`);

  const supplierAddress = supplierClient ? supplierClient.account.address : safeMerchant.address;

  // 6. Provision Atlas: mint 25,000 DEMO USDC AND grant the executor a standing allowance in a
  //    single deployer call, so the gasless agent never needs ETH to send an approve() tx.
  console.log(`Provisioning Atlas agent ${agentAddress} (mint 25,000 USDC + allowance to executor)...`);
  await mockUSDC.write.demoProvision([agentAddress, executor.address, parseUnits("25000", 6)]);

  // 7. Register & activate the default Procurement policy (createPolicy also activates).
  console.log("Registering default Procurement policy...");
  const now = Math.floor(Date.now() / 1000);
  const validAfter = BigInt(now - 3600);
  const validUntil = BigInt(now + 30 * 86400); // 30 days
  const maxPerAction = parseUnits("500", 6);
  const dailyLimit = parseUnits("2000", 6);
  const allowedRecipients = supplierClient
    ? [supplierAddress, safeMerchant.address]
    : [safeMerchant.address];

  await registry.write.createPolicy([
    agentAddress,
    [safeMerchant.address],
    [mockUSDC.address],
    allowedRecipients,
    maxPerAction,
    dailyLimit,
    validAfter,
    validUntil,
  ]);

  const policyHash = await registry.read.agentActivePolicy([agentAddress]);
  console.log(`   Policy registered & active! Hash: ${policyHash}`);

  const deploymentData = {
    chainId,
    deployedAt: new Date().toISOString(),
    contracts: {
      MockUSDC: mockUSDC.address,
      ScopePolicyRegistry: registry.address,
      ScopeExecutor: executor.address,
      SafeMerchant: safeMerchant.address,
      MaliciousMerchant: maliciousMerchant.address,
    },
    demoAccounts: {
      owner: deployer.account.address,
      agent: agentAddress,
      supplier: supplierAddress,
      attacker: attackerAddress,
    },
    defaultPolicyHash: policyHash,
  };

  const outputDir = path.join(__dirname, "..", "lib", "blockchain");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(outputDir, "deployments.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("Deployments saved to lib/blockchain/deployments.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
