"use client";

import { ExternalLink, ShieldCheck } from "lucide-react";
import AddressPill from "./AddressPill";
import { explorerTxUrl } from "@/lib/blockchain/chain";

/**
 * Honest onchain-telemetry primitives.
 *
 * SCOPE's whole premise is that a blocked action never touches the chain: it
 * reverts in preflight simulation, so there is NO transaction hash, NO block,
 * and NO gas. These components render real receipt data (with a real explorer
 * link) only when a transaction actually exists, and an honest "no transaction"
 * state otherwise. They never invent a hash, a block number, or a gas figure.
 */

interface TxTelemetryProps {
  txHash?: string | null;
  blockNumber?: number | null;
  gasUsed?: number | null;
  /** Heading for the no-transaction state (a real block reverted in preflight). */
  noTxTitle?: string;
  /** Explanation for the no-transaction state. */
  noTxDetail?: string;
  className?: string;
}

/**
 * Full receipt block: Tx Hash / Block / Gas + explorer deep-link when a real
 * transaction exists; an honest "reverted in preflight, $0 gas" panel otherwise.
 */
export function TxTelemetry({
  txHash,
  blockNumber,
  gasUsed,
  noTxTitle = "Reverted in preflight simulation",
  noTxDetail = "No transaction was submitted to the chain — the request reverted during simulation. $0 gas spent, $0 capital exposed.",
  className = "",
}: TxTelemetryProps) {
  const url = explorerTxUrl(txHash);

  if (txHash) {
    return (
      <div className={`space-y-1.5 text-xs font-mono bg-background p-3 rounded-md border border-border ${className}`}>
        <div className="flex justify-between items-center gap-2">
          <span className="text-secondary text-[11px] shrink-0">Tx Hash:</span>
          <AddressPill
            address={txHash}
            truncate
            prefixChars={6}
            suffixChars={4}
            explorerUrl={url ?? undefined}
          />
        </div>
        {blockNumber != null && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-secondary">Block Number:</span>
            <span className="text-primary tabular-nums">#{blockNumber.toLocaleString()}</span>
          </div>
        )}
        {gasUsed != null && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-secondary">Gas Used:</span>
            <span className="text-primary tabular-nums">{gasUsed.toLocaleString()}</span>
          </div>
        )}
        {url && (
          <div className="pt-2 border-t border-border flex justify-end">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline flex items-center gap-1 font-semibold text-xs"
            >
              <span>View on BaseScan</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>
    );
  }

  // No transaction — the boundary was enforced before anything was submitted.
  return (
    <div className={`space-y-1.5 bg-background p-3 rounded-md border border-border ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-success">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>{noTxTitle}</span>
      </div>
      <p className="text-[11px] text-secondary leading-relaxed font-sans">{noTxDetail}</p>
      <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-border">
        <span className="text-secondary">Gas Used:</span>
        <span className="text-primary tabular-nums">0</span>
      </div>
    </div>
  );
}

/**
 * Compact table-cell variant: a copyable pill + explorer link for a real hash,
 * or a muted "no tx" marker when the action was blocked before submission.
 */
export function TxHashCell({ txHash }: { txHash?: string | null }) {
  const url = explorerTxUrl(txHash);

  if (!txHash) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-secondary/70 italic whitespace-nowrap">
        — no tx · blocked in preflight
      </span>
    );
  }

  return (
    <AddressPill
      address={txHash}
      truncate
      prefixChars={6}
      suffixChars={4}
      explorerUrl={url ?? undefined}
    />
  );
}
