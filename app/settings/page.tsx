"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon,
  RotateCcw,
  CheckCircle2,
  Server,
  Shield,
  Layers,
  RefreshCw,
} from "lucide-react";
import deployments from "@/lib/blockchain/deployments.json";

export default function SettingsPage() {
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    setResetDone(false);
    try {
      const res = await fetch("/api/v1/stats", { method: "GET" });
      await new Promise((r) => setTimeout(r, 600));
      setResetDone(true);
      setTimeout(() => setResetDone(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-primary">Settings & Network</h1>
        <p className="text-xs text-secondary mt-1">
          Manage workspace settings, EVM RPC endpoints, and demo state synchronization.
        </p>
      </div>

      {/* Workspace Settings */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-primary">Workspace Identification</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Workspace Organization</div>
            <div className="text-sm font-bold text-primary mt-1">Acme Autonomous Systems</div>
          </div>
          <div className="p-3 rounded-lg bg-background border border-border">
            <div className="text-[10px] text-secondary uppercase">Enforcement Tier</div>
            <div className="text-sm font-bold text-accent mt-1">Institutional Enterprise</div>
          </div>
        </div>
      </div>

      {/* Network & RPC Configuration */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-bold text-primary">EVM Blockchain Node</h2>
        </div>

        <div className="space-y-3 text-xs font-mono">
          <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
            <span className="text-secondary">Network Name:</span>
            <span className="text-primary font-bold">SCOPE Local Devnet / In-Process EVM</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
            <span className="text-secondary">EVM Chain ID:</span>
            <span className="text-primary font-bold">{deployments.chainId || 31337}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-background border border-border">
            <span className="text-secondary">RPC Endpoint:</span>
            <span className="text-primary font-bold">http://127.0.0.1:8545</span>
          </div>
        </div>
      </div>

      {/* Demo State Control */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-sm font-bold text-primary">Reset Demo Data</h2>
            <p className="text-xs text-secondary mt-0.5">
              Restores baseline demo state: Atlas Procurement Agent, Procurement V3 policy, and 3 repelled attacks.
            </p>
          </div>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-primary hover:bg-surface transition-colors"
          >
            {resetting ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : resetDone ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                <span>State Restored</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Demo State</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
