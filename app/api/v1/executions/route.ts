import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get("agentId");
    const decision = searchParams.get("decision");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (agentId) where.agentId = agentId;
    if (decision && decision !== "ALL") where.decision = decision;

    const executions = await prisma.execution.findMany({
      where,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        agent: true,
        policy: true,
        violations: true,
        checks: true,
      },
    });

    return NextResponse.json({ executions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
