"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCw,
} from "lucide-react";

interface ExecutionItem {
  id: string;
  amount: number;
  status: string;
  decision: string;
  target: string;
  recipient: string;
  txHash: string;
  capitalMoved: number;
  capitalProtected: number;
  blockNumber: number;
  gasUsed: number;
  createdAt: string;
  agent: { name: string };
  policy?: { name: string };
  violations: Array<{ type: string; expected: string; actual: string }>;
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionItem[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  const fetchExecutions = async () => {
    try {
      const url = filter === "ALL" ? "/api/v1/executions" : `/api/v1/executions?decision=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setExecutions(json.executions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutions();
  }, [filter]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Evidence Vault</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              Onchain Forensic Audit Log
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Complete cryptographic audit trail of all allowed executions and atomically blocked violations.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          {["ALL", "BLOCK", "ALLOW"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-primary text-surface"
                  : "border border-border bg-surface text-secondary hover:text-primary hover:bg-background"
              }`}
            >
              {f === "ALL" ? "All Telemetry" : f === "BLOCK" ? "Blocked Attacks" : "Approved Actions"}
            </button>
          ))}
        </div>
      </div>

      {/* Executions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-secondary gap-2 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-accent" />
          <span>Retrieving evidence traces...</span>
        </div>
      ) : executions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-secondary">
          No execution traces found for this filter.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-background font-mono text-[11px] uppercase tracking-wider text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Status / Decision</th>
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Destination Recipient</th>
                <th className="px-4 py-3 font-semibold">Capital Moved</th>
                <th className="px-4 py-3 font-semibold">Capital Saved</th>
                <th className="px-4 py-3 font-semibold">Transaction</th>
                <th className="px-4 py-3 font-semibold text-right">Forensics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {executions.map((e) => {
                const isAllow = e.decision === "ALLOW";
                return (
                  <tr key={e.id} className="hover:bg-background/50 transition-colors">
                    {/* Decision */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isAllow ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-success-surface border border-success-border px-2 py-0.5 text-[11px] font-semibold text-success font-mono">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>ALLOW</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-danger-surface border border-danger-border px-2 py-0.5 text-[11px] font-semibold text-danger font-mono">
                          <XCircle className="h-3 w-3" />
                          <span>{e.decision}</span>
                        </span>
                      )}
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-primary">
                      {e.agent.name}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold tabular-nums text-primary">
                      ${e.amount.toFixed(2)} USDC
                    </td>

                    {/* Recipient */}
                    <td className="px-4 py-3 whitespace-nowrap text-secondary font-mono text-[11px]">
                      <div>{e.recipient ? `${e.recipient.slice(0, 8)}...${e.recipient.slice(-6)}` : "—"}</div>
                      {!isAllow && e.violations && e.violations[0] && (
                        <div className="text-[10px] text-danger font-sans">{e.violations[0].type}</div>
                      )}
                    </td>

                    {/* Capital Moved */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono tabular-nums">
                      {isAllow ? (
                        <span className="text-primary font-medium">${e.capitalMoved.toFixed(2)}</span>
                      ) : (
                        <span className="text-danger font-bold">$0.00</span>
                      )}
                    </td>

                    {/* Capital Protected */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono tabular-nums">
                      {e.capitalProtected > 0 ? (
                        <span className="text-success font-bold">${e.capitalProtected.toFixed(2)}</span>
                      ) : (
                        <span className="text-secondary">$0.00</span>
                      )}
                    </td>

                    {/* Tx Hash */}
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-secondary">
                      {e.txHash ? `${e.txHash.slice(0, 10)}...` : "—"}
                    </td>

                    {/* Forensic Link */}
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link
                        href={`/executions/${e.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-xs text-accent hover:underline"
                      >
                        <span>Evidence</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
