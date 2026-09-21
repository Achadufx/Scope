import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id },
      include: {
        workspace: true,
        policies: {
          include: { rules: true },
        },
        executions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            violations: true,
            checks: true,
          },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const todaySuccess = agent.executions.filter(
      (e) => e.status === "SUCCESS" && new Date(e.createdAt) >= todayStart
    );
    const todayExposure = todaySuccess.reduce((sum, e) => sum + e.capitalMoved, 0);
    const blockedCount = agent.executions.filter((e) => e.decision !== "ALLOW").length;
    const capitalProtected = agent.executions.reduce((sum, e) => sum + e.capitalProtected, 0);

    return NextResponse.json({
      agent,
      metrics: {
        todayExposure,
        blockedCount,
        capitalProtected,
        totalExecutions: agent.executions.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
