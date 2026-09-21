"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bot,
  ArrowLeft,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

interface AgentDetailData {
  agent: {
    id: string;
    name: string;
    description: string;
    walletAddress: string;
    status: string;
    policies: Array<{
      id: string;
      name: string;
      policyHash: string;
      maxPerAction: number;
      dailyLimit: number;
      rules: Array<{ id: string; type: string; value: string }>;
    }>;
    executions: Array<{
      id: string;
      amount: number;
      status: string;
      decision: string;
      target: string;
      recipient: string;
      capitalMoved: number;
      txHash: string;
      createdAt: string;
    }>;
  };
  metrics: {
    todayExposure: number;
    blockedCount: number;
    capitalProtected: number;
    totalExecutions: number;
  };
}

export default function AgentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<AgentDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch(`/api/v1/agents/${id}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchAgent();
  }, [id]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-secondary font-mono text-xs">
        <RefreshCw className="h-5 w-5 animate-spin text-accent mx-auto mb-2" />
        <span>Loading agent specifications...</span>
      </div>
    );
  }

  const { agent, metrics } = data;
  const policy = agent.policies[0];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Agent Fleet</span>
        </Link>
      </div>

      {/* Main Agent Header */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-accent-light text-accent border border-accent/20">
              <Bot className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-primary">{agent.name}</h1>
                <span className="rounded-full bg-success-surface border border-success-border px-2 py-0.5 text-[10px] font-semibold text-success uppercase">
                  {agent.status}
                </span>
                <span className="rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent uppercase font-mono">
                  Authority: Scoped
                </span>
              </div>
              <p className="text-xs text-secondary mt-1">{agent.description}</p>
            </div>
          </div>

          <div className="font-mono text-xs text-right">
            <div className="text-[10px] text-secondary uppercase">Agent Wallet (Public Key)</div>
            <div className="font-bold text-primary truncate max-w-[220px]">{agent.walletAddress}</div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Today's Exposure</div>
            <div className="text-xl font-bold text-primary mt-1 tabular-nums">
              ${metrics.todayExposure.toFixed(2)} USDC
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Attacks Repelled</div>
            <div className="text-xl font-bold text-danger mt-1 tabular-nums">
              {metrics.blockedCount}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Capital Protected</div>
            <div className="text-xl font-bold text-success mt-1 tabular-nums">
              ${metrics.capitalProtected.toFixed(2)}
            </div>
          </div>
          <div className="p-3.5 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Total Actions Logged</div>
            <div className="text-xl font-bold text-primary mt-1 tabular-nums">
              {metrics.totalExecutions}
            </div>
          </div>
        </div>
      </div>

      {/* Bound Policy Breakdown */}
      {policy && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold text-primary">Active Enforcement Policy: {policy.name}</h2>
            </div>
            <span className="font-mono text-xs text-secondary">Hash: {policy.policyHash.slice(0, 12)}...</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {policy.rules.map((rule) => (
              <div key={rule.id} className="p-3 rounded-lg bg-background border border-border space-y-1">
                <div className="text-[10px] font-mono text-secondary uppercase">{rule.type}</div>
                <div className="font-bold text-primary truncate font-mono">{rule.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Telemetry History */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-primary">Execution Telemetry History</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <table className="min-w-full divide-y divide-border text-left text-xs">
            <thead className="bg-background font-mono text-[11px] uppercase tracking-wider text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Decision</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Destination</th>
                <th className="px-4 py-3 font-semibold">Tx Hash</th>
                <th className="px-4 py-3 font-semibold text-right">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-sans">
              {agent.executions.map((e) => (
                <tr key={e.id} className="hover:bg-background/50 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {e.decision === "ALLOW" ? (
                      <span className="inline-flex items-center gap-1 text-success font-semibold font-mono text-[11px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>ALLOW</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-danger font-semibold font-mono text-[11px]">
                        <XCircle className="h-3 w-3" />
                        <span>{e.decision}</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold tabular-nums text-primary">
                    ${e.amount.toFixed(2)} USDC
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-secondary text-[11px]">
                    {e.recipient ? `${e.recipient.slice(0, 8)}...` : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-mono text-secondary text-[11px]">
                    {e.txHash ? `${e.txHash.slice(0, 10)}...` : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <Link
                      href={`/executions/${e.id}`}
                      className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
