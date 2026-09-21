import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const execution = await prisma.execution.findUnique({
      where: { id: params.id },
      include: {
        agent: true,
        policy: {
          include: { rules: true },
        },
        violations: true,
        checks: true,
      },
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution record not found" }, { status: 404 });
    }

    return NextResponse.json({ execution });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
