"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Plus,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
  Activity,
} from "lucide-react";

interface AgentItem {
  id: string;
  name: string;
  description: string;
  walletAddress: string;
  status: string;
  policies: Array<{ id: string; name: string; maxPerAction: number; dailyLimit: number }>;
  executions: Array<{ id: string; amount: number; decision: string; createdAt: string }>;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await fetch("/api/v1/agents");
      if (res.ok) {
        const json = await res.json();
        setAgents(json.agents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Autonomous Agents</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              Delegated Authority Registry
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Agents operate autonomously but remain strictly bound inside enforceable cryptographic execution envelopes.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-secondary gap-2 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-accent" />
          <span>Loading agent fleet...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const activePolicy = agent.policies[0];
            return (
              <div key={agent.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-light text-accent">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-primary">{agent.name}</h3>
                      <div className="text-[11px] font-mono text-secondary">
                        {agent.walletAddress.slice(0, 6)}...{agent.walletAddress.slice(-4)}
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full bg-success-surface border border-success-border px-2 py-0.5 text-[10px] font-semibold text-success uppercase">
                    {agent.status}
                  </span>
                </div>

                <p className="text-xs text-secondary leading-relaxed">
                  {agent.description}
                </p>

                {/* Bound Policy Summary */}
                <div className="p-3 rounded-lg bg-background border border-border space-y-1.5 text-xs">
                  <div className="text-[10px] font-mono font-semibold uppercase text-secondary">Active Economic Envelope</div>
                  {activePolicy ? (
                    <div className="space-y-1">
                      <div className="font-bold text-primary">{activePolicy.name}</div>
                      <div className="flex justify-between text-secondary font-mono text-[11px]">
                        <span>Cap: ${activePolicy.maxPerAction} USDC</span>
                        <span>Daily: ${activePolicy.dailyLimit} USDC</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-danger font-medium">No Active Policy Assigned</div>
                  )}
                </div>

                {/* Action button */}
                <div className="pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-[11px] text-secondary font-mono">Authority: Scoped</span>
                  <Link
                    href={`/agents/${agent.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline"
                  >
                    <span>View Specifications</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
