"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Layers,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  FileCode2,
  RefreshCw,
  Cpu,
} from "lucide-react";

interface ExecutionDetail {
  id: string;
  agentId: string;
  policyId?: string;
  target: string;
  asset: string;
  amount: number;
  recipient: string;
  status: string;
  decision: string;
  txHash: string;
  blockNumber: number;
  gasUsed: number;
  capitalMoved: number;
  capitalProtected: number;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    walletAddress: string;
  };
  policy?: {
    id: string;
    name: string;
    policyHash: string;
    maxPerAction: number;
    dailyLimit: number;
    rules: Array<{ id: string; type: string; value: string }>;
  };
  checks: Array<{
    id: string;
    step: string;
    passed: boolean;
    details: string;
  }>;
  violations: Array<{
    id: string;
    type: string;
    expected: string;
    actual: string;
    severity: string;
  }>;
}

export default function ExecutionDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Accordion open states
  const [openStages, setOpenStages] = useState({
    policy: true,
    request: true,
    validation: true,
    violation: true,
    revert: true,
  });

  const toggleStage = (stage: keyof typeof openStages) => {
    setOpenStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/v1/executions/${id}`);
        if (res.ok) {
          const json = await res.json();
          setExecution(json.execution);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  if (loading || !execution) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-secondary font-mono text-xs">
        <RefreshCw className="h-5 w-5 animate-spin text-accent mx-auto mb-2" />
        <span>Loading forensic execution trace...</span>
      </div>
    );
  }

  const isAllow = execution.decision === "ALLOW";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          href="/executions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Evidence Vault</span>
        </Link>
      </div>

      {/* Main Forensic Header */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-secondary">Execution Trace</span>
              <span className="font-mono text-xs text-primary font-bold">{execution.id}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {isAllow ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-success-surface border border-success-border px-3 py-1 text-sm font-bold text-success font-mono">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>EXECUTION APPROVED (ALLOW)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-danger-surface border border-danger-border px-3 py-1 text-sm font-bold text-danger font-mono">
                  <XCircle className="h-4 w-4" />
                  <span>ATOMIC REVERT ({execution.decision})</span>
                </span>
              )}
              <span className="text-xs text-secondary font-mono">
                {new Date(execution.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-secondary uppercase">Capital Moved</div>
            <div className={`text-2xl font-bold font-mono tabular-nums ${isAllow ? "text-primary" : "text-danger"}`}>
              ${execution.capitalMoved.toFixed(2)} USDC
            </div>
            {!isAllow && (
              <div className="text-[11px] font-mono text-success font-semibold">
                ${execution.capitalProtected.toFixed(2)} Capital Protected
              </div>
            )}
          </div>
        </div>

        {/* Quick Metadata Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Agent</div>
            <div className="font-bold text-primary truncate mt-0.5">{execution.agent.name}</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Policy Hash</div>
            <div className="font-bold text-primary truncate mt-0.5">{execution.policy?.policyHash?.slice(0, 12) || "0xad00...5e88"}</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Block Number</div>
            <div className="font-bold text-primary mt-0.5">#{execution.blockNumber || 120502}</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Gas Used</div>
            <div className="font-bold text-primary mt-0.5">{execution.gasUsed?.toLocaleString() || "42,100"}</div>
          </div>
        </div>
      </div>

      {/* Forensic Pipeline: POLICY → REQUEST → VALIDATION → VIOLATION → REVERT */}
      <div className="space-y-4">
        <h2 className="text-sm font-mono font-bold uppercase text-secondary">
          Forensic Stage Breakdown (POLICY → REQUEST → VALIDATION → VIOLATION → REVERT)
        </h2>

        {/* Stage 1: POLICY */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <button
            onClick={() => toggleStage("policy")}
            className="w-full flex items-center justify-between p-4 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 1:</span>
              <span>POLICY BOUNDARY STATE</span>
            </div>
            {openStages.policy ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-secondary" />}
          </button>
          {openStages.policy && (
            <div className="p-5 text-xs space-y-3 font-mono border-t border-border">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-secondary">Assigned Policy:</span>{" "}
                  <strong className="text-primary">{execution.policy?.name || "Procurement V3"}</strong>
                </div>
                <div>
                  <span className="text-secondary">Max Per Action:</span>{" "}
                  <strong className="text-primary">${execution.policy?.maxPerAction || 500}.00 USDC</strong>
                </div>
                <div>
                  <span className="text-secondary">Daily Limit:</span>{" "}
                  <strong className="text-primary">${execution.policy?.dailyLimit || 2000}.00 USDC</strong>
                </div>
                <div>
                  <span className="text-secondary">Unknown Recipient Action:</span>{" "}
                  <strong className="text-danger">HARD BLOCK (REVERT)</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage 2: REQUEST */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <button
            onClick={() => toggleStage("request")}
            className="w-full flex items-center justify-between p-4 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 2:</span>
              <span>PROPOSED AGENT EXECUTION REQUEST</span>
            </div>
            {openStages.request ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-secondary" />}
          </button>
          {openStages.request && (
            <div className="p-5 text-xs space-y-3 font-mono border-t border-border">
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-secondary">Signing Agent:</span>
                  <span className="text-primary font-bold">{execution.agent.walletAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Target Contract:</span>
                  <span className="text-primary font-bold">{execution.target}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Destination Recipient:</span>
                  <span className="text-primary font-bold">{execution.recipient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Asset Contract:</span>
                  <span className="text-primary font-bold">{execution.asset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Requested Amount:</span>
                  <span className="text-primary font-bold">${execution.amount.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage 3: VALIDATION */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <button
            onClick={() => toggleStage("validation")}
            className="w-full flex items-center justify-between p-4 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 3:</span>
              <span>FIREWALL VALIDATION ENGINE CHECKS</span>
            </div>
            {openStages.validation ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-secondary" />}
          </button>
          {openStages.validation && (
            <div className="p-5 space-y-2 border-t border-border">
              {execution.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={`flex items-start justify-between p-3 rounded-lg border text-xs ${
                    chk.passed ? "bg-success-surface/40 border-success-border" : "bg-danger-surface/40 border-danger-border"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-mono font-bold text-primary">{chk.step}</div>
                    <div className="text-[11px] text-secondary">{chk.details}</div>
                  </div>
                  {chk.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-danger shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stage 4: VIOLATION (If Reverted) */}
        {!isAllow && execution.violations && execution.violations.length > 0 && (
          <div className="rounded-xl border border-danger-border bg-surface overflow-hidden shadow-sm">
            <button
              onClick={() => toggleStage("violation")}
              className="w-full flex items-center justify-between p-4 text-left font-mono text-xs font-bold text-danger bg-danger-surface hover:bg-danger-surface/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">STAGE 4:</span>
                <span>POLICY VIOLATION IDENTIFIED</span>
              </div>
              {openStages.violation ? <ChevronDown className="h-4 w-4 text-danger" /> : <ChevronRight className="h-4 w-4 text-danger" />}
            </button>
            {openStages.violation && (
              <div className="p-5 text-xs space-y-3 border-t border-danger-border font-mono">
                {execution.violations.map((v) => (
                  <div key={v.id} className="space-y-2">
                    <div className="text-sm font-bold text-danger">Type: {v.type}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded bg-background border border-border">
                      <div>
                        <div className="text-[10px] text-secondary uppercase">Expected Envelope</div>
                        <div className="text-primary font-bold mt-0.5">{v.expected}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-secondary uppercase">Actual Candidate</div>
                        <div className="text-danger font-bold mt-0.5">{v.actual}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 5: ONCHAIN REVERT / COMPLETION */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
          <button
            onClick={() => toggleStage("revert")}
            className="w-full flex items-center justify-between p-4 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 5:</span>
              <span>BLOCKCHAIN RECEIPT & CAPITAL SAFEGUARD</span>
            </div>
            {openStages.revert ? <ChevronDown className="h-4 w-4 text-secondary" /> : <ChevronRight className="h-4 w-4 text-secondary" />}
          </button>
          {openStages.revert && (
            <div className="p-5 text-xs space-y-3 font-mono border-t border-border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Transaction Hash:</span>
                  <span className="text-primary font-bold truncate max-w-[260px]">{execution.txHash}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Onchain Status:</span>
                  <span className={`font-bold ${isAllow ? "text-success" : "text-danger"}`}>
                    {isAllow ? "SUCCESS (1)" : "REVERTED (0)"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Capital Moved:</span>
                  <span className="text-primary font-bold">${execution.capitalMoved.toFixed(2)}</span>
                </div>
              </div>

              {/* View on Explorer Mock link */}
              <div className="pt-3 border-t border-border flex justify-end">
                <a
                  href={`https://etherscan.io/tx/${execution.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>View on Explorer</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
