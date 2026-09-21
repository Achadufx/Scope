import { NextRequest, NextResponse } from "next/server";
import { evaluateAndExecute } from "@/lib/execution/engine";
import deployments from "@/lib/blockchain/deployments.json";
import prisma from "@/lib/database/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { presetId, customAmount, customRecipient, customTarget } = body;

    let target = deployments.contracts.SafeMerchant;
    let recipient = deployments.demoAccounts.supplier;
    let asset = deployments.contracts.MockUSDC;
    let amount = 480.0;
    let attackName = "Normal Purchase";
    let attackDescription = "Legitimate procurement order to Acme Components via approved ProcurementRouter.";
    let postconditionType = 0;
    let postconditionToken = "0x0000000000000000000000000000000000000000";
    let postconditionValue = 0;

    switch (presetId) {
      case "COMPROMISED_SUPPLIER":
        attackName = "Compromised Supplier (Rogue Recipient)";
        attackDescription = "Autonomous agent prompt/tool compromised: redirects $480.00 USDC payment to attacker wallet.";
        recipient = deployments.demoAccounts.attacker;
        target = deployments.contracts.SafeMerchant;
        amount = 480.0;
        break;

      case "BUDGET_BLEED":
        attackName = "Budget Bleed ($700 vs $500 Max)";
        attackDescription = "Agent issues purchase order exceeding the $500 per-action ceiling.";
        recipient = deployments.demoAccounts.supplier;
        target = deployments.contracts.SafeMerchant;
        amount = 700.0;
        break;

      case "OFF_HOURS":
        attackName = "Off-Hours Execution Attempt";
        attackDescription = "Agent attempts execution outside the 08:00 - 18:00 UTC operational window.";
        recipient = deployments.demoAccounts.supplier;
        target = deployments.contracts.SafeMerchant;
        amount = 350.0;
        break;

      case "OUTCOME_SLIPPAGE":
        attackName = "Postcondition Failure (Slippage Drain)";
        attackDescription = "Spend $500 USDC with outcome guarantee ≥ 0.20 ETH. Rogue merchant returns only 0.17 ETH.";
        recipient = deployments.contracts.MaliciousMerchant;
        target = deployments.contracts.MaliciousMerchant;
        amount = 500.0;
        postconditionType = 1; // MIN_TOKEN_RECEIVED
        postconditionToken = deployments.contracts.MockUSDC;
        postconditionValue = 200;
        break;

      case "NORMAL_PURCHASE":
      default:
        attackName = "Legitimate Procurement Order";
        attackDescription = "Atlas executes approved hardware procurement from Acme Components ($480 USDC).";
        recipient = deployments.demoAccounts.supplier;
        target = deployments.contracts.SafeMerchant;
        amount = 480.0;
        break;
    }

    if (customAmount) amount = parseFloat(customAmount);
    if (customRecipient) recipient = customRecipient;
    if (customTarget) target = customTarget;

    // Run through SCOPE firewall engine
    const evaluation = await evaluateAndExecute({
      target,
      asset,
      amount,
      recipient,
      postconditionType,
      postconditionToken,
      postconditionValue,
    });

    // Simulated "WITHOUT SCOPE" execution comparison
    const withoutScope = {
      status: "EXECUTED",
      verdict: "DANGER_EXPOSED",
      capitalExposed: amount,
      description: `Without SCOPE, the raw transaction dispatches unrestricted. Funds of $${amount.toFixed(2)} move immediately to the destination with zero economic boundary checks.`,
      recipient,
      target,
    };

    // "WITH SCOPE" execution
    const withScope = {
      decision: evaluation.decision,
      status: evaluation.decision === "ALLOW" ? "EXECUTED" : "REVERTED",
      capitalExposed: 0.0,
      capitalMoved: evaluation.capitalMoved,
      capitalProtected: evaluation.capitalProtected,
      reason: evaluation.reason,
      checks: evaluation.checks,
      violation: evaluation.violation,
      txHash: evaluation.txHash,
      blockNumber: evaluation.blockNumber,
      gasUsed: evaluation.gasUsed,
      executionId: evaluation.executionId,
      description:
        evaluation.decision === "ALLOW"
          ? `SCOPE verified all 8 economic boundaries. Transaction executed successfully onchain.`
          : `SCOPE identified ${evaluation.reason}. Smart contract reverted the transaction onchain atomically. $0.00 capital exposed.`,
    };

    // Calculate updated Attack Lab Scoreboard stats
    const allAttacks = await prisma.execution.findMany({
      where: { decision: { not: "ALLOW" } },
    });
    const totalViolations = allAttacks.length;
    const totalBlocked = allAttacks.length;
    const totalCapitalSaved = allAttacks.reduce((sum, a) => sum + a.capitalProtected, 0);

    const scoreboard = {
      attacksTested: totalBlocked,
      policyViolations: totalViolations,
      transactionsBlocked: totalBlocked,
      capitalExposed: 0,
      capitalProtected: totalCapitalSaved,
    };

    return NextResponse.json({
      presetId,
      attackName,
      attackDescription,
      withoutScope,
      withScope,
      scoreboard,
    });
  } catch (error: any) {
    console.error("Attack Lab execution error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
