"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  Sliders,
  Plus,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Wallet,
} from "lucide-react";
import AddressPill from "@/components/ui/AddressPill";
import StatusBadge from "@/components/ui/StatusBadge";
import Drawer from "@/components/ui/Drawer";
import CustomSelect from "@/components/ui/CustomSelect";
import EmptyState from "@/components/ui/EmptyState";
import ConnectWallet from "@/components/wallet/ConnectWallet";
import deployments from "@/lib/blockchain/deployments.json";
import { explorerTxUrl, scopeChain } from "@/lib/blockchain/chain";
import { useAuthorizePolicy, type AuthorizeStatus } from "@/lib/wallet/useAuthorizePolicy";

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

// Onchain directory — the deployed, allowlistable entities. createPolicy takes real
// addresses (deny-by-default), so the builder works from these, never free text.
const DIRECTORY = {
  asset: { address: deployments.contracts.MockUSDC, name: "Demo USDC", symbol: "USDC" },
  targets: [
    { address: deployments.contracts.SafeMerchant, name: "ProcurementRouter", tag: "Safe" },
    { address: deployments.contracts.MaliciousMerchant, name: "MaliciousMerchant", tag: "Honeypot" },
  ],
  recipients: [
    { address: deployments.demoAccounts.supplier, name: "Acme Components", tag: "Safe supplier" },
    { address: deployments.contracts.MaliciousMerchant, name: "MaliciousMerchant", tag: "Honeypot" },
  ],
};

const STATUS_COPY: Record<Exclude<AuthorizeStatus, "idle" | "done" | "error">, { title: string; detail: string }> = {
  signing: {
    title: "Confirm in your wallet",
    detail: "Sign the createPolicy transaction. This registers the execution envelope onchain — you pay the gas.",
  },
  confirming: {
    title: "Confirming on " + scopeChain.name,
    detail: "Transaction submitted. Waiting for it to be mined and the policy activated in the registry.",
  },
  reading: {
    title: "Reading authorized policyHash",
    detail: "Fetching the authoritative bytes32 policyHash back from ScopePolicyRegistry — never fabricated.",
  },
  persisting: {
    title: "Recording authorization",
    detail: "Saving the real onchain policyHash so the control plane mirrors the chain.",
  },
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);

  const { isConnected, chainId, address } = useAccount();
  const { authorize, reset, status, error, txHash, policyHash } = useAuthorizePolicy();

  // Form state
  const [policyName, setPolicyName] = useState("Procurement V3");
  const [maxPerAction, setMaxPerAction] = useState("500");
  const [dailyLimit, setDailyLimit] = useState("2000");
  const [selectedTargets, setSelectedTargets] = useState<string[]>(DIRECTORY.targets.map((t) => t.address));
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>(DIRECTORY.recipients.map((r) => r.address));
  const [timeWindow, setTimeWindow] = useState("08:00 - 18:00 UTC");
  const [unknownRecipientAction, setUnknownRecipientAction] = useState("BLOCK");
  const [outcomeRequirement, setOutcomeRequirement] = useState("MIN_TOKEN_RECEIVED (Slippage max 0.5%)");

  const [resolvedAgent, setResolvedAgent] = useState<{ id: string; walletAddress: string } | null>(null);

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/v1/policies");
      if (res.ok) {
        const json = await res.json();
        const list: PolicyItem[] = json.policies || [];
        setPolicies(list);
        if (list[0]?.agent) {
          setResolvedAgent({ id: list[0].agent.id, walletAddress: list[0].agent.walletAddress });
        }
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

  // Ensure we have a real agent id/address even before any policy exists.
  useEffect(() => {
    if (resolvedAgent) return;
    (async () => {
      try {
        const res = await fetch("/api/v1/agents");
        if (res.ok) {
          const json = await res.json();
          const agents = json.agents || [];
          const atlas = agents.find((a: any) => /atlas/i.test(a.name)) || agents[0];
          if (atlas) setResolvedAgent({ id: atlas.id, walletAddress: atlas.walletAddress });
        }
      } catch {
        /* non-fatal */
      }
    })();
  }, [resolvedAgent]);

  const toggle = (list: string[], setList: (v: string[]) => void, addr: string) => {
    setList(list.includes(addr) ? list.filter((a) => a !== addr) : [...list, addr]);
  };

  const wrongNetwork = isConnected && chainId !== scopeChain.id;
  const canAuthorize =
    isConnected &&
    !wrongNetwork &&
    !!resolvedAgent &&
    selectedTargets.length > 0 &&
    selectedRecipients.length > 0 &&
    parseFloat(maxPerAction) > 0 &&
    parseFloat(dailyLimit) > 0;

  const busy = status === "signing" || status === "confirming" || status === "reading" || status === "persisting";

  const handleAuthorize = async () => {
    if (!resolvedAgent) return;
    const result = await authorize({
      agentId: resolvedAgent.id,
      agentAddress: resolvedAgent.walletAddress || deployments.demoAccounts.agent,
      name: policyName,
      allowedTargets: selectedTargets,
      allowedAssets: [DIRECTORY.asset.address],
      allowedRecipients: selectedRecipients,
      maxPerAction,
      dailyLimit,
      timeWindow,
      minOutput: outcomeRequirement,
    });
    if (result) {
      await fetchPolicies();
    }
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    reset();
  };

  const recipientActionOptions = [
    { value: "BLOCK", label: "HARD REVERT (Atomic onchain revert)", description: "Transactions to unknown addresses instantly revert" },
    { value: "HUMAN_APPROVAL", label: "Require Human Multisig", description: "Escalate to admin wallet for co-signature" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary font-sans">Execution Policies</h1>
            <span className="rounded bg-accent-light px-2 py-0.5 text-[10px] font-semibold text-accent font-mono uppercase tracking-wider border border-accent/20">
              Onchain Registry
            </span>
          </div>
          <p className="text-xs text-secondary mt-1 tracking-tight">
            Define, authorize, and enforce cryptographic economic boundaries for autonomous agents.
          </p>
        </div>

        <button
          onClick={() => setShowDrawer(true)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-semibold text-surface shadow-subtle hover:bg-primary-hover transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Policy</span>
        </button>
      </div>

      {/* Policies List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-secondary gap-2 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-accent" />
          <span>Syncing policy registry...</span>
        </div>
      ) : policies.length === 0 ? (
        <EmptyState
          icon={Sliders}
          title="No execution policies registered"
          description="Register an economic execution envelope to grant an autonomous agent delegated authority."
          action={{
            label: "Create Policy Envelope",
            onClick: () => setShowDrawer(true),
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {policies.map((p) => (
            <div key={p.id} className="rounded-lg border border-border bg-surface p-5 shadow-card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-primary font-sans">{p.name}</h3>
                    <StatusBadge status={p.active ? "ACTIVE" : "PAUSED"} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-secondary">
                    <span>Agent: <strong className="text-primary font-medium">{p.agent?.name}</strong></span>
                    <span>•</span>
                    <AddressPill address={p.agent?.walletAddress} truncate={true} prefixChars={6} suffixChars={4} />
                  </div>
                </div>

                <div className="text-right">
                  <AddressPill
                    address={p.policyHash}
                    label="Hash:"
                    truncate={true}
                    prefixChars={6}
                    suffixChars={4}
                  />
                  <div className="text-[10px] font-mono text-accent mt-0.5">{p.active ? "Active onchain" : "Retired"}</div>
                </div>
              </div>

              {/* Policy Limits strip */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md bg-background border border-border">
                <div>
                  <div className="text-[10px] uppercase font-mono text-secondary tracking-wider">Max Per Action</div>
                  <div className="text-base font-bold text-primary font-mono tabular-nums">
                    ${p.maxPerAction.toFixed(2)} USDC
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-mono text-secondary tracking-wider">Daily Ceiling (24h)</div>
                  <div className="text-base font-bold text-primary font-mono tabular-nums">
                    ${p.dailyLimit.toFixed(2)} USDC
                  </div>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5 text-xs">
                <div className="text-[10px] font-mono font-semibold uppercase tracking-wider text-secondary">Enforced Boundary Rules</div>
                <div className="flex flex-wrap gap-1.5">
                  {p.rules.map((rule) => (
                    <span
                      key={rule.id}
                      className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] font-mono text-primary"
                    >
                      <span className="text-secondary">{rule.type}:</span>
                      <span className="font-medium truncate max-w-[150px]">{rule.value}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-secondary">
                <span className="text-[11px]">Valid until: {new Date(p.validUntil).toLocaleDateString()}</span>
                <Link
                  href="/simulator"
                  className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
                >
                  <span>Simulate Policy</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Slide-over Policy Builder Drawer */}
      <Drawer
        isOpen={showDrawer}
        onClose={closeDrawer}
        title="Create Economic Execution Policy"
        subtitle="Define machine-enforceable boundaries, then authorize them onchain with your wallet."
        width="xl"
      >
        {busy ? (
          <div className="py-16 text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-accent mx-auto" />
            <h3 className="text-base font-bold text-primary font-sans">
              {STATUS_COPY[status as keyof typeof STATUS_COPY]?.title}
            </h3>
            <p className="text-xs text-secondary max-w-sm mx-auto leading-relaxed">
              {STATUS_COPY[status as keyof typeof STATUS_COPY]?.detail}
            </p>
            <div className="inline-block rounded-md bg-background p-3 font-mono text-xs text-secondary border border-border text-left space-y-1">
              <div>registry: {deployments.contracts.ScopePolicyRegistry.slice(0, 14)}…</div>
              <div>fn: createPolicy(agent, targets[], assets[], recipients[], …)</div>
              <div>maxPerAction: {maxPerAction} USDC · dailyLimit: {dailyLimit} USDC</div>
              {txHash && (
                <div className="pt-1 border-t border-border">
                  tx: {txHash.slice(0, 18)}… ({status === "confirming" ? "pending" : "mined"})
                </div>
              )}
            </div>
          </div>
        ) : status === "done" ? (
          <div className="py-14 text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
            <h3 className="text-base font-bold text-primary font-sans">Policy Authorized Onchain</h3>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              The execution envelope is registered and active in ScopePolicyRegistry. The agent can now only act
              within these boundaries — anything outside reverts.
            </p>
            <div className="mx-auto max-w-md rounded-md border border-border bg-background p-4 text-left space-y-2.5 font-mono text-[11px]">
              <div>
                <div className="text-secondary mb-0.5">Authoritative policyHash</div>
                <div className="text-primary break-all">{policyHash}</div>
              </div>
              <div className="pt-2 border-t border-border">
                <div className="text-secondary mb-0.5">Authorization tx</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-primary break-all">{txHash?.slice(0, 26)}…</span>
                  {explorerTxUrl(txHash) && (
                    <a
                      href={explorerTxUrl(txHash)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1 shrink-0 font-sans font-semibold"
                    >
                      BaseScan <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-surface hover:bg-primary-hover transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Form Fields */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-primary block mb-1">Policy Identifier</label>
                <input
                  type="text"
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-medium focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-primary block mb-1">Max Per Action (Cap)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-secondary font-mono">$</span>
                    <input
                      type="number"
                      value={maxPerAction}
                      onChange={(e) => setMaxPerAction(e.target.value)}
                      className="w-full rounded-md border border-border bg-background pl-6 pr-3 py-2 text-primary font-mono tabular-nums focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-primary block mb-1">Daily Ceiling (24h)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-secondary font-mono">$</span>
                    <input
                      type="number"
                      value={dailyLimit}
                      onChange={(e) => setDailyLimit(e.target.value)}
                      className="w-full rounded-md border border-border bg-background pl-6 pr-3 py-2 text-primary font-mono tabular-nums focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Settlement asset — fixed, deny-by-default on everything else */}
              <div>
                <label className="font-semibold text-primary block mb-1">Allowed Settlement Asset</label>
                <div className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                  <span className="font-mono text-primary">{DIRECTORY.asset.name} ({DIRECTORY.asset.symbol})</span>
                  <AddressPill address={DIRECTORY.asset.address} truncate prefixChars={6} suffixChars={4} />
                </div>
              </div>

              {/* Targets */}
              <div>
                <label className="font-semibold text-primary block mb-1">Approved Contract Targets</label>
                <div className="space-y-1.5">
                  {DIRECTORY.targets.map((t) => {
                    const on = selectedTargets.includes(t.address);
                    return (
                      <button
                        type="button"
                        key={"t-" + t.address}
                        onClick={() => toggle(selectedTargets, setSelectedTargets, t.address)}
                        className={`w-full flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
                          on ? "border-accent bg-accent-light" : "border-border bg-background hover:border-secondary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${on ? "bg-accent border-accent" : "border-secondary"}`}>
                            {on && <CheckCircle2 className="h-3 w-3 text-surface" />}
                          </span>
                          <span className="font-mono text-primary">{t.name}</span>
                          <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${t.tag === "Honeypot" ? "bg-danger-surface text-danger" : "bg-success-surface text-success"}`}>
                            {t.tag}
                          </span>
                        </span>
                        <AddressPill address={t.address} truncate prefixChars={6} suffixChars={4} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="font-semibold text-primary block mb-1">Approved Recipients (Merchants)</label>
                <div className="space-y-1.5">
                  {DIRECTORY.recipients.map((r) => {
                    const on = selectedRecipients.includes(r.address);
                    return (
                      <button
                        type="button"
                        key={"r-" + r.address}
                        onClick={() => toggle(selectedRecipients, setSelectedRecipients, r.address)}
                        className={`w-full flex items-center justify-between rounded-md border px-3 py-2 transition-colors ${
                          on ? "border-accent bg-accent-light" : "border-border bg-background hover:border-secondary"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`h-3.5 w-3.5 rounded-sm border flex items-center justify-center ${on ? "bg-accent border-accent" : "border-secondary"}`}>
                            {on && <CheckCircle2 className="h-3 w-3 text-surface" />}
                          </span>
                          <span className="font-mono text-primary">{r.name}</span>
                          <span className={`rounded px-1 py-0.5 text-[9px] font-semibold uppercase ${r.tag === "Honeypot" ? "bg-danger-surface text-danger" : "bg-success-surface text-success"}`}>
                            {r.tag}
                          </span>
                        </span>
                        <AddressPill address={r.address} truncate prefixChars={6} suffixChars={4} />
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-secondary leading-relaxed">
                  The honeypot is deliberately allowlisted to prove allowlisting is necessary but{" "}
                  <strong className="text-primary">not sufficient</strong> — the onchain postcondition still catches the
                  slippage drain.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-primary block mb-1">
                    Operational Hours (UTC)
                    <span className="ml-1 font-normal text-secondary lowercase">offchain gateway</span>
                  </label>
                  <input
                    type="text"
                    value={timeWindow}
                    onChange={(e) => setTimeWindow(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-primary block mb-1">Unknown Recipient Action</label>
                  <CustomSelect
                    options={recipientActionOptions}
                    value={unknownRecipientAction}
                    onChange={setUnknownRecipientAction}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-primary block mb-1">Postcondition Outcome Assertion</label>
                <input
                  type="text"
                  value={outcomeRequirement}
                  onChange={(e) => setOutcomeRequirement(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-primary font-mono focus:ring-1 focus:ring-accent focus:border-accent shadow-subtle focus:outline-none"
                />
              </div>
            </div>

            {/* Live Policy Preview Summary */}
            <div className="rounded-md border border-border bg-background p-4 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-primary border-b border-border pb-2">
                <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                <span>Live Envelope Preview</span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-secondary">Per-Action Cap:</span>
                  <span className="font-mono font-bold text-primary tabular-nums">${maxPerAction} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Daily Ceiling:</span>
                  <span className="font-mono font-bold text-primary tabular-nums">${dailyLimit} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Allowed Targets / Recipients:</span>
                  <span className="font-mono text-primary">{selectedTargets.length} / {selectedRecipients.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Unknown Recipient:</span>
                  <span className="font-bold text-danger font-mono">{unknownRecipientAction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary">Operational Hours:</span>
                  <span className="font-mono text-primary">{timeWindow}</span>
                </div>
              </div>
            </div>

            {/* Error surface */}
            {status === "error" && error && (
              <div className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-surface px-3 py-2.5 text-[11px] text-danger">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            {/* Wallet gating + action buttons */}
            {!isConnected ? (
              <div className="rounded-md border border-border bg-background p-4 text-center space-y-3">
                <Wallet className="h-6 w-6 text-secondary mx-auto" />
                <p className="text-xs text-secondary max-w-xs mx-auto leading-relaxed">
                  Connect the owner wallet to authorize this policy onchain. The owner signs and pays gas on{" "}
                  {scopeChain.name}.
                </p>
                <div className="flex justify-center">
                  <ConnectWallet />
                </div>
              </div>
            ) : wrongNetwork ? (
              <div className="rounded-md border border-danger-border bg-danger-surface p-4 text-center space-y-3">
                <p className="text-xs text-danger">Your wallet is on the wrong network. Switch to {scopeChain.name} to authorize.</p>
                <div className="flex justify-center">
                  <ConnectWallet />
                </div>
              </div>
            ) : (
              <div className="pt-2 flex items-center justify-between gap-3">
                <span className="text-[10px] text-secondary font-mono truncate">
                  Owner: {address?.slice(0, 10)}… · pays gas
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-md border border-border bg-surface px-3 py-2 text-xs font-semibold text-secondary hover:text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAuthorize}
                    disabled={!canAuthorize}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-surface shadow-subtle hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span>Authorize Onchain</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
