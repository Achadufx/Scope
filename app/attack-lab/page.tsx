"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Cpu,
  Layers,
  Zap,
  Terminal,
  Clock,
  RefreshCw,
} from "lucide-react";
import AddressPill from "@/components/ui/AddressPill";
import StatusBadge from "@/components/ui/StatusBadge";
import { TxTelemetry } from "@/components/ui/TxTelemetry";

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
  // Start at zero — the scoreboard is populated from real DB executions by the first
  // /api/v1/attack-lab/run response. Never seed it with fabricated tallies.
  const [scoreboard, setScoreboard] = useState<ScoreboardData>({
    attacksTested: 0,
    policyViolations: 0,
    transactionsBlocked: 0,
    capitalExposed: 0,
    capitalProtected: 0,
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

    for (let i = 0; i < loadingSequence.length; i++) {
      setLoadingStepIndex(i);
      await new Promise((r) => setTimeout(r, 140));
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
    runAttack("COMPROMISED_SUPPLIER");
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded border border-danger-border bg-danger-surface px-2 py-0.5 text-[10px] font-semibold text-danger uppercase font-mono tracking-wider mb-2">
            <ShieldAlert className="h-3 w-3" />
            <span>Adversarial Testing Lab</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Adversarial Execution Lab</h1>
          <p className="text-xs text-secondary mt-1 tracking-tight">
            Pitting autonomous agent proposals against onchain economic policies. Real smart contract reverts.
          </p>
        </div>

        {/* Attack Lab Scoreboard */}
        <div className="rounded-lg border border-border bg-surface p-3 shadow-card flex items-center gap-4 sm:gap-6">
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Attacks Tested</div>
            <div className="text-base font-bold text-primary font-mono tabular-nums">{scoreboard.attacksTested}</div>
          </div>
          <div className="h-7 w-px bg-border" />
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Violations</div>
            <div className="text-base font-bold text-warning font-mono tabular-nums">{scoreboard.policyViolations}</div>
          </div>
          <div className="h-7 w-px bg-border" />
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Blocked Onchain</div>
            <div className="text-base font-bold text-danger font-mono tabular-nums">{scoreboard.transactionsBlocked}</div>
          </div>
          <div className="h-7 w-px bg-border" />
          <div>
            <div className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Capital Saved</div>
            <div className="text-base font-bold text-success font-mono tabular-nums">
              ${scoreboard.capitalProtected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      {/* Preset Selector Buttons */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-secondary">
            Select Attack Scenario
          </span>
          <span className="text-[11px] text-secondary font-mono">Agent Target: Atlas Procurement Agent</span>
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
                className={`p-3 rounded-lg border text-left transition-all flex flex-col justify-between shadow-subtle ${
                  isSelected
                    ? isNormal
                      ? "border-success bg-success-surface/50 ring-1 ring-success/30"
                      : "border-danger bg-danger-surface/50 ring-1 ring-danger/30"
                    : "border-border bg-surface hover:border-secondary-light hover:bg-background"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary font-sans">{p.name}</span>
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
        <div className="rounded-lg border border-accent/20 bg-surface p-5 shadow-card space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>DISPATCHING EXECUTION REQUEST TO ONCHAIN FIREWALL...</span>
          </div>
          <div className="space-y-1 pl-5 font-mono text-xs">
            {loadingSequence.map((text, idx) => (
              <div
                key={idx}
                className={`transition-opacity duration-150 ${
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
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* LEFT: WITHOUT SCOPE */}
            <div className="rounded-lg border border-danger-border bg-surface p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-danger animate-pulse" />
                  <h3 className="text-xs font-bold text-danger uppercase font-mono tracking-wider">WITHOUT SCOPE</h3>
                </div>
                <span className="rounded bg-danger-surface border border-danger-border px-2 py-0.5 text-[10px] font-bold text-danger font-mono">
                  UNRESTRICTED AGENT
                </span>
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-3 rounded-md bg-background border border-border font-mono text-xs space-y-2">
                <div className="text-secondary text-[10px] uppercase tracking-wider font-semibold">RAW DISPATCH FLOW:</div>
                <div className="flex items-center gap-1.5 flex-wrap font-semibold text-primary text-[11px]">
                  <span>Atlas Agent</span>
                  <span className="text-secondary">→</span>
                  <span className="text-danger">${result.withoutScope.capitalExposed.toFixed(2)} USDC</span>
                  <span className="text-secondary">→</span>
                  <AddressPill address={result.withoutScope.recipient} truncate={true} prefixChars={6} suffixChars={4} />
                  <span className="text-secondary">→</span>
                  <span className="rounded bg-danger text-surface px-1.5 py-0.5 text-[9px] font-mono font-bold">
                    EXECUTED
                  </span>
                </div>
              </div>

              {/* Consequence card */}
              <div className="rounded-md bg-danger-surface border border-danger-border p-3.5 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-danger">Capital Exposed / Lost:</span>
                  <span className="text-base font-bold text-danger font-mono tabular-nums">
                    ${result.withoutScope.capitalExposed.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-danger/90 leading-relaxed font-sans">
                  The account processed the signer's raw payload without policy checks. The transaction succeeded onchain and capital moved irreversibly.
                </p>
              </div>

              <div className="text-[11px] text-secondary font-mono">
                Verdict: Rogue execution succeeded. Zero policy enforcement.
              </div>
            </div>

            {/* RIGHT: WITH SCOPE */}
            <div className="rounded-lg border border-accent bg-surface p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <h3 className="text-xs font-bold text-primary uppercase font-mono tracking-wider">WITH SCOPE FIREWALL</h3>
                </div>
                <StatusBadge status={result.withScope.status} size="sm" />
              </div>

              {/* Execution Flow Diagram */}
              <div className="p-3 rounded-md bg-background border border-border font-mono text-xs space-y-2">
                <div className="text-secondary text-[10px] uppercase tracking-wider font-semibold">FIREWALL ENVELOPE:</div>
                <div className="flex items-center gap-1.5 flex-wrap font-semibold text-primary text-[11px]">
                  <span>Atlas</span>
                  <span className="text-secondary">→</span>
                  <span className="text-accent">ScopeExecutor</span>
                  <span className="text-secondary">→</span>
                  {result.withScope.status === "EXECUTED" ? (
                    <span className="rounded bg-success text-surface px-1.5 py-0.5 text-[9px] font-mono font-bold">
                      CONFIRMED
                    </span>
                  ) : (
                    <span className="rounded bg-danger text-surface px-1.5 py-0.5 text-[9px] font-mono font-bold">
                      ATOMIC REVERT
                    </span>
                  )}
                </div>
              </div>

              {/* Protection Card */}
              {result.withScope.status === "REVERTED" ? (
                <div className="rounded-md bg-success-surface border border-success-border p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-success">Capital Moved:</span>
                    <span className="text-base font-bold text-success font-mono tabular-nums">
                      $0.00
                    </span>
                  </div>
                  <div className="text-[11px] text-secondary">
                    Violation Caught: <strong className="text-danger font-mono">{result.withScope.violation?.type || result.withScope.reason}</strong>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed font-sans">
                    The smart contract rejected the transaction atomically before state change. $0.00 capital exposed.
                  </p>
                </div>
              ) : (
                <div className="rounded-md bg-success-surface border border-success-border p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-success">Execution Approved:</span>
                    <span className="text-base font-bold text-primary font-mono tabular-nums">
                      ${result.withScope.capitalMoved.toFixed(2)} USDC
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary leading-relaxed font-sans">
                    Transaction strictly complied with allowed asset, merchant, limit, and window. Settled onchain.
                  </p>
                </div>
              )}

              {/* Onchain telemetry: a real receipt for an executed tx, or an honest
                  "no transaction" state for anything the firewall blocked. Never faked. */}
              <TxTelemetry
                txHash={result.withScope.txHash}
                blockNumber={result.withScope.blockNumber}
                gasUsed={result.withScope.gasUsed}
                noTxTitle={
                  result.withScope.reason?.includes("TIME_WINDOW")
                    ? "Blocked offchain before submission"
                    : "Reverted in preflight simulation"
                }
                noTxDetail={
                  result.withScope.reason?.includes("TIME_WINDOW")
                    ? "Blocked by SCOPE's offchain policy gateway (operational-hours rule) before submission — the request never reached the chain. $0 gas spent, $0.00 capital exposed."
                    : "ScopeExecutor rejected the request atomically during onchain simulation — no transaction was submitted. $0 gas spent, $0.00 capital exposed."
                }
              />
              {result.withScope.executionId && (
                <div className="flex justify-end">
                  <Link
                    href={`/executions/${result.withScope.executionId}`}
                    className="text-accent hover:underline flex items-center gap-1 font-semibold text-xs"
                  >
                    <span>Inspect Evidence Vault</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Stepped Pre-condition Checks breakdown */}
          <div className="rounded-lg border border-border bg-surface p-5 shadow-card space-y-3">
            <h3 className="text-xs font-bold text-primary uppercase font-mono tracking-wider">
              Onchain Precondition & Postcondition Verification Pipeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {result.withScope.checks.map((chk, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-md border text-xs space-y-1 ${
                    chk.passed
                      ? "border-success-border bg-success-surface/50"
                      : "border-danger-border bg-danger-surface/50"
                  }`}
                >
                  <div className="flex items-center justify-between font-mono font-semibold text-[11px]">
                    <span>{chk.step}</span>
                    {chk.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-danger" />
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
