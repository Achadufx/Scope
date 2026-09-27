"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

interface AddressPillProps {
  address: string;
  label?: string;
  truncate?: boolean;
  prefixChars?: number;
  suffixChars?: number;
  copyable?: boolean;
  explorerUrl?: string;
  className?: string;
}

export default function AddressPill({
  address,
  label,
  truncate = true,
  prefixChars = 6,
  suffixChars = 4,
  copyable = true,
  explorerUrl,
  className = "",
}: AddressPillProps) {
  const [copied, setCopied] = useState(false);

  const formatted =
    truncate && address && address.length > prefixChars + suffixChars
      ? `${address.slice(0, prefixChars)}...${address.slice(-suffixChars)}`
      : address;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-background/80 hover:bg-background text-secondary hover:text-primary transition-colors text-[11px] font-mono select-none group ${className}`}
      title={address}
    >
      {label && <span className="font-sans font-medium text-primary mr-0.5">{label}</span>}
      <span className="tabular-nums tracking-tight">{formatted}</span>

      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-0.5 text-secondary hover:text-primary transition-colors relative"
          title="Copy address"
        >
          {copied ? (
            <span className="flex items-center gap-1 text-success text-[10px] font-sans font-medium">
              <Check className="h-3 w-3 text-success animate-in zoom-in-50 duration-150" />
              <span className="hidden sm:inline">Copied</span>
            </span>
          ) : (
            <Copy className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      )}

      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-0.5 text-secondary hover:text-accent transition-colors"
          title="View on block explorer"
        >
          <ExternalLink className="h-3 w-3 opacity-60 hover:opacity-100" />
        </a>
      )}
    </div>
  );
}
