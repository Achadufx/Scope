"use client";

import { useEffect, useState } from "react";
import {
  FileCode2,
  CheckCircle2,
  ExternalLink,
  Copy,
  Layers,
  ShieldCheck,
  RefreshCw,
  Terminal,
} from "lucide-react";
import deployments from "@/lib/blockchain/deployments.json";

interface ContractItem {
  id: string;
  name: string;
  address: string;
  type: string;
  chainId: number;
  abi: string;
  verified: boolean;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await fetch("/api/v1/contracts");
        if (res.ok) {
          const json = await res.json();
          setContracts(json.contracts || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 1500);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Smart Contract Verification</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              EVM Public & Local Registry
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Authoritative onchain firewall bytecode and interfaces deployed to EVM network (Chain ID: {deployments.chainId || 31337}).
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-mono text-secondary">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span>Local Devnet: 127.0.0.1:8545</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-secondary gap-2 text-xs font-mono">
          <RefreshCw className="h-4 w-4 animate-spin text-accent" />
          <span>Fetching verified contracts...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((c) => (
            <div key={c.id} className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border text-primary font-mono font-bold text-xs">
                    SOL
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-primary">{c.name}</h3>
                      <span className="inline-flex items-center gap-1 rounded bg-success-surface border border-success-border px-2 py-0.2 text-[10px] font-semibold text-success font-mono">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>VERIFIED</span>
                      </span>
                    </div>
                    <div className="text-xs text-secondary font-mono mt-0.5">Role: {c.type}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <div className="rounded bg-background border border-border px-2.5 py-1 text-primary">
                    {c.address}
                  </div>
                  <button
                    onClick={() => copyToClipboard(c.address)}
                    className="p-1.5 rounded border border-border bg-surface hover:bg-background text-secondary hover:text-primary transition-colors"
                    title="Copy address"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <a
                    href={`https://etherscan.io/address/${c.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded border border-border bg-surface hover:bg-background text-secondary hover:text-primary transition-colors"
                    title="View on Explorer"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Responsibilities summary */}
              <div className="text-xs text-secondary leading-relaxed font-sans">
                {c.name.includes("Registry") &&
                  "Stores active policy records, calculates deterministic policy hashes, verifies target/asset/merchant whitelists, and emits audit lifecycle events."}
                {c.name.includes("Executor") &&
                  "Authoritative execution firewall. Verifies agent EIP-712 cryptographic signatures, checks nonces, deadlines, per-action caps, rolling daily limits, dispatches atomic target calls, and verifies postconditions."}
                {c.name.includes("USDC") &&
                  "Testnet ERC-20 token with 6 decimals representing Demo USD Coin. Explicitly branded for safe institutional evaluation."}
                {c.name.includes("SafeMerchant") &&
                  "Authorized commercial procurement router representing Acme Components. Fulfills purchase orders and emits delivery events."}
                {c.name.includes("Malicious") &&
                  "Adversarial smart contract representing attacker wallet/phishing clone. Intentionally attempts rogue fund exfiltration and slippage skimming to trigger onchain firewall reverts."}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
