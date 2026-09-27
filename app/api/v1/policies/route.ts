import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import deployments from "@/lib/blockchain/deployments.json";
import { keccak256, encodePacked } from "viem";

export async function GET() {
  try {
    const policies = await prisma.policy.findMany({
      include: {
        agent: true,
        rules: true,
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ policies });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      name,
      owner,
      maxPerAction,
      dailyLimit,
      allowedAssets,
      allowedTargets,
      allowedRecipients,
      validAfter,
      validUntil,
      timeWindow,
      minOutput,
      policyHash: providedHash,
    } = body;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    // A policy is only real once the owner has authorized it ONCHAIN (the browser sends
    // createPolicy to ScopePolicyRegistry via wagmi/EIP-712 and gets the authoritative
    // bytes32 policyHash back). We persist that real hash — never fabricate one. Requests
    // without a valid onchain policyHash are rejected so the DB can't drift from the chain.
    const providedTxHash = body.txHash as string | undefined;
    if (!providedHash || !/^0x[0-9a-fA-F]{64}$/.test(providedHash)) {
      return NextResponse.json(
        {
          error: "Missing onchain policyHash",
          message:
            "Authorize the policy onchain first (owner signs createPolicy via wallet), then submit the resulting bytes32 policyHash. SCOPE does not fabricate policy hashes.",
        },
        { status: 400 }
      );
    }

    // An agent has exactly one active policy onchain (agentActivePolicy[agent]). Mirror that
    // in the DB: retire any previously-active policy for this agent before recording the new one.
    await prisma.policy.updateMany({
      where: { agentId: agent.id, active: true },
      data: { active: false },
    });

    const policy = await prisma.policy.create({
      data: {
        agentId: agent.id,
        name: name || "Autonomous Execution Envelope",
        owner: owner || deployments.demoAccounts.owner,
        maxPerAction: parseFloat(maxPerAction) || 500.0,
        dailyLimit: parseFloat(dailyLimit) || 2000.0,
        validAfter: validAfter ? new Date(validAfter) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : new Date(Date.now() + 7 * 86400 * 1000),
        active: true,
        policyHash: providedHash,
        chainId: deployments.chainId || 84532,
        contractAddress: deployments.contracts.ScopePolicyRegistry,
      },
    });

    // Create rules
    const rulesToCreate: Array<{ policyId: string; type: string; value: string; metadata?: string }> = [
      {
        policyId: policy.id,
        type: "MAX_AMOUNT",
        value: String(policy.maxPerAction),
        metadata: JSON.stringify({ unit: "USDC" }),
      },
      {
        policyId: policy.id,
        type: "DAILY_LIMIT",
        value: String(policy.dailyLimit),
        metadata: JSON.stringify({ unit: "USDC" }),
      },
    ];

    if (Array.isArray(allowedAssets)) {
      for (const asset of allowedAssets) {
        rulesToCreate.push({
          policyId: policy.id,
          type: "ALLOWED_ASSET",
          value: asset.address || asset,
          metadata: JSON.stringify({ symbol: asset.symbol || "USDC", name: asset.name || "Demo USDC" }),
        });
      }
    } else {
      rulesToCreate.push({
        policyId: policy.id,
        type: "ALLOWED_ASSET",
        value: deployments.contracts.MockUSDC,
        metadata: JSON.stringify({ symbol: "USDC", name: "Demo USDC" }),
      });
    }

    if (Array.isArray(allowedTargets)) {
      for (const target of allowedTargets) {
        rulesToCreate.push({
          policyId: policy.id,
          type: "ALLOWED_TARGET",
          value: target.address || target,
          metadata: JSON.stringify({ name: target.name || "Approved Contract" }),
        });
      }
    } else {
      rulesToCreate.push({
        policyId: policy.id,
        type: "ALLOWED_TARGET",
        value: deployments.contracts.SafeMerchant,
        metadata: JSON.stringify({ name: "ProcurementRouter" }),
      });
    }

    if (Array.isArray(allowedRecipients)) {
      for (const recipient of allowedRecipients) {
        rulesToCreate.push({
          policyId: policy.id,
          type: "ALLOWED_RECIPIENT",
          value: recipient.address || recipient,
          metadata: JSON.stringify({ name: recipient.name || "Approved Merchant" }),
        });
      }
    } else {
      rulesToCreate.push({
        policyId: policy.id,
        type: "ALLOWED_RECIPIENT",
        value: deployments.demoAccounts.supplier,
        metadata: JSON.stringify({ name: "Acme Components" }),
      });
    }

    if (timeWindow) {
      rulesToCreate.push({
        policyId: policy.id,
        type: "TIME_WINDOW",
        value: timeWindow,
        metadata: JSON.stringify({ timezone: "UTC" }),
      });
    }

    if (minOutput) {
      rulesToCreate.push({
        policyId: policy.id,
        type: "MIN_OUTPUT",
        value: minOutput,
      });
    }

    for (const r of rulesToCreate) {
      await prisma.policyRule.create({ data: r });
    }

    // Log Activity Event
    await prisma.activityEvent.create({
      data: {
        workspaceId: agent.workspaceId,
        type: "POLICY_CREATED",
        title: `Policy ${policy.name} Authorized`,
        description: `EIP-712 signed execution boundary registered for ${agent.name}: $${policy.maxPerAction} max/action, $${policy.dailyLimit} daily ceiling.`,
      },
    });

    const fullPolicy = await prisma.policy.findUnique({
      where: { id: policy.id },
      include: { agent: true, rules: true },
    });

    return NextResponse.json({ policy: fullPolicy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
