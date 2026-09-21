import { NextRequest, NextResponse } from "next/server";
import { evaluateAndExecute, ProposeExecutionInput } from "@/lib/execution/engine";
import { z } from "zod";

const ProposeSchema = z.object({
  agentId: z.string().optional(),
  agentAddress: z.string().optional(),
  target: z.string().min(1, "Target address is required"),
  asset: z.string().min(1, "Asset address is required"),
  amount: z.union([z.string(), z.number()]),
  recipient: z.string().min(1, "Recipient address is required"),
  callData: z.string().optional(),
  postconditionType: z.number().optional(),
  postconditionToken: z.string().optional(),
  postconditionValue: z.union([z.string(), z.number()]).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ProposeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid execution request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const result = await evaluateAndExecute(parsed.data as ProposeExecutionInput);

    return NextResponse.json({
      decision: result.decision,
      reason: result.reason,
      policyId: result.policyId,
      executionId: result.executionId,
      txHash: result.txHash,
      capitalMoved: result.capitalMoved,
      capitalProtected: result.capitalProtected,
      checks: result.checks,
      violation: result.violation,
    });
  } catch (error: any) {
    console.error("Execution proposal error:", error);
    return NextResponse.json(
      { error: "Internal execution processing error", message: error.message },
      { status: 500 }
    );
  }
}
