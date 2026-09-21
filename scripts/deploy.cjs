const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const { parseUnits } = require("viem");

async function main() {
  console.log("=== Deploying SCOPE Smart Contracts ===");

  const [deployer, agent, attacker, supplier] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const chainId = await publicClient.getChainId();
  console.log(`Deploying on chainId: ${chainId} with deployer: ${deployer.account.address}`);

  // 1. MockUSDC
  console.log("1. Deploying MockUSDC...");
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

  // 4. SafeMerchant
  console.log("4. Deploying SafeMerchant (Acme Components)...");
  const safeMerchant = await hre.viem.deployContract("SafeMerchant", [
    "Acme Components",
    supplier ? supplier.account.address : deployer.account.address,
  ]);
  console.log(`   SafeMerchant: ${safeMerchant.address}`);

  // 5. MaliciousMerchant
  console.log("5. Deploying MaliciousMerchant (Phishing Clone)...");
  const maliciousMerchant = await hre.viem.deployContract("MaliciousMerchant", [
    attacker ? attacker.account.address : "0x000000000000000000000000000000000000dEaD",
  ]);
  console.log(`   MaliciousMerchant: ${maliciousMerchant.address}`);

  // Initial Agent funding & policy registration
  const agentAddress = agent ? agent.account.address : "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const supplierAddress = supplier ? supplier.account.address : "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  const attackerAddress = attacker ? attacker.account.address : "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";

  console.log(`Funding Atlas Agent (${agentAddress}) with 25,000 DEMO USDC...`);
  await mockUSDC.write.faucet([agentAddress, parseUnits("25000", 6)]);

  // Agent approves executor
  if (agent) {
    const agentUsdc = await hre.viem.getContractAt("MockUSDC", mockUSDC.address, {
      client: { wallet: agent },
    });
    await agentUsdc.write.approve([executor.address, parseUnits("1000000", 6)]);
  }

  // Create Procurement V3 Policy
  console.log("Registering default Procurement V3 policy...");
  const validAfter = BigInt(Math.floor(Date.now() / 1000) - 3600);
  const validUntil = BigInt(Math.floor(Date.now() / 1000) + 30 * 86400); // 30 days
  const maxPerAction = parseUnits("500", 6);
  const dailyLimit = parseUnits("2000", 6);

  await registry.write.createPolicy([
    agentAddress,
    [safeMerchant.address],
    [mockUSDC.address],
    [supplierAddress, safeMerchant.address],
    maxPerAction,
    dailyLimit,
    validAfter,
    validUntil,
  ]);

  const policyHash = await registry.read.agentActivePolicy([agentAddress]);
  console.log(`   Policy registered! Hash: ${policyHash}`);

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
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(outputDir, "deployments.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(`Deployments saved to lib/blockchain/deployments.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
