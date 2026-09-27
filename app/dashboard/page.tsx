"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ShieldAlert,
  Sliders,
  Bot,
  ArrowUpRight,
  Zap,
  RefreshCw,
} from "lucide-react";
import AddressPill from "@/components/ui/AddressPill";
import StatusBadge from "@/components/ui/StatusBadge";

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
          <RefreshCw className="h-5 w-5 animate-spin text-accent" />
          <span className="text-xs font-mono tracking-tight">Synchronizing execution firewall telemetry...</span>
        </div>
      </div>
    );
  }

  const exposurePercent = Math.min(
    100,
    Math.round((data.atlas.todayExposure / data.atlas.dailyLimit) * 100)
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Command Center</h1>
            <span className="rounded bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent font-mono uppercase tracking-wider border border-accent/20">
              Acme Autonomous Systems
            </span>
          </div>
          <p className="text-xs text-secondary mt-1 tracking-tight">
            Real-time onchain economic boundary monitoring & execution firewall telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/simulator"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary hover:bg-background transition-colors shadow-subtle"
          >
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span>Simulate Action</span>
          </Link>
          <Link
            href="/attack-lab"
            className="inline-flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-surface shadow-subtle hover:bg-danger/90 transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Attack Lab</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Active Agents</span>
            <Bot className="h-3.5 w-3.5 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono tabular-nums tracking-tight">
            {data.metrics.activeAgents}
          </div>
          <div className="mt-1 text-[11px] text-success flex items-center gap-1.5 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
            <span>100% Policy Bound</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Active Policies</span>
            <Sliders className="h-3.5 w-3.5 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono tabular-nums tracking-tight">
            {data.metrics.policies}
          </div>
          <div className="mt-1 text-[11px] text-secondary font-mono">EIP-712 Authorized</div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Actions Today</span>
            <Activity className="h-3.5 w-3.5 text-secondary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary font-mono tabular-nums tracking-tight">
            {data.metrics.actionsToday}
          </div>
          <div className="mt-1 text-[11px] text-secondary font-mono">Atomic Onchain Execution</div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-lg border border-border bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-medium text-secondary uppercase tracking-wider">Attacks Blocked</span>
            <ShieldAlert className="h-3.5 w-3.5 text-danger" />
          </div>
          <div className="mt-2 text-2xl font-bold text-danger font-mono tabular-nums tracking-tight">
            {data.metrics.blocked}
          </div>
          <div className="mt-1 text-[11px] text-danger font-mono font-semibold tabular-nums">
            ${data.metrics.capitalProtected.toLocaleString("en-US", { minimumFractionDigits: 2 })} Saved
          </div>
        </div>
      </div>

      {/* Main Agent Card: Atlas Procurement Agent */}
      <div className="rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent-light text-accent border border-accent/20">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-primary font-sans">{data.atlas.name}</h2>
                <StatusBadge status={data.atlas.status} size="sm" />
                <span className="rounded bg-background border border-border px-1.5 py-0.5 text-[10px] font-medium text-secondary font-mono">
                  {data.atlas.authority}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-secondary">
                <span className="flex items-center gap-1.5">
                  <span className="text-[11px] text-secondary/70">Wallet:</span>
                  <AddressPill address={data.atlas.walletAddress || "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"} />
                </span>
                <span>•</span>
                <span className="text-[11px]">Policy: <strong className="text-primary font-medium">{data.atlas.policyName}</strong></span>
                <span>•</span>
                <span className="text-[11px] font-mono text-secondary">Live telemetry active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/agents/${data.atlas.id || "atlas"}`}
              className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-primary hover:bg-background transition-colors shadow-subtle"
            >
              <span>Agent Spec</span>
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Exposure bar and boundaries */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Exposure bar */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-primary">Daily Rolling Exposure</span>
              <span className="font-mono text-secondary tabular-nums text-xs">
                <strong className="text-primary font-bold">
                  ${data.atlas.todayExposure.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </strong>{" "}
                / ${data.atlas.dailyLimit.toLocaleString("en-US", { minimumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-background border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  exposurePercent > 80 ? "bg-warning" : "bg-accent"
                }`}
                style={{ width: `${exposurePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-secondary font-mono">
              <span>{exposurePercent}% of 24h allocation utilized</span>
              <span>Per-action cap: ${data.atlas.maxPerAction.toFixed(2)} USDC</span>
            </div>
          </div>

          {/* Quick Enforced Bounds Pill Box */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-md bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary tracking-wider">Target Contract</div>
              <div className="font-semibold text-primary mt-0.5 truncate text-[11px]">ProcurementRouter</div>
            </div>
            <div className="p-2.5 rounded-md bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary tracking-wider">Approved Merchant</div>
              <div className="font-semibold text-primary mt-0.5 truncate text-[11px]">Acme Components</div>
            </div>
            <div className="p-2.5 rounded-md bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary tracking-wider">Settlement Asset</div>
              <div className="font-semibold text-primary mt-0.5 text-[11px]">MockUSDC (6 dec)</div>
            </div>
            <div className="p-2.5 rounded-md bg-background border border-border">
              <div className="text-[10px] uppercase font-mono text-secondary tracking-wider">Unknown Recipient</div>
              <div className="font-semibold text-danger mt-0.5 text-[11px]">HARD REVERT</div>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Executions & Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Executions (2/3 width) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-primary">Recent Execution Telemetry</h3>
              <span className="text-[11px] text-secondary font-mono">({data.recentExecutions.length} recorded)</span>
            </div>
            <Link
              href="/executions"
              className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
            >
              <span>Evidence Vault</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-left text-xs">
                <thead className="bg-background font-mono text-[10px] uppercase tracking-wider text-secondary">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Decision</th>
                    <th className="px-3 py-2.5 font-semibold">Amount</th>
                    <th className="px-3 py-2.5 font-semibold">Destination</th>
                    <th className="px-3 py-2.5 font-semibold">Capital Moved</th>
                    <th className="px-3 py-2.5 font-semibold">Transaction</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-sans">
                  {data.recentExecutions.map((item) => {
                    const isSuccess = item.decision === "ALLOW";
                    return (
                      <tr key={item.id} className="hover:bg-background/60 transition-colors group">
                        {/* Decision */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <StatusBadge status={item.decision} size="sm" />
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono font-semibold tabular-nums text-primary text-[11px]">
                          ${item.amount.toFixed(2)} USDC
                        </td>

                        {/* Destination */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <AddressPill address={item.recipient} truncate={true} prefixChars={6} suffixChars={4} />
                          {!isSuccess && item.violations && item.violations[0] && (
                            <div className="text-[10px] text-danger font-mono mt-0.5">
                              {item.violations[0].type}
                            </div>
                          )}
                        </td>

                        {/* Capital Moved */}
                        <td className="px-3 py-2.5 whitespace-nowrap font-mono tabular-nums text-[11px]">
                          {isSuccess ? (
                            <span className="text-primary font-medium">${item.capitalMoved.toFixed(2)}</span>
                          ) : (
                            <span className="text-danger font-bold">$0.00</span>
                          )}
                        </td>

                        {/* Tx Hash */}
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <AddressPill address={item.txHash} truncate={true} prefixChars={6} suffixChars={4} />
                        </td>

                        {/* Evidence Link */}
                        <td className="px-3 py-2.5 whitespace-nowrap text-right">
                          <Link
                            href={`/executions/${item.id}`}
                            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-0.5"
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
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary">Live Activity Stream</h3>
            <span className="text-[10px] text-secondary font-mono uppercase tracking-wider">Audit Log</span>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4 shadow-card divide-y divide-border">
            {data.recentEvents.map((ev) => (
              <div key={ev.id} className="py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      ev.type === "ATTACK_REPELLED"
                        ? "bg-danger"
                        : ev.type === "EXECUTION_APPROVED"
                        ? "bg-success"
                        : "bg-accent"
                    }`}
                  />
                  <span className="text-xs font-bold text-primary">{ev.title}</span>
                </div>
                <p className="mt-1 text-[11px] text-secondary leading-relaxed pl-3.5">{ev.description}</p>
                <div className="mt-1 text-[10px] font-mono text-secondary/70 pl-3.5">
                  {new Date(ev.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Sandbox Banner */}
          <div className="rounded-lg border border-accent/20 bg-accent-light p-3.5">
            <div className="flex items-start gap-3">
              <Zap className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-primary">Interactive Attack Sandbox</div>
                <p className="text-[11px] text-secondary mt-0.5 leading-relaxed">
                  Demonstrate split-screen defense against rogue prompts and supplier poisoning.
                </p>
                <Link
                  href="/attack-lab"
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                >
                  <span>Launch Attack Scenarios</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
