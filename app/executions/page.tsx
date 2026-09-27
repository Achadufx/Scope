"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AddressPill from "@/components/ui/AddressPill";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/EmptyState";
import { TxHashCell } from "@/components/ui/TxTelemetry";

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
  const [searchQuery, setSearchQuery] = useState("");
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

  const filteredExecutions = executions.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      e.recipient?.toLowerCase().includes(q) ||
      e.txHash?.toLowerCase().includes(q) ||
      e.agent?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Evidence Vault</h1>
            <span className="rounded bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent font-mono uppercase tracking-wider border border-accent/20">
              Forensic Audit Ledger
            </span>
          </div>
          <p className="text-xs text-secondary mt-1 tracking-tight">
            Complete cryptographic audit trail of all allowed executions and atomically blocked violations.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-secondary absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by hash, recipient, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-md border border-border bg-surface text-xs text-primary focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle focus:outline-none w-52 sm:w-64 font-mono text-[11px]"
            />
          </div>

          <div className="flex items-center gap-1 border border-border rounded-md bg-surface p-0.5 shadow-subtle">
            {[
              { id: "ALL", label: "All Traces" },
              { id: "BLOCK", label: "Blocked" },
              { id: "ALLOW", label: "Approved" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  filter === f.id
                    ? "bg-primary text-surface font-semibold"
                    : "text-secondary hover:text-primary hover:bg-background"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Executions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-secondary gap-2 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-accent" />
          <span>Retrieving evidence traces...</span>
        </div>
      ) : filteredExecutions.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No execution traces match filter"
          description="There are no forensic execution records matching the current search parameters."
          action={{
            label: "Reset Filter",
            onClick: () => {
              setFilter("ALL");
              setSearchQuery("");
            },
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-left text-xs">
              <thead className="bg-background font-mono text-[10px] uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-3 py-2.5 font-semibold">Decision / Status</th>
                  <th className="px-3 py-2.5 font-semibold">Agent</th>
                  <th className="px-3 py-2.5 font-semibold">Amount</th>
                  <th className="px-3 py-2.5 font-semibold">Counterparty Recipient</th>
                  <th className="px-3 py-2.5 font-semibold">Capital Moved</th>
                  <th className="px-3 py-2.5 font-semibold">Capital Saved</th>
                  <th className="px-3 py-2.5 font-semibold">Transaction</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Forensics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-sans">
                {filteredExecutions.map((e) => {
                  const isAllow = e.decision === "ALLOW";
                  return (
                    <tr key={e.id} className="hover:bg-background/60 transition-colors group">
                      {/* Decision */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <StatusBadge status={e.decision} size="sm" />
                      </td>

                      {/* Agent */}
                      <td className="px-3 py-2.5 whitespace-nowrap font-medium text-primary text-[11px]">
                        {e.agent?.name}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold tabular-nums text-primary text-[11px]">
                        ${e.amount.toFixed(2)} USDC
                      </td>

                      {/* Counterparty Recipient */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <AddressPill address={e.recipient} truncate={true} prefixChars={6} suffixChars={4} />
                        {!isAllow && e.violations && e.violations[0] && (
                          <div className="text-[10px] text-danger font-mono mt-0.5">
                            {e.violations[0].type}
                          </div>
                        )}
                      </td>

                      {/* Capital Moved */}
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono tabular-nums text-[11px]">
                        {isAllow ? (
                          <span className="text-primary font-medium">${e.capitalMoved.toFixed(2)}</span>
                        ) : (
                          <span className="text-danger font-bold">$0.00</span>
                        )}
                      </td>

                      {/* Capital Saved */}
                      <td className="px-3 py-2.5 whitespace-nowrap font-mono tabular-nums text-[11px]">
                        {isAllow ? (
                          <span className="text-secondary">$0.00</span>
                        ) : (
                          <span className="text-success font-bold">${e.capitalProtected.toFixed(2)}</span>
                        )}
                      </td>

                      {/* Tx Hash */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <AddressPill address={e.txHash} truncate={true} prefixChars={6} suffixChars={4} />
                      </td>

                      {/* Evidence Link */}
                      <td className="px-3 py-2.5 whitespace-nowrap text-right">
                        <Link
                          href={`/executions/${e.id}`}
                          className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-0.5"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
