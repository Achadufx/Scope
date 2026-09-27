import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import { randomBytes, createHash } from "crypto";

/**
 * Issue a real API secret. The plaintext is returned to the caller EXACTLY ONCE and is
 * never persisted — we store only its SHA-256 hash (for later verification) plus a masked
 * label (for display). This honors SCOPE's secret-handling rule: one-time plaintext,
 * store the hash, never re-expose. No random value is ever passed off as a "hash".
 */
function issueSecret() {
  const secret = randomBytes(24).toString("hex"); // 48-char high-entropy secret body
  const plaintext = `sk_live_scope_${secret}`;
  const keyHash = "sha256:" + createHash("sha256").update(plaintext).digest("hex");
  const maskedKey = `sk_live_scope_••••••••••••${secret.slice(-4)}`;
  return { plaintext, keyHash, maskedKey };
}

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
      if (!keyId) {
        return NextResponse.json({ error: "keyId required to rotate" }, { status: 400 });
      }
      const { plaintext, keyHash, maskedKey } = issueSecret();
      const updated = await prisma.apiKey.update({
        where: { id: keyId },
        data: {
          maskedKey,
          keyHash,
          lastUsedAt: null, // freshly rotated: the new secret has never been used yet
        },
      });
      // Return the new plaintext ONCE — it is not stored and cannot be recovered later.
      return NextResponse.json({
        key: updated,
        rotated: true,
        plaintextKey: plaintext,
        warning: "Copy this key now — it is shown once and cannot be retrieved again.",
      });
    }

    // Default: create a new key
    const { plaintext, keyHash, maskedKey } = issueSecret();
    const key = await prisma.apiKey.create({
      data: {
        workspaceId: workspace.id,
        name: name || "Autonomous Sub-Agent Key",
        prefix: "sk_live_scope_",
        keyHash,
        maskedKey,
        lastUsedAt: null, // newly issued: never used yet
      },
    });

    return NextResponse.json({
      key,
      plaintextKey: plaintext,
      warning: "Copy this key now — it is shown once and cannot be retrieved again.",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
