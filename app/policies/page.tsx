"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sliders,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  FileCode2,
  Lock,
  X,
  RefreshCw,
  Cpu,
} from "lucide-react";

interface PolicyItem {
  id: string;
  name: string;
  owner: string;
  maxPerAction: number;
  dailyLimit: number;
  validAfter: string;
  validUntil: string;
  active: boolean;
  policyHash: string;
  agent: { id: string; name: string; walletAddress: string };
  rules: Array<{ id: string; type: string; value: string; metadata?: string }>;
  _count?: { executions: number };
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const [authStep, setAuthStep] = useState<"FORM" | "SIGNING" | "CONFIRMED">("FORM");

  // Form State
  const [policyName, setPolicyName] = useState("Procurement V3");
  const [maxPerAction, setMaxPerAction] = useState("500");
  const [dailyLimit, setDailyLimit] = useState("2000");
  const [allowedAsset, setAllowedAsset] = useState("Demo USDC (0x5FbD...0aa3)");
  const [approvedRecipients, setApprovedRecipients] = useState("Acme Components, Northstar Supplies");
  const [approvedContracts, setApprovedContracts] = useState("ProcurementRouter (0xCf7E...0Fc9)");
  const [timeWindow, setTimeWindow] = useState("08:00 - 18:00 UTC");
  const [unknownRecipientAction, setUnknownRecipientAction] = useState("BLOCK");
  const [outcomeRequirement, setOutcomeRequirement] = useState("MIN_TOKEN_RECEIVED (Slippage max 0.5%)");

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/v1/policies");
      if (res.ok) {
        const json = await res.json();
        setPolicies(json.policies || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleAuthorize = async () => {
    setAuthStep("SIGNING");
    setAuthorizing(true);

    // Simulate EIP-712 signature timing
    await new Promise((r) => setTimeout(r, 900));

    try {
      const res = await fetch("/api/v1/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: policies[0]?.agent?.id || "atlas",
          name: policyName,
          maxPerAction: parseFloat(maxPerAction),
          dailyLimit: parseFloat(dailyLimit),
          timeWindow,
          minOutput: outcomeRequirement,
        }),
      });

      if (res.ok) {
        setAuthStep("CONFIRMED");
        await fetchPolicies();
        setTimeout(() => {
          setShowBuilder(false);
          setAuthStep("FORM");
          setAuthorizing(false);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      setAuthStep("FORM");
      setAuthorizing(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Execution Policies</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              Onchain Cryptographic Envelopes
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Define, authorize, and verify machine-enforced economic constraints for autonomous agents.
          </p>
        </div>

        <button
          onClick={() => setShowBuilder(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-surface shadow hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Policy</span>
        </button>
      </div>

      {/* Policies List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-secondary gap-2 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-accent" />
          <span>Loading execution policies...</span>
        </div>
      ) : policies.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center space-y-3">
          <Sliders className="h-8 w-8 text-secondary mx-auto" />
          <h3 className="text-sm font-bold text-primary">No policies yet.</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            Create an execution policy to give your first agent scoped autonomy.
          </p>
          <button
            onClick={() => setShowBuilder(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-surface"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Policy</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {policies.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-primary">{p.name}</h3>
                    <span className="rounded-full bg-success-surface border border-success-border px-2 py-0.2 text-[10px] font-semibold text-success uppercase">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-xs text-secondary font-mono mt-1">
                    Agent: <strong className="text-primary">{p.agent?.name}</strong> ({p.agent?.walletAddress?.slice(0, 6)}...{p.agent?.walletAddress?.slice(-4)})
                  </div>
                </div>

                <div className="text-right font-mono text-[11px] text-secondary">
                  <div>Hash: {p.policyHash.slice(0, 10)}...</div>
                  <div className="text-[10px] text-accent">EIP-712 Verified</div>
                </div>
              </div>

              {/* Policy Limits strip */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-[10px] uppercase font-mono text-secondary">Max Per Action</div>
                  <div className="text-lg font-bold text-primary font-mono tabular-nums">
                    ${p.maxPerAction.toFixed(2)} USDC
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-secondary">Daily Limit (24h)</div>
                  <div className="text-lg font-bold text-primary font-mono tabular-nums">
                    ${p.dailyLimit.toFixed(2)} USDC
                  </div>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5 text-xs">
                <div className="text-[11px] font-mono font-semibold uppercase text-secondary">Enforced Rules</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.rules.map((rule) => (
                    <span
                      key={rule.id}
                      className="inline-flex items-center gap-1 rounded bg-background border border-border px-2 py-1 text-[11px] font-mono text-primary"
                    >
                      <span className="text-secondary">{rule.type}:</span>
                      <span className="font-semibold truncate max-w-[150px]">{rule.value}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-secondary">
                <span>Valid until: {new Date(p.validUntil).toLocaleDateString()}</span>
                <Link
                  href="/simulator"
                  className="text-accent font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <span>Test Policy</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Policy Builder Modal / Drawer */}
      {showBuilder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-surface border border-border shadow-xl p-6 sm:p-8 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-bold text-primary">Define what Atlas is allowed to do</h2>
                <p className="text-xs text-secondary">
                  Construct economic execution boundary. Requires EIP-712 typed signature to authorize.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBuilder(false);
                  setAuthStep("FORM");
                }}
                className="p-1 rounded-md text-secondary hover:text-primary hover:bg-background"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {authStep === "SIGNING" ? (
              <div className="py-16 text-center space-y-4">
                <RefreshCw className="h-8 w-8 animate-spin text-accent mx-auto" />
                <h3 className="text-base font-bold text-primary">Requesting EIP-712 Authorization...</h3>
                <p className="text-xs text-secondary max-w-md mx-auto">
                  Owner is signing typed structured data hash with verifying contract address and policy bounds.
                </p>
                <div className="inline-block rounded-lg bg-background p-3 font-mono text-xs text-secondary border border-border text-left">
                  <div>PrimaryType: Policy</div>
                  <div>maxPerAction: ${maxPerAction} USDC</div>
                  <div>dailyLimit: ${dailyLimit} USDC</div>
                  <div>agent: 0x7099...79C8</div>
                </div>
              </div>
            ) : authStep === "CONFIRMED" ? (
              <div className="py-16 text-center space-y-4">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
                <h3 className="text-lg font-bold text-primary">Policy Authorized Onchain</h3>
                <p className="text-xs text-secondary">
                  Cryptographic execution boundary registered in ScopePolicyRegistry.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Form Controls */}
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold text-primary block mb-1">Policy Name</label>
                    <input
                      type="text"
                      value={policyName}
                      onChange={(e) => setPolicyName(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-medium focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-primary block mb-1">Maximum Per Action</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-secondary font-mono">$</span>
                        <input
                          type="number"
                          value={maxPerAction}
                          onChange={(e) => setMaxPerAction(e.target.value)}
                          className="w-full rounded-md border border-border bg-background pl-6 pr-3 py-2 text-primary font-mono tabular-nums focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="font-semibold text-primary block mb-1">Daily Limit (24h)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-secondary font-mono">$</span>
                        <input
                          type="number"
                          value={dailyLimit}
                          onChange={(e) => setDailyLimit(e.target.value)}
                          className="w-full rounded-md border border-border bg-background pl-6 pr-3 py-2 text-primary font-mono tabular-nums focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-primary block mb-1">Allowed Assets</label>
                    <input
                      type="text"
                      value={allowedAsset}
                      onChange={(e) => setAllowedAsset(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-primary block mb-1">Approved Recipients (Merchants)</label>
                    <input
                      type="text"
                      value={approvedRecipients}
                      onChange={(e) => setApprovedRecipients(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-primary block mb-1">Approved Contracts (Routers)</label>
                    <input
                      type="text"
                      value={approvedContracts}
                      onChange={(e) => setApprovedContracts(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-primary block mb-1">Operational Hours</label>
                      <input
                        type="text"
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-primary block mb-1">Unknown Recipient Action</label>
                      <select
                        value={unknownRecipientAction}
                        onChange={(e) => setUnknownRecipientAction(e.target.value)}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-danger font-semibold focus:border-accent focus:outline-none"
                      >
                        <option value="BLOCK">HARD BLOCK (Revert onchain)</option>
                        <option value="HUMAN_APPROVAL">Require Human Multisig</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-primary block mb-1">Supported Outcome Requirement</label>
                    <input
                      type="text"
                      value={outcomeRequirement}
                      onChange={(e) => setOutcomeRequirement(e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>

                {/* Live Policy Summary Beside Form */}
                <div className="rounded-xl border border-border bg-background p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center gap-2 border-b border-border pb-3">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      <span className="text-xs font-mono font-bold uppercase text-primary">Live Policy Summary</span>
                    </div>

                    <div className="mt-4 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-secondary">Target Agent:</span>
                        <span className="font-semibold text-primary">Atlas Procurement Agent</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Per-Action Cap:</span>
                        <span className="font-mono font-bold text-primary tabular-nums">${maxPerAction}.00 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Daily Ceiling:</span>
                        <span className="font-mono font-bold text-primary tabular-nums">${dailyLimit}.00 USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Unknown Recipient:</span>
                        <span className="font-bold text-danger">{unknownRecipientAction}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Operational Hours:</span>
                        <span className="font-mono text-primary">{timeWindow}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-secondary">Postcondition Guard:</span>
                        <span className="font-mono text-primary text-[11px] truncate max-w-[160px]">{outcomeRequirement}</span>
                      </div>
                    </div>
                  </div>

                  {/* Authorization Box */}
                  <div className="space-y-3 pt-4 border-t border-border">
                    <div className="text-[11px] text-secondary">
                      Requires EIP-712 structured cryptographic authorization from owner account.
                    </div>
                    <button
                      onClick={handleAuthorize}
                      disabled={authorizing}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-surface shadow hover:bg-accent-hover transition-colors"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Authorize Policy</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
