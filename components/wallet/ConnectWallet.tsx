"use client";

import { useEffect, useRef, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain, useBalance } from "wagmi";
import { Wallet, ChevronDown, LogOut, ExternalLink, AlertTriangle, Copy, Check } from "lucide-react";
import { scopeChain, explorerAddressUrl } from "@/lib/blockchain/chain";
import deployments from "@/lib/blockchain/deployments.json";

function truncate(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/**
 * The owner's wallet control. Real injected wallet only — connect, wrong-network switch,
 * account menu with balance + explorer link + disconnect. Hydration-safe: renders a stable
 * placeholder until mounted so wagmi's storage read can't cause a mismatch.
 */
export default function ConnectWallet() {
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: isConnecting, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Stable placeholder before hydration.
  if (!mounted) {
    return (
      <div className="h-8 w-[132px] rounded-md border border-border bg-background animate-pulse" aria-hidden />
    );
  }

  const isOwner = !!address && address.toLowerCase() === deployments.demoAccounts.owner.toLowerCase();

  // Not connected → connect.
  if (!isConnected) {
    const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <div className="relative">
        <button
          onClick={() => injectedConnector && connect({ connector: injectedConnector })}
          disabled={isConnecting || !injectedConnector}
          className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-background transition-colors disabled:opacity-60"
        >
          <Wallet className="h-3.5 w-3.5" />
          <span>{isConnecting ? "Connecting…" : "Connect Wallet"}</span>
        </button>
        {connectError && (
          <div className="absolute right-0 mt-1 w-56 rounded-md border border-danger-border bg-danger-surface px-3 py-2 text-[11px] text-danger shadow-lg">
            {connectError.message.includes("No injected") || !injectedConnector
              ? "No wallet detected. Install MetaMask to authorize policies onchain."
              : connectError.message}
          </div>
        )}
      </div>
    );
  }

  // Connected but wrong network → switch.
  if (chainId !== scopeChain.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: scopeChain.id })}
        disabled={isSwitching}
        className="flex items-center gap-1.5 rounded-md border border-danger-border bg-danger-surface px-3 py-1.5 text-xs font-semibold text-danger hover:brightness-95 transition-all disabled:opacity-60"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>{isSwitching ? "Switching…" : `Switch to ${scopeChain.name}`}</span>
      </button>
    );
  }

  // Connected on the right chain → account menu.
  const addrUrl = explorerAddressUrl(address);
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary shadow-sm hover:bg-background transition-colors"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        <span className="font-mono">{truncate(address)}</span>
        {isOwner && (
          <span className="hidden sm:inline rounded bg-accent-light px-1 py-0.5 text-[9px] font-semibold text-accent uppercase">
            Owner
          </span>
        )}
        <ChevronDown className="h-3 w-3 text-secondary" />
      </button>

      {menuOpen && (
        <div className="absolute right-0 mt-1.5 w-64 rounded-lg border border-border bg-surface p-1 shadow-xl z-50">
          <div className="px-3 py-2.5 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary">
                {isOwner ? "Policy Owner" : "Connected"}
              </span>
              <span className="text-[10px] font-mono text-success">{scopeChain.name}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-primary truncate">{truncate(address)}</span>
              <button
                onClick={() => {
                  if (address) {
                    navigator.clipboard?.writeText(address);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1200);
                  }
                }}
                className="text-secondary hover:text-primary shrink-0"
                title="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            {balance && (
              <div className="mt-1 text-[11px] text-secondary tabular-nums">
                {parseFloat(balance.formatted).toFixed(4)} {balance.symbol}
              </div>
            )}
          </div>

          {addrUrl && (
            <a
              href={addrUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-primary hover:bg-background transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 text-secondary" />
              <span>View on BaseScan</span>
            </a>
          )}
          <button
            onClick={() => {
              disconnect();
              setMenuOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-danger hover:bg-danger-surface transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      )}
    </div>
  );
}
