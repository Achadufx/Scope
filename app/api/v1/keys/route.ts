import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";

export async function GET() {
  try {
    const keys = await prisma.apiKey.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ keys });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, keyId, name } = body;

    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      return NextResponse.json({ error: "No workspace" }, { status: 400 });
    }

    if (action === "ROTATE") {
      const suffix = Math.random().toString(36).substring(2, 6);
      const newMasked = `sk_live_scope_••••••••••••${suffix}`;
      const newHash = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          maskedKey: newMasked,
          keyHash: newHash,
          lastUsedAt: new Date(),
        },
      });
      return NextResponse.json({ key: updated, rotated: true });
    }

    // Default create
    const suffix = Math.random().toString(36).substring(2, 6);
    const key = await prisma.apiKey.create({
      data: {
        workspaceId: workspace.id,
        name: name || "Autonomous Sub-Agent Key",
        prefix: "sk_live_scope_",
        keyHash: "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join(""),
        maskedKey: `sk_live_scope_••••••••••••${suffix}`,
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ key });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
