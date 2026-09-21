import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding SCOPE database...");

  // Load deployment addresses if present
  let deployments = {
    contracts: {
      MockUSDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      ScopePolicyRegistry: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      ScopeExecutor: "0x9fE46736679d2D9a65F0992F2272dE9f3c7FA6e0",
      SafeMerchant: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      MaliciousMerchant: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    },
    demoAccounts: {
      owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      agent: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      supplier: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      attacker: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    },
    defaultPolicyHash: "0xad004f14e581016b266454fd1fdea3ae6f62df1bb60bda62884753d9360f5e88",
  };

  const depPath = path.join(__dirname, "..", "lib", "blockchain", "deployments.json");
  if (fs.existsSync(depPath)) {
    deployments = JSON.parse(fs.readFileSync(depPath, "utf-8"));
  }

  // Clear existing records
  await prisma.violation.deleteMany();
  await prisma.executionCheck.deleteMany();
  await prisma.execution.deleteMany();
  await prisma.policyRule.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.activityEvent.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // 1. User & Workspace
  const user = await prisma.user.create({
    data: {
      email: "security@acme-autonomous.io",
      name: "Acme Autonomous Security Lead",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: "Acme Autonomous Systems",
      slug: "acme-autonomous",
      userId: user.id,
    },
  });

  // 2. Agent: Atlas Procurement Agent
  const agent = await prisma.agent.create({
    data: {
      workspaceId: workspace.id,
      name: "Atlas Procurement Agent",
      description: "Autonomous inventory replenishment and supplier procurement agent operating under strict economic policies.",
      walletAddress: deployments.demoAccounts.agent,
      status: "ACTIVE",
    },
  });

  // 3. Policy: Procurement V3
  const policy = await prisma.policy.create({
    data: {
      agentId: agent.id,
      name: "Procurement V3",
      owner: deployments.demoAccounts.owner,
      maxPerAction: 500.0,
      dailyLimit: 2000.0,
      validAfter: new Date(Date.now() - 3600 * 1000 * 24 * 2), // 2 days ago
      validUntil: new Date(Date.now() + 3600 * 1000 * 24 * 28), // 28 days from now
      active: true,
      policyHash: deployments.defaultPolicyHash,
      chainId: deployments.chainId || 31337,
      contractAddress: deployments.contracts.ScopePolicyRegistry,
    },
  });

  // 4. Policy Rules
  const rules = [
    {
      policyId: policy.id,
      type: "ALLOWED_ASSET",
      value: deployments.contracts.MockUSDC,
      metadata: JSON.stringify({ symbol: "USDC", name: "Demo USD Coin", decimals: 6 }),
    },
    {
      policyId: policy.id,
      type: "ALLOWED_TARGET",
      value: deployments.contracts.SafeMerchant,
      metadata: JSON.stringify({ name: "ProcurementRouter", verified: true }),
    },
    {
      policyId: policy.id,
      type: "ALLOWED_RECIPIENT",
      value: deployments.demoAccounts.supplier,
      metadata: JSON.stringify({ name: "Acme Components", tag: "Primary Hardware Vendor" }),
    },
    {
      policyId: policy.id,
      type: "ALLOWED_RECIPIENT",
      value: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
      metadata: JSON.stringify({ name: "Northstar Supplies", tag: "Secondary Vendor" }),
    },
    {
      policyId: policy.id,
      type: "MAX_AMOUNT",
      value: "500",
      metadata: JSON.stringify({ unit: "USDC", enforcedOnchain: true }),
    },
    {
      policyId: policy.id,
      type: "DAILY_LIMIT",
      value: "2000",
      metadata: JSON.stringify({ unit: "USDC", epoch: "24h rolling" }),
    },
    {
      policyId: policy.id,
      type: "TIME_WINDOW",
      value: "08:00-18:00 UTC",
      metadata: JSON.stringify({ timezone: "UTC", enforceDays: "Mon-Fri" }),
    },
    {
      policyId: policy.id,
      type: "MIN_OUTPUT",
      value: "100%",
      metadata: JSON.stringify({ slippageTolerancePct: 0.5 }),
    },
  ];

  for (const rule of rules) {
    await prisma.policyRule.create({ data: rule });
  }

  // 5. Pre-seeded Executions (Total today: $480 + $320 + $484 = $1,284 / $2,000!)
  const ex1 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 480.0,
      recipient: deployments.demoAccounts.supplier,
      status: "SUCCESS",
      decision: "ALLOW",
      txHash: "0x892a71f021e84a2f8b5490bc738914022aef912048cf7298625b9021817e94cb",
      blockNumber: 120489,
      gasUsed: 68420,
      capitalMoved: 480.0,
      capitalProtected: 0.0,
      createdAt: new Date(Date.now() - 8 * 1000), // 8 seconds ago as requested!
    },
  });

  const ex2 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 320.0,
      recipient: deployments.demoAccounts.supplier,
      status: "SUCCESS",
      decision: "ALLOW",
      txHash: "0x127bcf91048e71829ad018bceca782190842fbc98214bbaf91728490a0198421",
      blockNumber: 120412,
      gasUsed: 67910,
      capitalMoved: 320.0,
      capitalProtected: 0.0,
      createdAt: new Date(Date.now() - 14 * 60 * 1000),
    },
  });

  const ex3 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 484.0,
      recipient: deployments.demoAccounts.supplier,
      status: "SUCCESS",
      decision: "ALLOW",
      txHash: "0xf8294a91bce09418290baef91823709bcefa90128490bcad8192081924afcb09",
      blockNumber: 120350,
      gasUsed: 69120,
      capitalMoved: 484.0,
      capitalProtected: 0.0,
      createdAt: new Date(Date.now() - 48 * 60 * 1000),
    },
  });

  // 6. Pre-seeded Blocked Attacks (Forensic Evidence)
  const attack1 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 480.0,
      recipient: deployments.demoAccounts.attacker,
      status: "REVERTED",
      decision: "BLOCK",
      txHash: "0x3918fca9b01284fa981720bdfa89102489012849a90184209bcfa89102489012",
      blockNumber: 120491,
      gasUsed: 42100,
      capitalMoved: 0.0,
      capitalProtected: 480.0,
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
    },
  });

  await prisma.violation.create({
    data: {
      executionId: attack1.id,
      type: "RECIPIENT_NOT_ALLOWED",
      expected: `Acme Components (${deployments.demoAccounts.supplier})`,
      actual: `Rogue Attacker Wallet (${deployments.demoAccounts.attacker})`,
      severity: "CRITICAL",
    },
  });

  // Attach execution checks
  const checks1 = [
    { step: "SIGNATURE", passed: true, details: "Valid agent EIP-712 cryptographic signature" },
    { step: "POLICY_ACTIVE", passed: true, details: "Policy Procurement V3 active onchain" },
    { step: "TIME_WINDOW", passed: true, details: "Execution inside operational window" },
    { step: "TARGET_ALLOWED", passed: true, details: "Target ProcurementRouter matches whitelist" },
    { step: "ASSET_ALLOWED", passed: true, details: "Asset DemoUSDC matches whitelist" },
    { step: "RECIPIENT_ALLOWED", passed: false, details: "RECIPIENT NOT AUTHORIZED: Address is not in approved merchant list" },
    { step: "AMOUNT_LIMIT", passed: true, details: "$480.00 is <= $500.00 maxPerAction" },
    { step: "DAILY_LIMIT", passed: true, details: "Daily spent within $2,000 ceiling" },
  ];

  for (const c of checks1) {
    await prisma.executionCheck.create({
      data: {
        executionId: attack1.id,
        step: c.step,
        passed: c.passed,
        details: c.details,
      },
    });
  }

  // Attack 2: Over-limit attempt ($700 vs $500 max)
  const attack2 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 700.0,
      recipient: deployments.demoAccounts.supplier,
      status: "REVERTED",
      decision: "LIMIT_EXCEEDED",
      txHash: "0x7719fca9b01284fa981720bdfa89102489012849a90184209bcfa89102489099",
      blockNumber: 120495,
      gasUsed: 39500,
      capitalMoved: 0.0,
      capitalProtected: 700.0,
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });

  await prisma.violation.create({
    data: {
      executionId: attack2.id,
      type: "ACTION_LIMIT_EXCEEDED",
      expected: "$500.00 maximum per action",
      actual: "$700.00 requested by agent",
      severity: "HIGH",
    },
  });

  // Attack 3: Off-Hours attempt
  const attack3 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 350.0,
      recipient: deployments.demoAccounts.supplier,
      status: "REVERTED",
      decision: "EXPIRED",
      txHash: "0x6629fca9b01284fa981720bdfa89102489012849a90184209bcfa89102489033",
      blockNumber: 120498,
      gasUsed: 38200,
      capitalMoved: 0.0,
      capitalProtected: 350.0,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
  });

  await prisma.violation.create({
    data: {
      executionId: attack3.id,
      type: "TIME_WINDOW_VIOLATION",
      expected: "08:00 - 18:00 UTC",
      actual: "03:14 UTC (Unauthorized Off-Hours Execution Attempt)",
      severity: "HIGH",
    },
  });

  // 7. Contracts Registry for Contracts / Verification Page
  const contractList = [
    {
      name: "ScopePolicyRegistry",
      address: deployments.contracts.ScopePolicyRegistry,
      type: "POLICY_REGISTRY",
      chainId: deployments.chainId || 31337,
      abi: "IScopePolicyRegistry",
    },
    {
      name: "ScopeExecutor",
      address: deployments.contracts.ScopeExecutor,
      type: "EXECUTOR",
      chainId: deployments.chainId || 31337,
      abi: "IScopeExecutor",
    },
    {
      name: "MockUSDC",
      address: deployments.contracts.MockUSDC,
      type: "MOCK_USDC",
      chainId: deployments.chainId || 31337,
      abi: "IERC20",
    },
    {
      name: "SafeMerchant (Acme Components)",
      address: deployments.contracts.SafeMerchant,
      type: "SAFE_MERCHANT",
      chainId: deployments.chainId || 31337,
      abi: "SafeMerchant",
    },
    {
      name: "MaliciousMerchant (Phishing Clone)",
      address: deployments.contracts.MaliciousMerchant,
      type: "MALICIOUS_MERCHANT",
      chainId: deployments.chainId || 31337,
      abi: "MaliciousMerchant",
    },
  ];

  for (const c of contractList) {
    await prisma.contract.create({
      data: {
        workspaceId: workspace.id,
        name: c.name,
        address: c.address,
        type: c.type,
        chainId: c.chainId,
        abi: c.abi,
        verified: true,
      },
    });
  }

  // 8. API Key
  await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      name: "Atlas Production Key",
      prefix: "sk_live_scope_",
      keyHash: "0x8fa13498bcefa0918230948ac0198421bcaef019",
      maskedKey: "sk_live_scope_••••••••••••9f42",
      lastUsedAt: new Date(Date.now() - 8000),
    },
  });

  // 9. Activity Events
  const events = [
    {
      workspaceId: workspace.id,
      type: "ATTACK_REPELLED",
      title: "Compromised Recipient Blocked",
      description: "Atlas attempted to send $480.00 USDC to unauthorized wallet. SCOPE reverted the transaction atomically onchain ($0.00 moved).",
    },
    {
      workspaceId: workspace.id,
      type: "EXECUTION_APPROVED",
      title: "Legitimate Order Processed",
      description: "Atlas procurement order of $480.00 USDC to Acme Components satisfied all policy boundaries and was executed.",
    },
    {
      workspaceId: workspace.id,
      type: "POLICY_CREATED",
      title: "Policy Procurement V3 Authorized",
      description: "Owner authorized cryptographic EIP-712 execution boundaries: $500 max per action, $2,000 daily limit, Acme Components approved.",
    },
    {
      workspaceId: workspace.id,
      type: "AGENT_REGISTERED",
      title: "Atlas Procurement Agent Enrolled",
      description: "Autonomous agent wallet 0x7099...79C8 registered with Scoped Execution capability.",
    },
  ];

  for (const ev of events) {
    await prisma.activityEvent.create({ data: ev });
  }

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
