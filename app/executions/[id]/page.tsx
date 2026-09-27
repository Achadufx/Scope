"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import AddressPill from "@/components/ui/AddressPill";
import StatusBadge from "@/components/ui/StatusBadge";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { TxTelemetry } from "@/components/ui/TxTelemetry";

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
  txHash: string | null;
  blockNumber: number | null;
  gasUsed: number | null;
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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <Breadcrumbs
          items={[
            { label: "Evidence Vault", href: "/executions" },
            { label: `${execution.id.slice(0, 16)}...`, isMono: true },
          ]}
        />
      </div>

      {/* Main Forensic Header */}
      <div className="rounded-lg border border-border bg-surface p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-secondary">Execution Trace ID:</span>
              <AddressPill address={execution.id} truncate={false} />
            </div>
            <div className="flex items-center gap-2.5 mt-2">
              <StatusBadge status={execution.decision} size="md" />
              <span className="text-xs text-secondary font-mono">
                {new Date(execution.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-secondary uppercase tracking-wider">Capital Moved</div>
            <div className={`text-2xl font-bold font-mono tabular-nums tracking-tight ${isAllow ? "text-primary" : "text-danger"}`}>
              ${execution.capitalMoved.toFixed(2)} USDC
            </div>
            {!isAllow && (
              <div className="text-[11px] font-mono text-success font-semibold mt-0.5">
                ${execution.capitalProtected.toFixed(2)} Capital Safeguarded
              </div>
            )}
          </div>
        </div>

        {/* Quick Metadata Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-md bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase tracking-wider">Agent</div>
            <div className="font-bold text-primary truncate mt-0.5">{execution.agent?.name}</div>
          </div>
          <div className="p-2.5 rounded-md bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase tracking-wider">Policy Hash</div>
            <div className="mt-0.5">
              {execution.policy?.policyHash ? (
                <AddressPill address={execution.policy.policyHash} truncate={true} prefixChars={6} suffixChars={4} />
              ) : (
                <span className="text-[11px] font-mono text-secondary/70 italic">not recorded</span>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-md bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase tracking-wider">Block Number</div>
            <div className="font-bold text-primary mt-0.5 tabular-nums">
              {execution.blockNumber != null ? (
                `#${execution.blockNumber.toLocaleString()}`
              ) : (
                <span className="font-normal text-secondary/70 italic text-[11px]">— no tx</span>
              )}
            </div>
          </div>
          <div className="p-2.5 rounded-md bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase tracking-wider">Gas Consumed</div>
            <div className="font-bold text-primary mt-0.5 tabular-nums">
              {execution.gasUsed != null ? execution.gasUsed.toLocaleString() : "0"}
            </div>
          </div>
        </div>
      </div>

      {/* Forensic Pipeline: POLICY → REQUEST → VALIDATION → VIOLATION → REVERT */}
      <div className="space-y-3.5">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-secondary">
          Forensic Stage Breakdown (POLICY → REQUEST → VALIDATION → VIOLATION → REVERT)
        </h2>

        {/* Stage 1: POLICY */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-card">
          <button
            onClick={() => toggleStage("policy")}
            className="w-full flex items-center justify-between p-3.5 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 1:</span>
              <span>POLICY BOUNDARY STATE</span>
            </div>
            {openStages.policy ? <ChevronDown className="h-3.5 w-3.5 text-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-secondary" />}
          </button>
          {openStages.policy && (
            <div className="p-4 text-xs space-y-2.5 font-mono border-t border-border">
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
                  <strong className="text-danger">HARD REVERT (Atomic)</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage 2: REQUEST */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-card">
          <button
            onClick={() => toggleStage("request")}
            className="w-full flex items-center justify-between p-3.5 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 2:</span>
              <span>PROPOSED AGENT EXECUTION REQUEST</span>
            </div>
            {openStages.request ? <ChevronDown className="h-3.5 w-3.5 text-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-secondary" />}
          </button>
          {openStages.request && (
            <div className="p-4 text-xs space-y-2 font-mono border-t border-border">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Signing Agent:</span>
                  <AddressPill address={execution.agent?.walletAddress} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Target Contract:</span>
                  <AddressPill address={execution.target} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Destination Recipient:</span>
                  <AddressPill address={execution.recipient} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Asset Contract:</span>
                  <AddressPill address={execution.asset} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Requested Amount:</span>
                  <span className="text-primary font-bold tabular-nums">${execution.amount.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage 3: VALIDATION */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-card">
          <button
            onClick={() => toggleStage("validation")}
            className="w-full flex items-center justify-between p-3.5 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 3:</span>
              <span>FIREWALL VALIDATION ENGINE CHECKS</span>
            </div>
            {openStages.validation ? <ChevronDown className="h-3.5 w-3.5 text-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-secondary" />}
          </button>
          {openStages.validation && (
            <div className="p-4 space-y-2 border-t border-border">
              {execution.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={`flex items-start justify-between p-2.5 rounded-md border text-xs ${
                    chk.passed ? "bg-success-surface/40 border-success-border" : "bg-danger-surface/40 border-danger-border"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-mono font-bold text-primary text-[11px]">{chk.step}</div>
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
          <div className="rounded-lg border border-danger-border bg-surface overflow-hidden shadow-card">
            <button
              onClick={() => toggleStage("violation")}
              className="w-full flex items-center justify-between p-3.5 text-left font-mono text-xs font-bold text-danger bg-danger-surface hover:bg-danger-surface/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold">STAGE 4:</span>
                <span>POLICY VIOLATION IDENTIFIED</span>
              </div>
              {openStages.violation ? <ChevronDown className="h-3.5 w-3.5 text-danger" /> : <ChevronRight className="h-3.5 w-3.5 text-danger" />}
            </button>
            {openStages.violation && (
              <div className="p-4 text-xs space-y-2.5 border-t border-danger-border font-mono">
                {execution.violations.map((v) => (
                  <div key={v.id} className="space-y-2">
                    <div className="text-xs font-bold text-danger">Revert Code: {v.type}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-md bg-background border border-border">
                      <div>
                        <div className="text-[10px] text-secondary uppercase tracking-wider">Expected Envelope</div>
                        <div className="text-primary font-bold mt-0.5 text-[11px] break-all">{v.expected}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-secondary uppercase tracking-wider">Actual Candidate</div>
                        <div className="text-danger font-bold mt-0.5 text-[11px] break-all">{v.actual}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stage 5: ONCHAIN REVERT / COMPLETION */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden shadow-card">
          <button
            onClick={() => toggleStage("revert")}
            className="w-full flex items-center justify-between p-3.5 text-left font-mono text-xs font-bold text-primary bg-background hover:bg-background/80 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-accent font-bold">STAGE 5:</span>
              <span>BLOCKCHAIN RECEIPT & CAPITAL SAFEGUARD</span>
            </div>
            {openStages.revert ? <ChevronDown className="h-3.5 w-3.5 text-secondary" /> : <ChevronRight className="h-3.5 w-3.5 text-secondary" />}
          </button>
          {openStages.revert && (
            <div className="p-4 text-xs space-y-2.5 font-mono border-t border-border">
              <TxTelemetry
                txHash={execution.txHash}
                blockNumber={execution.blockNumber}
                gasUsed={execution.gasUsed}
                noTxTitle={isAllow ? "Awaiting onchain confirmation" : "Reverted before submission"}
                noTxDetail={
                  isAllow
                    ? "This execution satisfied every policy boundary but carries no recorded transaction hash — it was not verified onchain."
                    : "SCOPE enforced the boundary before any transaction was submitted. The request reverted in preflight simulation — $0 gas spent, capital fully protected."
                }
              />
              <div className="flex justify-between items-center pt-1">
                <span className="text-secondary">Onchain Status:</span>
                <StatusBadge status={execution.status || (isAllow ? "SUCCESS" : "REVERTED")} size="sm" />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-secondary">Capital Moved:</span>
                <span className="text-primary font-bold tabular-nums">${execution.capitalMoved.toFixed(2)}</span>
              </div>
              {!isAllow && (
                <div className="flex justify-between items-center">
                  <span className="text-secondary">Capital Safeguarded:</span>
                  <span className="text-success font-bold tabular-nums">${execution.capitalProtected.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
