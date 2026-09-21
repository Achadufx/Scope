import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      include: {
        policies: {
          include: { rules: true },
        },
        executions: {
          take: 5,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ agents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, walletAddress } = body;

    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const agent = await prisma.agent.create({
      data: {
        workspaceId: workspace.id,
        name: name || "New Autonomous Agent",
        description: description || "Autonomous agent scoped by SCOPE policy firewall.",
        walletAddress: walletAddress || "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ agent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
