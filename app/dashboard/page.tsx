"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ShieldAlert,
  Sliders,
  Bot,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Zap,
  ExternalLink,
  Lock,
  RefreshCw,
} from "lucide-react";

interface StatsData {
  metrics: {
    activeAgents: number;
    policies: number;
    actionsToday: number;
    blocked: number;
    capitalProtected: number;
  };
  atlas: {
    id: string;
    name: string;
    status: string;
    authority: string;
    walletAddress: string;
    todayExposure: number;
    dailyLimit: number;
    maxPerAction: number;
    policyName: string;
    policyId: string;
    lastActionAt: string;
  };
  recentExecutions: Array<{
    id: string;
    amount: number;
    status: string;
    decision: string;
    target: string;
    recipient: string;
    capitalMoved: number;
    capitalProtected: number;
    txHash: string;
    createdAt: string;
    agent: { name: string };
    violations: Array<{ type: string; actual: string }>;
  }>;
  recentEvents: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/v1/stats");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center gap-3 text-secondary py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-accent" />
          <span className="text-xs font-mono">Syncing policy firewall state...</span>
        </div>
      </div>
    );
  }

  const exposurePercent = Math.min(
    100,
    Math.round((data.atlas.todayExposure / data.atlas.dailyLimit) * 100)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Command Center</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              Workspace: Acme Autonomous Systems
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Real-time onchain economic boundary monitoring & execution firewall telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/simulator"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-background transition-colors"
          >
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span>Simulate Request</span>
          </Link>
          <Link
            href="/attack-lab"
            className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-surface shadow hover:bg-danger/90 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Attack Lab</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-secondary uppercase">Active Agents</span>
            <Bot className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono tabular-nums">
            {data.metrics.activeAgents}
          </div>
          <div className="mt-1 text-[11px] text-success flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
            <span>100% Policy Bound</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-secondary uppercase">Active Policies</span>
            <Sliders className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono tabular-nums">
            {data.metrics.policies}
          </div>
          <div className="mt-1 text-[11px] text-secondary">EIP-712 Authorized</div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-secondary uppercase">Actions Today</span>
            <Activity className="h-4 w-4 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono tabular-nums">
            {data.metrics.actionsToday}
          </div>
          <div className="mt-1 text-[11px] text-secondary">Atomic Onchain Execution</div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-medium text-secondary uppercase">Attacks Blocked</span>
            <ShieldAlert className="h-4 w-4 text-danger" />
          </div>
          <div className="mt-2 text-2xl font-bold text-danger font-mono tabular-nums">
            {data.metrics.blocked}
          </div>
          <div className="mt-1 text-[11px] text-danger font-mono font-medium">
            ${data.metrics.capitalProtected.toLocaleString("en-US", { minimumFractionDigits: 2 })} Saved
          </div>
        </div>
      </div>

      {/* Main Agent Card: Atlas Procurement Agent */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-light text-accent border border-accent/20">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-primary">{data.atlas.name}</h2>
                <span className="rounded-full bg-success-surface border border-success-border px-2 py-0.5 text-[10px] font-semibold text-success uppercase">
                  {data.atlas.status}
                </span>
                <span className="rounded-full bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent uppercase font-mono">
                  Authority: {data.atlas.authority}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-secondary font-mono">
                <span>Address: {data.atlas.walletAddress ? `${data.atlas.walletAddress.slice(0, 8)}...${data.atlas.walletAddress.slice(-6)}` : "0x7099...79C8"}</span>
                <span>•</span>
                <span>Policy: {data.atlas.policyName}</span>
                <span>•</span>
                <span>Last action: 8 seconds ago</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/agents/${data.atlas.id || "atlas"}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
            >
              <span>View Agent Specs</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Exposure bar and boundaries */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Exposure bar */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-primary">Today's Exposure</span>
              <span className="font-mono text-secondary tabular-nums">
                <strong className="text-primary font-bold">
                  ${data.atlas.todayExposure.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </strong>{" "}
                / ${data.atlas.dailyLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-background border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  exposurePercent > 80 ? "bg-warning" : "bg-accent"
                }`}
                style={{ width: `${exposurePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-secondary">
              <span>{exposurePercent}% of 24h allocation utilized</span>
              <span>Per-action cap: ${data.atlas.maxPerAction.toFixed(2)} USDC</span>
            </div>
          </div>

          {/* Quick Enforced Bounds Pill Box */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary">Target Router</div>
              <div className="font-semibold text-primary mt-0.5 truncate">ProcurementRouter</div>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary">Approved Recipient</div>
              <div className="font-semibold text-primary mt-0.5 truncate">Acme Components</div>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary">Asset Boundary</div>
              <div className="font-semibold text-primary mt-0.5">Demo USDC (6 dec)</div>
            </div>
            <div className="p-2.5 rounded-lg bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary">Unknown Recipient</div>
              <div className="font-semibold text-danger mt-0.5">HARD BLOCK</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Executions & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Executions (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-primary">Recent Execution Telemetry</h3>
              <span className="text-xs text-secondary font-mono">({data.recentExecutions.length} recorded)</span>
            </div>
            <Link
              href="/executions"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <span>Evidence Vault</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-background font-mono text-[11px] uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Decision</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Destination</th>
                    <th className="px-4 py-3 font-semibold">Capital Moved</th>
                    <th className="px-4 py-3 font-semibold">Transaction</th>
                    <th className="px-4 py-3 font-semibold text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  {data.recentExecutions.map((item) => {
                    const isSuccess = item.decision === "ALLOW";
                    return (
                      <tr key={item.id} className="hover:bg-background/50 transition-colors">
                        {/* Decision */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-success-surface border border-success-border px-2 py-0.5 text-[11px] font-semibold text-success font-mono">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>ALLOW</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-danger-surface border border-danger-border px-2 py-0.5 text-[11px] font-semibold text-danger font-mono">
                              <XCircle className="h-3 w-3" />
                              <span>{item.decision}</span>
                            </span>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono font-semibold tabular-nums text-primary">
                          ${item.amount.toFixed(2)} USDC
                        </td>

                        {/* Destination */}
                        <td className="px-4 py-3 whitespace-nowrap text-secondary font-mono text-[11px]">
                          {item.recipient ? `${item.recipient.slice(0, 6)}...${item.recipient.slice(-4)}` : "—"}
                          {!isSuccess && item.violations && item.violations[0] && (
                            <div className="text-[10px] text-danger font-sans">
                              {item.violations[0].type}
                            </div>
                          )}
                        </td>

                        {/* Capital Moved */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono tabular-nums">
                          {isSuccess ? (
                            <span className="text-primary font-medium">${item.capitalMoved.toFixed(2)}</span>
                          ) : (
                            <span className="text-danger font-bold">$0.00</span>
                          )}
                        </td>

                        {/* Tx Hash */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-secondary">
                          {item.txHash ? `${item.txHash.slice(0, 8)}...` : "—"}
                        </td>

                        {/* Evidence Link */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <Link
                            href={`/executions/${item.id}`}
                            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                            <ArrowUpRight className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Live Audit Activity Events */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-primary">Activity Stream</h3>
            <span className="text-xs text-secondary font-mono">Audit Log</span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 shadow-sm divide-y divide-border">
            {data.recentEvents.map((ev) => (
              <div key={ev.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      ev.type === "ATTACK_REPELLED"
                        ? "bg-danger"
                        : ev.type === "EXECUTION_APPROVED"
                        ? "bg-success"
                        : "bg-accent"
                    }`}
                  />
                  <span className="text-xs font-bold text-primary">{ev.title}</span>
                </div>
                <p className="mt-1 text-xs text-secondary leading-relaxed pl-4">{ev.description}</p>
                <div className="mt-1 text-[10px] font-mono text-secondary pl-4">
                  {new Date(ev.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Sandbox Banner */}
          <div className="rounded-xl border border-accent/20 bg-accent-light p-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-primary">Interactive Attack Sandbox</div>
                <p className="text-xs text-secondary mt-1">
                  Test compromised agent inputs against live onchain contracts.
                </p>
                <Link
                  href="/attack-lab"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  <span>Launch Attack Scenarios</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
