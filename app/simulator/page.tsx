"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Terminal,
  Cpu,
  Layers,
} from "lucide-react";
import deployments from "@/lib/blockchain/deployments.json";

interface CheckStep {
  step: string;
  passed: boolean;
  details: string;
}

interface SimulationResult {
  decision: string;
  reason: string;
  capitalMoved: number;
  capitalProtected: number;
  checks: CheckStep[];
  violation?: {
    type: string;
    expected: string;
    actual: string;
    severity: string;
  };
  executionId?: string;
  txHash?: string;
}

export default function SimulatorPage() {
  const [target, setTarget] = useState(deployments.contracts.SafeMerchant);
  const [recipient, setRecipient] = useState(deployments.demoAccounts.supplier);
  const [asset, setAsset] = useState(deployments.contracts.MockUSDC);
  const [amount, setAmount] = useState("480");
  const [postconditionVal, setPostconditionVal] = useState("0");
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const runSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setResult(null);

    try {
      const res = await fetch("/api/v1/executions/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "atlas",
          target,
          recipient,
          asset,
          amount: parseFloat(amount),
          postconditionType: parseFloat(postconditionVal) > 0 ? 1 : 0,
          postconditionToken: asset,
          postconditionValue: parseFloat(postconditionVal),
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setResult(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const setScenario = (preset: "SAFE" | "ROGUE_RECIPIENT" | "OVER_BUDGET" | "ROGUE_CONTRACT") => {
    if (preset === "SAFE") {
      setTarget(deployments.contracts.SafeMerchant);
      setRecipient(deployments.demoAccounts.supplier);
      setAmount("480");
      setPostconditionVal("0");
    } else if (preset === "ROGUE_RECIPIENT") {
      setTarget(deployments.contracts.SafeMerchant);
      setRecipient(deployments.demoAccounts.attacker);
      setAmount("480");
      setPostconditionVal("0");
    } else if (preset === "OVER_BUDGET") {
      setTarget(deployments.contracts.SafeMerchant);
      setRecipient(deployments.demoAccounts.supplier);
      setAmount("750");
      setPostconditionVal("0");
    } else if (preset === "ROGUE_CONTRACT") {
      setTarget(deployments.contracts.MaliciousMerchant);
      setRecipient(deployments.demoAccounts.supplier);
      setAmount("450");
      setPostconditionVal("0");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Action Simulator</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              Pre-Flight Validation Sandbox
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Test candidate agent execution proposals against active economic policies before onchain submission.
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setScenario("SAFE")}
            className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-secondary hover:text-primary hover:bg-background"
          >
            Valid Acme Purchase
          </button>
          <button
            onClick={() => setScenario("ROGUE_RECIPIENT")}
            className="rounded-md border border-danger-border bg-danger-surface px-2.5 py-1 text-xs font-medium text-danger"
          >
            Rogue Recipient
          </button>
          <button
            onClick={() => setScenario("OVER_BUDGET")}
            className="rounded-md border border-danger-border bg-danger-surface px-2.5 py-1 text-xs font-medium text-danger"
          >
            $750 Over-Budget
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Input Form */}
        <form onSubmit={runSimulation} className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Cpu className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-primary">Candidate Execution Request</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-primary block mb-1">Target Contract Address</label>
              <input
                type="text"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                placeholder="0x..."
                required
              />
            </div>

            <div>
              <label className="font-semibold text-primary block mb-1">Recipient Destination</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                placeholder="0x..."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-primary block mb-1">Asset Address</label>
                <input
                  type="text"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                  placeholder="0x..."
                  required
                />
              </div>

              <div>
                <label className="font-semibold text-primary block mb-1">Proposed Amount ($ USDC)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono tabular-nums focus:border-accent focus:outline-none"
                  placeholder="480"
                  required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-primary block mb-1">Postcondition: Minimum Token Received (Optional)</label>
              <input
                type="number"
                value={postconditionVal}
                onChange={(e) => setPostconditionVal(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono tabular-nums focus:border-accent focus:outline-none"
                placeholder="0"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSimulating}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-surface shadow hover:bg-accent-hover transition-colors"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Evaluating Constraints...</span>
                </>
              ) : (
                <>
                  <Zap className="h-3.5 w-3.5" />
                  <span>Simulate Policy Verification</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Evaluation Verdict & Stepped Checks */}
        <div className="space-y-4">
          {result ? (
            <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
              {/* Verdict Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <div className="text-[10px] font-mono text-secondary uppercase">Firewall Verdict</div>
                  <div className="flex items-center gap-2 mt-1">
                    {result.decision === "ALLOW" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-success-surface border border-success-border px-3 py-1 text-sm font-bold text-success font-mono">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>EXECUTION APPROVED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-surface border border-danger-border px-3 py-1 text-sm font-bold text-danger font-mono">
                        <XCircle className="h-4 w-4" />
                        <span>EXECUTION BLOCKED ({result.decision})</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-[10px] text-secondary uppercase">Capital Moved</div>
                  <div className={`text-xl font-bold tabular-nums ${result.decision === "ALLOW" ? "text-primary" : "text-danger"}`}>
                    ${result.capitalMoved.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Violation Details if blocked */}
              {result.violation && (
                <div className="rounded-lg bg-danger-surface border border-danger-border p-4 space-y-2 text-xs">
                  <div className="font-bold text-danger font-mono">
                    POLICY VIOLATION: {result.violation.type}
                  </div>
                  <div className="space-y-1 text-secondary">
                    <div>
                      <strong className="text-primary">Expected Boundary:</strong> {result.violation.expected}
                    </div>
                    <div>
                      <strong className="text-danger">Actual Candidate:</strong> {result.violation.actual}
                    </div>
                  </div>
                </div>
              )}

              {/* Step checks */}
              <div className="space-y-2">
                <div className="text-xs font-mono font-semibold text-secondary uppercase">
                  Policy Boundary Verifications
                </div>
                <div className="space-y-2">
                  {result.checks.map((chk, i) => (
                    <div
                      key={i}
                      className={`flex items-start justify-between p-2.5 rounded-lg border text-xs ${
                        chk.passed
                          ? "bg-success-surface/50 border-success-border text-secondary"
                          : "bg-danger-surface/50 border-danger-border text-danger"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold">{chk.step}</div>
                        <div className="text-[11px] leading-tight">{chk.details}</div>
                      </div>
                      {chk.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-danger shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidence link */}
              {result.executionId && (
                <div className="pt-2 border-t border-border flex justify-end">
                  <Link
                    href={`/executions/${result.executionId}`}
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <span>View in Evidence Vault</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-secondary space-y-2">
              <Zap className="h-8 w-8 mx-auto text-secondary-light" />
              <div className="text-xs font-bold text-primary">No Simulation Run Yet</div>
              <p className="text-xs text-secondary max-w-xs mx-auto">
                Submit candidate parameters to run the pre-flight verification engine.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
