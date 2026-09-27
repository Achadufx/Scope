import { NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      activeAgentsCount,
      policiesCount,
      todayExecutions,
      blockedExecutions,
      recentExecutions,
      recentEvents,
      primaryAgent,
    ] = await Promise.all([
      prisma.agent.count({ where: { status: "ACTIVE" } }),
      prisma.policy.count({ where: { active: true } }),
      prisma.execution.findMany({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.execution.findMany({
        where: { decision: { not: "ALLOW" } },
      }),
      prisma.execution.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          agent: true,
          violations: true,
        },
      }),
      prisma.activityEvent.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
      prisma.agent.findFirst({
        where: { name: { contains: "Atlas" } },
        include: {
          policies: {
            where: { active: true },
            include: { rules: true },
          },
        },
      }),
    ]);

    const actionsTodayCount = todayExecutions.length;
    const blockedCount = blockedExecutions.length;

    // Calculate today's exposure for primary agent (Atlas)
    const atlasTodayExecutions = todayExecutions.filter(
      (e) => e.agentId === primaryAgent?.id && e.status === "SUCCESS"
    );
    const todayExposure = atlasTodayExecutions.reduce((sum, e) => sum + e.capitalMoved, 0);

    // Total capital protected
    const capitalProtected = blockedExecutions.reduce((sum, e) => sum + e.capitalProtected, 0);

    const lastAtlasExecution = await prisma.execution.findFirst({
      where: { agentId: primaryAgent?.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      metrics: {
        activeAgents: activeAgentsCount,
        policies: policiesCount,
        actionsToday: actionsTodayCount,
        blocked: blockedCount,
        capitalProtected,
      },
      atlas: {
        id: primaryAgent?.id,
        name: primaryAgent?.name || "Atlas Procurement Agent",
        status: primaryAgent?.status || "ACTIVE",
        authority: "Scoped",
        walletAddress: primaryAgent?.walletAddress,
        todayExposure, // real sum of today's SUCCESS capitalMoved (0 if none) — never fabricated
        dailyLimit: primaryAgent?.policies[0]?.dailyLimit ?? 2000.0,
        maxPerAction: primaryAgent?.policies[0]?.maxPerAction ?? 500.0,
        policyName: primaryAgent?.policies[0]?.name || "Procurement V3",
        policyId: primaryAgent?.policies[0]?.id,
        lastActionAt: lastAtlasExecution?.createdAt ?? null,
      },
      recentExecutions,
      recentEvents,
    });
  } catch (error: any) {
    console.error("Stats API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
