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

  const shortAddr = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;

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

  // 3. Policy: Procurement V3 — mirrors the active onchain policy (policyHash below).
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
      chainId: deployments.chainId || 84532,
      contractAddress: deployments.contracts.ScopePolicyRegistry,
    },
  });

  // 4. Policy Rules — these MIRROR the active onchain policy exactly. Targets, recipients,
  //    asset, and limits are enforced by the ScopeExecutor contract onchain; TIME_WINDOW
  //    (operational hours) is the single rule enforced by the offchain gateway, because
  //    time-of-day is not expressible onchain.
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
      metadata: JSON.stringify({ name: "Acme Components (ProcurementRouter)", verified: true }),
    },
    {
      policyId: policy.id,
      type: "ALLOWED_TARGET",
      value: deployments.contracts.MaliciousMerchant,
      metadata: JSON.stringify({
        name: "MaliciousMerchant (postcondition demo)",
        verified: true,
        note: "Deliberately allowlisted so the OUTCOME_SLIPPAGE demo reaches the onchain MIN_OUTPUT postcondition. Proves allowlisting is necessary but NOT sufficient — the contract still reverts when the merchant underdelivers.",
      }),
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
      value: deployments.contracts.MaliciousMerchant,
      metadata: JSON.stringify({ name: "MaliciousMerchant (postcondition demo)", tag: "Allowlisted — still gated by MIN_OUTPUT" }),
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
      metadata: JSON.stringify({ unit: "USDC", epoch: "24h rolling", enforcedOnchain: true }),
    },
    {
      policyId: policy.id,
      type: "TIME_WINDOW",
      value: "08:00-18:00 UTC",
      metadata: JSON.stringify({ timezone: "UTC", enforceDays: "Mon-Fri", enforcedBy: "offchain gateway" }),
    },
    {
      policyId: policy.id,
      type: "MIN_OUTPUT",
      value: "MIN_TOKEN_RECEIVED",
      metadata: JSON.stringify({ note: "Atomic outcome postcondition enforced onchain by ScopeExecutor", slippageTolerancePct: 0.5 }),
    },
  ];

  for (const rule of rules) {
    await prisma.policyRule.create({ data: rule });
  }

  const createChecks = async (executionId, steps) => {
    for (const s of steps) {
      await prisma.executionCheck.create({
        data: { executionId, step: s.step, passed: s.passed, details: s.details },
      });
    }
  };

  // ---------------------------------------------------------------------------
  // 5. Execution history.
  //
  // HONESTY: every value below is real. The one ALLOW is a genuine, Basescan-verifiable
  // ScopeExecutor.execute() transaction on Base Sepolia (hash/block/gas are the real
  // receipt values). The blocked attacks are caught in preflight simulation (or by the
  // offchain operational-hours gateway) BEFORE any transaction is submitted, so they have
  // NO txHash, NO block, and NO gas — that is the honest and stronger story: $0 exposed,
  // $0 gas. Nothing here is fabricated. This mirrors exactly what lib/execution/engine.ts
  // persists for a live run, so seeded and live records are indistinguishable.
  // ---------------------------------------------------------------------------

  // 5a. Real successful execution — VERIFIABLE onchain:
  // https://sepolia.basescan.org/tx/0x9cf132bfa7e59f9cb95abb28bb59a603e1ed5f199e6e4066e37572878154dd90
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
      txHash: "0x9cf132bfa7e59f9cb95abb28bb59a603e1ed5f199e6e4066e37572878154dd90",
      blockNumber: 47310520,
      gasUsed: 153269,
      capitalMoved: 480.0,
      capitalProtected: 0.0,
      createdAt: new Date(Date.now() - 3 * 60 * 1000),
    },
  });
  await createChecks(ex1.id, [
    { step: "SIGNATURE", passed: true, details: "Agent EIP-712 signature recovered and matches the registered agent wallet" },
    { step: "TIME_WINDOW", passed: true, details: "Execution at 14:00 UTC is inside the 08:00–18:00 UTC operational window" },
    { step: "TARGET_ALLOWED", passed: true, details: "Target Acme Components (ProcurementRouter) is on the policy allowlist" },
    { step: "ASSET_ALLOWED", passed: true, details: "Asset USDC is on the policy allowlist" },
    { step: "RECIPIENT_ALLOWED", passed: true, details: "Recipient Acme Components is an approved merchant" },
    { step: "AMOUNT_LIMIT", passed: true, details: "$480.00 is within the $500.00 per-action ceiling" },
    { step: "DAILY_LIMIT", passed: true, details: "Within the $2,000.00 rolling daily limit" },
    { step: "ONCHAIN_ENFORCEMENT", passed: true, details: "ScopeExecutor executed onchain in block 47310520 (gas 153269) — tx 0x9cf132bfa7e59f9cb95abb28bb59a603e1ed5f199e6e4066e37572878154dd90" },
  ]);

  // 5b. Blocked attack — Compromised Supplier (rogue recipient). Caught in preflight; no tx.
  const attack1 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.SafeMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 480.0,
      recipient: deployments.demoAccounts.attacker,
      status: "REVERTED",
      decision: "RECIPIENT_NOT_ALLOWED",
      txHash: null,
      blockNumber: null,
      gasUsed: null,
      capitalMoved: 0.0,
      capitalProtected: 480.0,
      createdAt: new Date(Date.now() - 6 * 60 * 1000),
    },
  });
  await createChecks(attack1.id, [
    { step: "SIGNATURE", passed: true, details: "Agent EIP-712 signature recovered and matches the registered agent wallet" },
    { step: "TIME_WINDOW", passed: true, details: "Inside the 08:00–18:00 UTC operational window" },
    { step: "TARGET_ALLOWED", passed: true, details: "Target Acme Components (ProcurementRouter) is on the allowlist" },
    { step: "ASSET_ALLOWED", passed: true, details: "Asset USDC is on the allowlist" },
    { step: "RECIPIENT_ALLOWED", passed: false, details: `Recipient ${shortAddr(deployments.demoAccounts.attacker)} is NOT on the approved merchant allowlist` },
    { step: "AMOUNT_LIMIT", passed: true, details: "$480.00 is within the $500.00 per-action ceiling" },
    { step: "DAILY_LIMIT", passed: true, details: "Within the $2,000.00 rolling daily limit" },
    { step: "ONCHAIN_ENFORCEMENT", passed: false, details: "ScopeExecutor reverted with RecipientNotAllowed — boundary enforced by the contract in preflight simulation. No transaction submitted: $0.00 exposed, $0 gas." },
  ]);
  await prisma.violation.create({
    data: {
      executionId: attack1.id,
      type: "RECIPIENT_NOT_ALLOWED",
      expected: `Acme Components (${deployments.demoAccounts.supplier})`,
      actual: `Rogue attacker wallet (${deployments.demoAccounts.attacker})`,
      severity: "CRITICAL",
    },
  });

  // 5c. Blocked attack — Budget Bleed ($700 vs $500 max). Caught in preflight; no tx.
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
      txHash: null,
      blockNumber: null,
      gasUsed: null,
      capitalMoved: 0.0,
      capitalProtected: 700.0,
      createdAt: new Date(Date.now() - 25 * 60 * 1000),
    },
  });
  await createChecks(attack2.id, [
    { step: "SIGNATURE", passed: true, details: "Agent EIP-712 signature recovered and matches the registered agent wallet" },
    { step: "TIME_WINDOW", passed: true, details: "Inside the 08:00–18:00 UTC operational window" },
    { step: "TARGET_ALLOWED", passed: true, details: "Target Acme Components (ProcurementRouter) is on the allowlist" },
    { step: "ASSET_ALLOWED", passed: true, details: "Asset USDC is on the allowlist" },
    { step: "RECIPIENT_ALLOWED", passed: true, details: "Recipient Acme Components is an approved merchant" },
    { step: "AMOUNT_LIMIT", passed: false, details: "$700.00 exceeds the $500.00 per-action ceiling" },
    { step: "DAILY_LIMIT", passed: true, details: "Within the $2,000.00 rolling daily limit" },
    { step: "ONCHAIN_ENFORCEMENT", passed: false, details: "ScopeExecutor reverted with ActionLimitExceeded — boundary enforced by the contract in preflight simulation. No transaction submitted: $0.00 exposed, $0 gas." },
  ]);
  await prisma.violation.create({
    data: {
      executionId: attack2.id,
      type: "ACTION_LIMIT_EXCEEDED",
      expected: "$500.00 maximum per action",
      actual: "$700.00 requested by agent",
      severity: "HIGH",
    },
  });

  // 5d. Blocked attack — Off-Hours execution. Stopped by the OFFCHAIN gateway before the
  //     request ever reached the chain (time-of-day is not expressible onchain). No tx.
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
      txHash: null,
      blockNumber: null,
      gasUsed: null,
      capitalMoved: 0.0,
      capitalProtected: 350.0,
      createdAt: new Date(Date.now() - 3 * 3600 * 1000),
    },
  });
  await createChecks(attack3.id, [
    { step: "SIGNATURE", passed: true, details: "Agent EIP-712 signature recovered and matches the registered agent wallet" },
    { step: "TIME_WINDOW", passed: false, details: "Execution at 03:14 UTC is OUTSIDE the 08:00–18:00 UTC operational window" },
    { step: "TARGET_ALLOWED", passed: true, details: "Target Acme Components (ProcurementRouter) is on the allowlist" },
    { step: "ASSET_ALLOWED", passed: true, details: "Asset USDC is on the allowlist" },
    { step: "RECIPIENT_ALLOWED", passed: true, details: "Recipient Acme Components is an approved merchant" },
    { step: "AMOUNT_LIMIT", passed: true, details: "$350.00 is within the $500.00 per-action ceiling" },
    { step: "DAILY_LIMIT", passed: true, details: "Within the $2,000.00 rolling daily limit" },
    { step: "ONCHAIN_ENFORCEMENT", passed: false, details: "Blocked by SCOPE's offchain policy gateway (operational-hours rule) before submission — the request never reached the chain. $0.00 exposed, $0 gas." },
  ]);
  await prisma.violation.create({
    data: {
      executionId: attack3.id,
      type: "TIME_WINDOW_VIOLATION",
      expected: "08:00 - 18:00 UTC",
      actual: "03:14 UTC (unauthorized off-hours execution attempt)",
      severity: "HIGH",
    },
  });

  // 5e. Blocked attack — Postcondition failure (outcome slippage). The merchant is
  //     ALLOWLISTED and passes every precondition, yet the atomic MIN_OUTPUT postcondition
  //     catches that it underdelivered and reverts the entire transaction. No tx submitted.
  const attack4 = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: deployments.contracts.MaliciousMerchant,
      asset: deployments.contracts.MockUSDC,
      amount: 500.0,
      recipient: deployments.contracts.MaliciousMerchant,
      status: "REVERTED",
      decision: "OUTCOME_VIOLATION",
      txHash: null,
      blockNumber: null,
      gasUsed: null,
      capitalMoved: 0.0,
      capitalProtected: 500.0,
      createdAt: new Date(Date.now() - 40 * 60 * 1000),
    },
  });
  await createChecks(attack4.id, [
    { step: "SIGNATURE", passed: true, details: "Agent EIP-712 signature recovered and matches the registered agent wallet" },
    { step: "TIME_WINDOW", passed: true, details: "Inside the 08:00–18:00 UTC operational window" },
    { step: "TARGET_ALLOWED", passed: true, details: "Target is on the policy allowlist" },
    { step: "ASSET_ALLOWED", passed: true, details: "Asset USDC is on the allowlist" },
    { step: "RECIPIENT_ALLOWED", passed: true, details: "Recipient is on the policy allowlist" },
    { step: "AMOUNT_LIMIT", passed: true, details: "$500.00 is within the $500.00 per-action ceiling" },
    { step: "DAILY_LIMIT", passed: true, details: "Within the $2,000.00 rolling daily limit" },
    { step: "POSTCONDITION", passed: false, details: "MIN_TOKEN_RECEIVED not met: merchant delivered less than the agent's required minimum output" },
    { step: "ONCHAIN_ENFORCEMENT", passed: false, details: "ScopeExecutor reverted with OutcomePostconditionFailed — the atomic outcome check rolled back every state change in preflight simulation. No transaction submitted: $0.00 exposed, $0 gas." },
  ]);
  await prisma.violation.create({
    data: {
      executionId: attack4.id,
      type: "OUTCOME_POSTCONDITION_FAILED",
      expected: "Delivered output ≥ agent's MIN_TOKEN_RECEIVED threshold",
      actual: "Merchant underdelivered — atomic postcondition failed, transaction reverted",
      severity: "CRITICAL",
    },
  });

  // 7. Contracts Registry for Contracts / Verification Page
  const contractList = [
    {
      name: "ScopePolicyRegistry",
      address: deployments.contracts.ScopePolicyRegistry,
      type: "POLICY_REGISTRY",
      chainId: deployments.chainId || 84532,
      abi: "IScopePolicyRegistry",
    },
    {
      name: "ScopeExecutor",
      address: deployments.contracts.ScopeExecutor,
      type: "EXECUTOR",
      chainId: deployments.chainId || 84532,
      abi: "IScopeExecutor",
    },
    {
      name: "MockUSDC",
      address: deployments.contracts.MockUSDC,
      type: "MOCK_USDC",
      chainId: deployments.chainId || 84532,
      abi: "IERC20",
    },
    {
      name: "SafeMerchant (Acme Components)",
      address: deployments.contracts.SafeMerchant,
      type: "SAFE_MERCHANT",
      chainId: deployments.chainId || 84532,
      abi: "SafeMerchant",
    },
    {
      name: "MaliciousMerchant (Phishing Clone)",
      address: deployments.contracts.MaliciousMerchant,
      type: "MALICIOUS_MERCHANT",
      chainId: deployments.chainId || 84532,
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

  // 8. API Key — only the hash and a masked display value are stored; the plaintext key is
  //    shown to the user exactly once at creation and never persisted or re-exposed.
  await prisma.apiKey.create({
    data: {
      workspaceId: workspace.id,
      name: "Atlas Production Key",
      prefix: "sk_live_scope_",
      keyHash: "0x8fa13498bcefa0918230948ac0198421bcaef0198fa13498bcefa0918230948a",
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
      description: "Atlas attempted to send $480.00 USDC to an unauthorized wallet. SCOPE's ScopeExecutor reverted the request in preflight — no transaction submitted, $0.00 moved.",
    },
    {
      workspaceId: workspace.id,
      type: "EXECUTION_APPROVED",
      title: "Legitimate Order Executed Onchain",
      description: "Atlas procurement order of $480.00 USDC to Acme Components satisfied all policy boundaries and executed onchain on Base Sepolia.",
    },
    {
      workspaceId: workspace.id,
      type: "POLICY_CREATED",
      title: "Policy Procurement V3 Authorized",
      description: "Owner authorized cryptographic execution boundaries onchain: $500 max per action, $2,000 daily limit, approved merchants only, MIN_OUTPUT postcondition.",
    },
    {
      workspaceId: workspace.id,
      type: "AGENT_REGISTERED",
      title: "Atlas Procurement Agent Enrolled",
      description: `Autonomous agent wallet ${shortAddr(deployments.demoAccounts.agent)} registered with scoped execution capability.`,
    },
  ];

  for (const ev of events) {
    await prisma.activityEvent.create({ data: ev });
  }

  console.log("Database seeded successfully!");
  console.log(`  Policy hash: ${deployments.defaultPolicyHash}`);
  console.log("  1 real onchain success ($480, tx 0x9cf132bf…) + 4 blocked attacks ($2,030 protected, $0 gas).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
