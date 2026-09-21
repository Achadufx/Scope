"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Cpu,
  Layers,
  Zap,
  Terminal,
  Clock,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface EvaluationStep {
  text: string;
  passed: boolean;
}

interface ScoreboardData {
  attacksTested: number;
  policyViolations: number;
  transactionsBlocked: number;
  capitalExposed: number;
  capitalProtected: number;
}

interface AttackResult {
  presetId: string;
  attackName: string;
  attackDescription: string;
  withoutScope: {
    status: string;
    verdict: string;
    capitalExposed: number;
    description: string;
    recipient: string;
    target: string;
  };
  withScope: {
    decision: string;
    status: string;
    capitalExposed: number;
    capitalMoved: number;
    capitalProtected: number;
    reason: string;
    checks: Array<{ step: string; passed: boolean; details: string }>;
    violation?: {
      type: string;
      expected: string;
      actual: string;
      severity: string;
    };
    txHash?: string;
    blockNumber?: number;
    gasUsed?: number;
    executionId?: string;
    description: string;
  };
  scoreboard: ScoreboardData;
}

const PRESETS = [
  {
    id: "COMPROMISED_SUPPLIER",
    name: "Compromised Supplier",
    subtitle: "Rogue Recipient Injection",
    amount: "$480.00",
    asset: "USDC",
    expectedResult: "RECIPIENT_NOT_ALLOWED",
    desc: "Agent redirected to attacker wallet (0x3C44...93BC) instead of Acme Components.",
  },
  {
    id: "BUDGET_BLEED",
    name: "Budget Bleed",
    subtitle: "Action Cap Violation",
    amount: "$700.00",
    asset: "USDC",
    expectedResult: "ACTION_LIMIT_EXCEEDED",
    desc: "Agent attempts a single $700 purchase against a strict $500 maxPerAction envelope.",
  },
  {
    id: "OFF_HOURS",
    name: "Off-Hours Action",
    subtitle: "Operational Window Escape",
    amount: "$350.00",
    asset: "USDC",
    expectedResult: "TIME_WINDOW_VIOLATION",
    desc: "Agent attempts procurement at 03:14 UTC outside the approved 08:00–18:00 window.",
  },
  {
    id: "OUTCOME_SLIPPAGE",
    name: "Outcome Slippage Drain",
    subtitle: "Postcondition Verification",
    amount: "$500.00",
    asset: "USDC",
    expectedResult: "OUTCOME_POSTCONDITION_FAILED",
    desc: "Spend $500 with postcondition ≥ 200 tokens. Rogue merchant returns 170 tokens.",
  },
  {
    id: "NORMAL_PURCHASE",
    name: "Normal Purchase",
    subtitle: "Baseline Legitimate Order",
    amount: "$480.00",
    asset: "USDC",
    expectedResult: "ALLOW / EXECUTED",
    desc: "Atlas spends $480.00 USDC at Acme Components via ProcurementRouter. Fully compliant.",
  },
];

export default function AttackLabPage() {
  const [selectedPreset, setSelectedPreset] = useState("COMPROMISED_SUPPLIER");
  const [executing, setExecuting] = useState(false);
  const [loadingStepIndex, setLoadingStepIndex] = useState(-1);
  const [result, setResult] = useState<AttackResult | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardData>({
    attacksTested: 3,
    policyViolations: 3,
    transactionsBlocked: 3,
    capitalExposed: 0,
    capitalProtected: 1530.0,
  });

  const loadingSequence = [
    "Checking policy... ✓ Agent authorized",
    "Checking destination... Validating contract whitelist",
    "Checking recipient... Verifying approved merchant directory",
    "Checking amount... Evaluating per-action and daily ceiling",
    "Evaluating postcondition outcome constraints...",
  ];

  const runAttack = async (presetIdToRun?: string) => {
    const id = presetIdToRun || selectedPreset;
    setExecuting(true);
    setResult(null);
    setLoadingStepIndex(0);

    // Step-by-step institutional evaluation progression
    for (let i = 0; i < loadingSequence.length; i++) {
      setLoadingStepIndex(i);
      await new Promise((r) => setTimeout(r, 160));
    }

    try {
      const res = await fetch("/api/v1/attack-lab/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ presetId: id }),
      });

      if (res.ok) {
        const data: AttackResult = await res.json();
        setResult(data);
        if (data.scoreboard) {
          setScoreboard(data.scoreboard);
        }
      }
    } catch (err) {
      console.error("Attack run failed", err);
    } finally {
      setExecuting(false);
      setLoadingStepIndex(-1);
    }
  };

  useEffect(() => {
    // Initial run on mount
    runAttack("COMPROMISED_SUPPLIER");
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-md bg-danger-surface border border-danger-border px-2.5 py-0.5 text-xs font-semibold text-danger uppercase font-mono mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Adversarial Testing Environment</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Attack the Agent</h1>
          <p className="text-sm text-secondary mt-1">
            See what happens when an autonomous agent tries to escape its policy. Real onchain evaluation with atomic hard reverts.
          </p>
        </div>

        {/* Attack Lab Scoreboard */}
        <div className="rounded-xl border border-border bg-surface p-3.5 shadow-sm flex items-center gap-6">
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase">Attacks Tested</div>
            <div className="text-lg font-bold text-primary font-mono tabular-nums">{scoreboard.attacksTested}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase">Policy Violations</div>
            <div className="text-lg font-bold text-warning font-mono tabular-nums">{scoreboard.policyViolations}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase">Blocked Onchain</div>
            <div className="text-lg font-bold text-danger font-mono tabular-nums">{scoreboard.transactionsBlocked}</div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase">Capital Exposed</div>
            <div className="text-lg font-bold text-success font-mono tabular-nums font-bold">$0.00</div>
          </div>
        </div>
      </div>

      {/* Preset Selector Buttons */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-semibold uppercase text-secondary">Select Attack Preset</span>
          <span className="text-xs text-secondary font-mono">Agent Target: Atlas Procurement Agent</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRESETS.map((p) => {
            const isSelected = selectedPreset === p.id;
            const isNormal = p.id === "NORMAL_PURCHASE";
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPreset(p.id);
                  runAttack(p.id);
                }}
                disabled={executing}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? isNormal
                      ? "border-success bg-success-surface shadow-sm"
                      : "border-danger bg-danger-surface shadow-sm"
                    : "border-border bg-surface hover:border-secondary-light hover:bg-background"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary">{p.name}</span>
                    <span className="font-mono text-xs font-semibold tabular-nums text-secondary">
                      {p.amount}
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-secondary mt-0.5">{p.subtitle}</div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/60 text-[10px] font-mono text-secondary">
                  Expect: <strong className={isNormal ? "text-success" : "text-danger"}>{p.expectedResult}</strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Progress State */}
      {executing && (
        <div className="rounded-xl border border-accent/20 bg-surface p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>DISPATCHING EXECUTION REQUEST TO ONCHAIN FIREWALL...</span>
          </div>
          <div className="space-y-1.5 pl-6 font-mono text-xs">
            {loadingSequence.map((text, idx) => (
              <div
                key={idx}
                className={`transition-opacity duration-200 ${
                  idx <= loadingStepIndex ? "text-primary opacity-100 font-medium" : "text-secondary opacity-30"
                }`}
              >
                {idx < loadingStepIndex ? `✓ ${text}` : idx === loadingStepIndex ? `▶ ${text}` : `• ${text}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Split Screen Result: WITHOUT SCOPE vs WITH SCOPE */}
      {result && !executing && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT: WITHOUT SCOPE */}
            <div className="rounded-xl border border-danger-border bg-surface p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                  <h3 className="text-sm font-bold text-danger uppercase font-mono">WITHOUT SCOPE</h3>
                </div>
                <span className="rounded bg-danger-surface border border-danger-border px-2 py-0.5 text-xs font-bold text-danger font-mono">
                  UNRESTRICTED AGENT
                </span>
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs space-y-2">
                <div className="text-secondary text-[11px]">RAW TRANSACTION DISPATCH:</div>
                <div className="flex items-center gap-1.5 flex-wrap font-semibold text-primary">
                  <span>Atlas Agent</span>
                  <span className="text-secondary">→</span>
                  <span className="text-danger">${result.withoutScope.capitalExposed.toFixed(2)} USDC</span>
                  <span className="text-secondary">→</span>
                  <span className="text-danger truncate max-w-[120px]">{result.withoutScope.recipient}</span>
                  <span className="text-secondary">→</span>
                  <span className="rounded bg-danger text-surface px-1.5 py-0.2 text-[10px]">
                    EXECUTED
                  </span>
                </div>
              </div>

              {/* Consequence card */}
              <div className="rounded-lg bg-danger-surface border border-danger-border p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-danger">Capital Exposed / Drained:</span>
                  <span className="text-lg font-bold text-danger font-mono tabular-nums">
                    ${result.withoutScope.capitalExposed.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-danger/80 leading-relaxed">
                  The host account simply processed the signature. Without economic execution constraints, the transaction succeeded and funds moved irreversibly.
                </p>
              </div>

              <div className="text-[11px] text-secondary font-mono">
                Outcome: Capital lost, rogue recipient credited, zero policy protection.
              </div>
            </div>

            {/* RIGHT: WITH SCOPE */}
            <div className="rounded-xl border border-accent bg-surface p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <h3 className="text-sm font-bold text-primary uppercase font-mono">WITH SCOPE FIREWALL</h3>
                </div>
                <span className="rounded bg-accent-light border border-accent/20 px-2 py-0.5 text-xs font-bold text-accent font-mono">
                  {result.withScope.status}
                </span>
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-4 rounded-lg bg-background border border-border font-mono text-xs space-y-2">
                <div className="text-secondary text-[11px]">FIREWALL ENFORCEMENT PIPELINE:</div>
                <div className="flex items-center gap-1.5 flex-wrap font-semibold text-primary">
                  <span>Atlas</span>
                  <span className="text-secondary">→</span>
                  <span>${result.withScope.capitalMoved ? result.withScope.capitalMoved.toFixed(2) : result.withoutScope.capitalExposed.toFixed(2)}</span>
                  <span className="text-secondary">→</span>
                  <span className="text-accent">ScopeExecutor</span>
                  <span className="text-secondary">→</span>
                  {result.withScope.status === "EXECUTED" ? (
                    <span className="rounded bg-success text-surface px-1.5 py-0.2 text-[10px]">
                      CONFIRMED
                    </span>
                  ) : (
                    <span className="rounded bg-danger text-surface px-1.5 py-0.2 text-[10px]">
                      ATOMIC REVERT
                    </span>
                  )}
                </div>
              </div>

              {/* Protection Card */}
              {result.withScope.status === "REVERTED" ? (
                <div className="rounded-lg bg-success-surface border border-success-border p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-success">Capital Moved:</span>
                    <span className="text-lg font-bold text-success font-mono tabular-nums">
                      $0.00
                    </span>
                  </div>
                  <div className="text-xs text-secondary">
                    Violation Caught: <strong className="text-danger font-mono">{result.withScope.violation?.type || result.withScope.reason}</strong>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    The smart contract rejected the transaction atomically before state change. Zero funds moved.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-success-surface border border-success-border p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-success">Execution Approved:</span>
                    <span className="text-lg font-bold text-primary font-mono tabular-nums">
                      ${result.withScope.capitalMoved.toFixed(2)} USDC
                    </span>
                  </div>
                  <p className="text-xs text-secondary leading-relaxed">
                    Transaction strictly complied with allowed asset, merchant, limit, and window. Settled onchain.
                  </p>
                </div>
              )}

              {/* Decoded Transaction Telemetry */}
              <div className="space-y-1.5 text-xs font-mono bg-background p-3.5 rounded-lg border border-border">
                <div className="flex justify-between">
                  <span className="text-secondary">Tx Hash:</span>
                  <span className="text-primary truncate max-w-[200px]">{result.withScope.txHash || "0x..."}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Block Number:</span>
                  <span className="text-primary tabular-nums">#{result.withScope.blockNumber || 120502}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Gas Used:</span>
                  <span className="text-primary tabular-nums">{result.withScope.gasUsed?.toLocaleString() || "42,100"}</span>
                </div>
                {result.withScope.executionId && (
                  <div className="pt-2 border-t border-border flex justify-end">
                    <Link
                      href={`/executions/${result.withScope.executionId}`}
                      className="text-accent hover:underline flex items-center gap-1 font-semibold text-xs"
                    >
                      <span>Inspect Forensic Evidence</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stepped Pre-condition Checks breakdown */}
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-primary">Onchain Precondition & Postcondition Verification Checks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {result.withScope.checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    chk.passed
                      ? "border-success-border bg-success-surface"
                      : "border-danger-border bg-danger-surface"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-semibold">
                    <span>{chk.step}</span>
                    {chk.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger" />
                    )}
                  </div>
                  <p className={`text-[11px] leading-tight ${chk.passed ? "text-secondary" : "text-danger font-medium"}`}>
                    {chk.details}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
