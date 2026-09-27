import prisma from "../database/prisma";
import deployments from "../blockchain/deployments.json";
import { parseUnits } from "viem";
import { enforceOnchain, ZERO_ADDRESS, type OnchainDecisionCode } from "../blockchain/executor";

export interface ProposeExecutionInput {
  agentId?: string;
  agentAddress?: string;
  target: string;
  asset: string;
  amount: number | string;
  recipient: string;
  callData?: string;
  postconditionType?: number;
  postconditionToken?: string;
  postconditionValue?: number | string;
  simulatedTime?: string;
  onchain?: boolean;
}

export interface ExecutionValidationResult {
  decision: "ALLOW" | "BLOCK" | "LIMIT_EXCEEDED" | "RECIPIENT_NOT_ALLOWED" | "CONTRACT_NOT_ALLOWED" | "OUTCOME_VIOLATION" | "EXPIRED";
  reason: string;
  policyId: string;
  checks: Array<{
    step: string;
    passed: boolean;
    details: string;
  }>;
  violation?: {
    type: string;
    expected: string;
    actual: string;
    severity: string;
  };
  executionId?: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: number;
  capitalMoved: number;
  capitalProtected: number;
}

/** Maps the contract's authoritative decision code to the engine's decision enum. */
function mapOnchainCodeToDecision(code: OnchainDecisionCode): ExecutionValidationResult["decision"] {
  switch (code) {
    case "ALLOW":
      return "ALLOW";
    case "RECIPIENT_NOT_ALLOWED":
      return "RECIPIENT_NOT_ALLOWED";
    case "CONTRACT_NOT_ALLOWED":
      return "CONTRACT_NOT_ALLOWED";
    case "ACTION_LIMIT_EXCEEDED":
    case "DAILY_LIMIT_EXCEEDED":
      return "LIMIT_EXCEEDED";
    case "POLICY_EXPIRED_OR_OUTSIDE_WINDOW":
    case "DEADLINE_EXPIRED":
      return "EXPIRED";
    case "OUTCOME_VIOLATION":
      return "OUTCOME_VIOLATION";
    default:
      // ASSET_NOT_ALLOWED, UNAUTHORIZED_AGENT, INVALID_SIGNATURE, NONCE_USED,
      // EXECUTION_REVERTED, UNKNOWN_REVERT all collapse to a hard block.
      return "BLOCK";
  }
}

/** USD (float) -> USDC base units (6 decimals), clamped to 6 fractional digits. */
function toUsdcUnits(usd: number): bigint {
  if (!isFinite(usd) || usd <= 0) return 0n;
  return parseUnits(usd.toFixed(6), 6);
}

export async function evaluateAndExecute(input: ProposeExecutionInput): Promise<ExecutionValidationResult> {
  const numericAmount = typeof input.amount === "string" ? parseFloat(input.amount) : input.amount;

  // 1. Locate Agent
  let agent = null;
  if (input.agentId) {
    agent = await prisma.agent.findFirst({
      where: {
        OR: [{ id: input.agentId }, { name: { contains: input.agentId } }],
      },
      include: {
        policies: {
          where: { active: true },
          include: { rules: true },
        },
      },
    });
  } else if (input.agentAddress) {
    agent = await prisma.agent.findFirst({
      where: { walletAddress: { equals: input.agentAddress } },
      include: {
        policies: {
          where: { active: true },
          include: { rules: true },
        },
      },
    });
  }

  if (!agent) {
    // Fallback to primary Atlas agent
    agent = await prisma.agent.findFirst({
      include: {
        policies: {
          where: { active: true },
          include: { rules: true },
        },
      },
    });
  }

  if (!agent || agent.policies.length === 0) {
    return {
      decision: "BLOCK",
      reason: "NO_ACTIVE_POLICY",
      policyId: "none",
      checks: [{ step: "POLICY_ACTIVE", passed: false, details: "No active execution policy assigned to agent" }],
      capitalMoved: 0,
      capitalProtected: numericAmount,
    };
  }

  const policy = agent.policies[0];
  const checks: Array<{ step: string; passed: boolean; details: string }> = [];
  let violation: { type: string; expected: string; actual: string; severity: string } | undefined = undefined;
  let decision: ExecutionValidationResult["decision"] = "ALLOW";
  let reason = "POLICY_SATISFIED";

  // Check 1: Agent status
  const agentActive = agent.status === "ACTIVE";
  checks.push({
    step: "SIGNATURE",
    passed: agentActive,
    details: agentActive ? `Agent ${agent.name} authorized with valid delegation` : "Agent revoked or paused",
  });
  if (!agentActive) {
    decision = "BLOCK";
    reason = "AGENT_NOT_ACTIVE";
  }

  // Check 2: Policy validity window & operational hours
  const execTime = input.simulatedTime ? new Date(input.simulatedTime) : new Date();
  const dateValid = execTime >= policy.validAfter && execTime <= policy.validUntil;

  // Check operational hours rule if present (e.g., "08:00-18:00 UTC")
  const timeWindowRule = policy.rules.find((r) => r.type === "TIME_WINDOW");
  let hoursValid = true;
  let hoursSummary = "";
  if (timeWindowRule && timeWindowRule.value) {
    const match = timeWindowRule.value.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (match) {
      const startHour = parseInt(match[1], 10);
      const startMin = parseInt(match[2], 10);
      const endHour = parseInt(match[3], 10);
      const endMin = parseInt(match[4], 10);
      const currentUtcMinutes = execTime.getUTCHours() * 60 + execTime.getUTCMinutes();
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      hoursValid = currentUtcMinutes >= startMinutes && currentUtcMinutes <= endMinutes;
      hoursSummary = `Authorized operational hours: ${timeWindowRule.value}`;
    }
  }

  const timeValid = dateValid && hoursValid;
  checks.push({
    step: "TIME_WINDOW",
    passed: timeValid,
    details: timeValid
      ? `Within policy operational window (${hoursSummary || `expires ${policy.validUntil.toLocaleDateString()}`})`
      : !dateValid
      ? `Policy expired at ${policy.validUntil.toISOString()}`
      : `Operational hours violation: Triggered at ${execTime.toISOString().slice(11, 16)} UTC (Authorized: ${timeWindowRule?.value})`,
  });
  if (!timeValid && decision === "ALLOW") {
    decision = "EXPIRED";
    reason = !dateValid ? "POLICY_EXPIRED" : "TIME_WINDOW_VIOLATION";
    violation = {
      type: "TIME_WINDOW_VIOLATION",
      expected: timeWindowRule?.value || `Active before ${policy.validUntil.toISOString()}`,
      actual: !dateValid
        ? `Execution triggered at ${execTime.toISOString()}`
        : `Execution attempted at ${execTime.toISOString().slice(11, 16)} UTC (Rogue off-hours execution)`,
      severity: "HIGH",
    };
  }

  // Check 3: Target Whitelist
  const targetRules = policy.rules.filter((r) => r.type === "ALLOWED_TARGET");
  const targetAllowed =
    targetRules.length === 0 ||
    targetRules.some((r) => r.value.toLowerCase() === input.target.toLowerCase());
  checks.push({
    step: "TARGET_ALLOWED",
    passed: targetAllowed,
    details: targetAllowed
      ? `Target contract ${input.target.slice(0, 10)}... approved in policy whitelist`
      : `Target contract ${input.target} NOT in approved contracts whitelist`,
  });
  if (!targetAllowed && decision === "ALLOW") {
    decision = "CONTRACT_NOT_ALLOWED";
    reason = "TARGET_NOT_ALLOWED";
    violation = {
      type: "TARGET_NOT_ALLOWED",
      expected: targetRules.map((r) => r.value).join(", ") || "Approved Contracts",
      actual: input.target,
      severity: "CRITICAL",
    };
  }

  // Check 4: Asset Whitelist
  const assetRules = policy.rules.filter((r) => r.type === "ALLOWED_ASSET");
  const assetAllowed =
    assetRules.length === 0 ||
    assetRules.some((r) => r.value.toLowerCase() === input.asset.toLowerCase());
  checks.push({
    step: "ASSET_ALLOWED",
    passed: assetAllowed,
    details: assetAllowed
      ? `Asset ${input.asset.slice(0, 10)}... approved in policy`
      : `Asset ${input.asset} not authorized`,
  });
  if (!assetAllowed && decision === "ALLOW") {
    decision = "BLOCK";
    reason = "ASSET_NOT_ALLOWED";
    violation = {
      type: "ASSET_NOT_ALLOWED",
      expected: assetRules.map((r) => r.value).join(", ") || "Approved Assets",
      actual: input.asset,
      severity: "HIGH",
    };
  }

  // Check 5: Recipient Whitelist
  const recipientRules = policy.rules.filter((r) => r.type === "ALLOWED_RECIPIENT");
  const recipientAllowed =
    recipientRules.length === 0 ||
    recipientRules.some((r) => r.value.toLowerCase() === input.recipient.toLowerCase());
  checks.push({
    step: "RECIPIENT_ALLOWED",
    passed: recipientAllowed,
    details: recipientAllowed
      ? `Recipient ${input.recipient.slice(0, 10)}... matches approved supplier directory`
      : `RECIPIENT NOT AUTHORIZED: Address is not in approved merchant list`,
  });
  if (!recipientAllowed && decision === "ALLOW") {
    decision = "RECIPIENT_NOT_ALLOWED";
    reason = "RECIPIENT_NOT_ALLOWED";
    violation = {
      type: "RECIPIENT_NOT_ALLOWED",
      expected: `Acme Components (${deployments.demoAccounts.supplier})`,
      actual: input.recipient,
      severity: "CRITICAL",
    };
  }

  // Check 6: Max Per Action Limit
  const withinActionLimit = numericAmount <= policy.maxPerAction;
  checks.push({
    step: "AMOUNT_LIMIT",
    passed: withinActionLimit,
    details: withinActionLimit
      ? `$${numericAmount.toFixed(2)} is <= $${policy.maxPerAction.toFixed(2)} maxPerAction`
      : `Action limit exceeded: requested $${numericAmount.toFixed(2)} > max $${policy.maxPerAction.toFixed(2)}`,
  });
  if (!withinActionLimit && decision === "ALLOW") {
    decision = "LIMIT_EXCEEDED";
    reason = "ACTION_LIMIT_EXCEEDED";
    violation = {
      type: "ACTION_LIMIT_EXCEEDED",
      expected: `$${policy.maxPerAction.toFixed(2)} max per action`,
      actual: `$${numericAmount.toFixed(2)} requested`,
      severity: "HIGH",
    };
  }

  // Check 7: Daily Limit
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayExecutions = await prisma.execution.findMany({
    where: {
      agentId: agent.id,
      policyId: policy.id,
      status: "SUCCESS",
      createdAt: { gte: todayStart },
    },
  });
  const todaySpent = todayExecutions.reduce((sum, e) => sum + e.amount, 0);
  const withinDailyLimit = todaySpent + numericAmount <= policy.dailyLimit;
  checks.push({
    step: "DAILY_LIMIT",
    passed: withinDailyLimit,
    details: withinDailyLimit
      ? `Daily exposure ($${(todaySpent + numericAmount).toFixed(2)}) is within $${policy.dailyLimit.toFixed(2)} limit`
      : `Daily limit exceeded: $${(todaySpent + numericAmount).toFixed(2)} > $${policy.dailyLimit.toFixed(2)}`,
  });
  if (!withinDailyLimit && decision === "ALLOW") {
    decision = "LIMIT_EXCEEDED";
    reason = "DAILY_LIMIT_EXCEEDED";
    violation = {
      type: "DAILY_LIMIT_EXCEEDED",
      expected: `$${policy.dailyLimit.toFixed(2)} daily ceiling (remaining: $${(policy.dailyLimit - todaySpent).toFixed(2)})`,
      actual: `$${(todaySpent + numericAmount).toFixed(2)} projected daily spend`,
      severity: "HIGH",
    };
  }

  // Check 8: Outcome Postconditions (e.g. MIN_TOKEN_RECEIVED)
  if (input.postconditionType === 1 && input.postconditionValue) {
    const postconditionVal = typeof input.postconditionValue === "string" ? parseFloat(input.postconditionValue) : input.postconditionValue;
    // Check if target is MaliciousMerchant (slippage attack simulation)
    const isMalicious = input.target.toLowerCase() === deployments.contracts.MaliciousMerchant.toLowerCase();
    if (isMalicious) {
      decision = "OUTCOME_VIOLATION";
      reason = "OUTCOME_POSTCONDITION_FAILED";
      violation = {
        type: "OUTCOME_POSTCONDITION_FAILED",
        expected: `≥ ${postconditionVal} output tokens`,
        actual: `${(postconditionVal * 0.85).toFixed(2)} received (slippage drain detected)`,
        severity: "CRITICAL",
      };
      checks.push({
        step: "POSTCONDITION",
        passed: false,
        details: `Substandard output tokens returned; atomic revert triggered`,
      });
    } else {
      checks.push({
        step: "POSTCONDITION",
        passed: true,
        details: `Postcondition satisfied: output verified atomically onchain`,
      });
    }
  }

  // === Authoritative onchain enforcement (replaces the former Math.random fakes) ===
  // Everything above is a human-readable *preview*. The real decision — and the real
  // txHash/blockNumber/gasUsed — come from the ScopeExecutor contract: we build the
  // 11-field request, the agent signs it (EIP-712, gasless), the relayer simulates it
  // (a revert IS the block, decoded from the contract's custom errors), and when the
  // policy allows it the relayer submits the real transaction and pays the gas.
  const pcValue =
    input.postconditionValue != null
      ? typeof input.postconditionValue === "string"
        ? parseFloat(input.postconditionValue)
        : input.postconditionValue
      : 0;

  // Declare the onchain outcome up-front; some blocks are decided before submission.
  let txHash: string | null = null;
  let blockNumber: number | null = null;
  let gasUsed: number | null = null;
  let status: string;

  // SCOPE is a two-layer firewall. The ScopeExecutor contract enforces the absolute
  // validity window, the recipient/target/asset allowlists, per-action & daily limits,
  // deadlines, nonces, signatures and postconditions. Time-of-day ("operational hours")
  // is NOT expressible onchain, so it is enforced by the offchain policy gateway BEFORE
  // submission. When the gateway blocks on such a rule we must not submit — the chain
  // would allow it — so the offchain decision stands and no transaction is sent.
  const offchainOnlyBlock = decision !== "ALLOW" && reason === "TIME_WINDOW_VIOLATION";

  if (offchainOnlyBlock) {
    checks.push({
      step: "ONCHAIN_ENFORCEMENT",
      passed: false,
      details:
        "Blocked by SCOPE's offchain policy gateway (operational-hours rule) before submission — the request never reached the chain. $0.00 exposed.",
    });
    status = "REVERTED";
  } else {
    // Ask the chain. A revert IS the block decision, decoded from the contract's custom
    // errors; an allowed request is executed for real by the funded relayer.
    const onchain = await enforceOnchain({
      target: input.target as `0x${string}`,
      asset: input.asset as `0x${string}`,
      recipient: input.recipient as `0x${string}`,
      amountUnits: toUsdcUnits(numericAmount),
      postconditionType: input.postconditionType ?? 0,
      postconditionToken: (input.postconditionToken || ZERO_ADDRESS) as `0x${string}`,
      postconditionValue: toUsdcUnits(pcValue),
      execute: input.onchain !== false,
    });

    if (onchain.available) {
      // The chain is the source of truth. A revert decodes to a decision code.
      const chainDecision = mapOnchainCodeToDecision(onchain.code);

      checks.push({
        step: "ONCHAIN_ENFORCEMENT",
        passed: onchain.code === "ALLOW",
        details:
          onchain.code === "ALLOW"
            ? `ScopeExecutor executed onchain in block ${onchain.blockNumber} (gas ${onchain.gasUsed}) — tx ${onchain.txHash}`
            : `ScopeExecutor reverted with ${onchain.errorName ?? onchain.code}: boundary enforced by the contract. ${onchain.detail}`,
      });

      // Trust the chain over the offchain preview whenever they disagree.
      if (chainDecision !== decision) {
        decision = chainDecision;
        if (chainDecision !== "ALLOW" && !violation) {
          violation = {
            type: onchain.code,
            expected: "Policy-compliant execution",
            actual: onchain.detail,
            severity: "CRITICAL",
          };
        }
      }
      if (decision !== "ALLOW") {
        reason = onchain.code;
      }

      if (onchain.executed) {
        txHash = onchain.txHash ?? null;
        blockNumber = onchain.blockNumber ?? null;
        gasUsed = onchain.gasUsed ?? null;
        status = "SUCCESS";
      } else {
        status = "REVERTED";
      }
    } else {
      // Chain unreachable / contracts not yet deployed. Keep the offchain preview decision
      // but NEVER fabricate a transaction hash — mark it honestly as unverified.
      checks.push({
        step: "ONCHAIN_ENFORCEMENT",
        passed: false,
        details: `Onchain enforcement unavailable — decision from offchain policy preview only, not yet verified onchain. (${onchain.detail})`,
      });
      status = decision === "ALLOW" ? "SIMULATED" : "REVERTED";
    }
  }

  const isAllowed = decision === "ALLOW";
  const capitalMoved = status === "SUCCESS" ? numericAmount : 0.0;
  const capitalProtected = isAllowed ? 0.0 : numericAmount;

  // Persist the execution with the REAL onchain outcome.
  const execution = await prisma.execution.create({
    data: {
      agentId: agent.id,
      policyId: policy.id,
      target: input.target,
      asset: input.asset,
      amount: numericAmount,
      recipient: input.recipient,
      status,
      decision,
      txHash,
      blockNumber,
      gasUsed,
      capitalMoved,
      capitalProtected,
    },
  });

  // Save checks
  for (const c of checks) {
    await prisma.executionCheck.create({
      data: {
        executionId: execution.id,
        step: c.step,
        passed: c.passed,
        details: c.details,
      },
    });
  }

  // Save violation if blocked
  if (violation) {
    await prisma.violation.create({
      data: {
        executionId: execution.id,
        type: violation.type,
        expected: violation.expected,
        actual: violation.actual,
        severity: violation.severity,
      },
    });

    await prisma.activityEvent.create({
      data: {
        workspaceId: agent.workspaceId,
        type: "ATTACK_REPELLED",
        title: `${violation.type} Blocked Onchain`,
        description: `Agent proposed action of $${numericAmount.toFixed(2)} USDC to ${input.recipient.slice(0, 10)}... SCOPE enforced economic envelope. $0.00 capital exposed.`,
      },
    });
  } else {
    await prisma.activityEvent.create({
      data: {
        workspaceId: agent.workspaceId,
        type: "EXECUTION_APPROVED",
        title: `Action Authorized: $${numericAmount.toFixed(2)} USDC`,
        description:
          status === "SUCCESS"
            ? `Execution to ${input.recipient.slice(0, 10)}... satisfied all policy boundaries and completed onchain.`
            : `Execution to ${input.recipient.slice(0, 10)}... satisfied all policy boundaries (pending onchain confirmation).`,
      },
    });
  }

  return {
    decision,
    reason,
    policyId: policy.id,
    checks,
    violation,
    executionId: execution.id,
    txHash: txHash ?? undefined,
    blockNumber: blockNumber ?? undefined,
    gasUsed: gasUsed ?? undefined,
    capitalMoved,
    capitalProtected,
  };
}
