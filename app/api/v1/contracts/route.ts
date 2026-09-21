import { NextResponse } from "next/server";
import prisma from "@/lib/database/prisma";
import deployments from "@/lib/blockchain/deployments.json";

export async function GET() {
  try {
    const contracts = await prisma.contract.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      contracts,
      deployments,
      network: {
        chainId: deployments.chainId || 31337,
        name: deployments.chainId === 31337 ? "SCOPE Local Devnet / In-Process" : "Public EVM Testnet",
        rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
