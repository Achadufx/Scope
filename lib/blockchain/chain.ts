import { createPublicClient, http, defineChain, type Chain } from "viem";
import { baseSepolia, sepolia } from "viem/chains";

/**
 * Single source of truth for which chain SCOPE targets.
 * Driven by env so the same code runs against Base Sepolia (demo/prod)
 * or a local Hardhat node (offline dev) without edits.
 */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "84532");

const PUBLIC_RPC =
  process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

// Server-side RPC may be a private provider URL; falls back to the public one.
const SERVER_RPC = process.env.RPC_URL || PUBLIC_RPC;

export const EXPLORER_URL = (
  process.env.NEXT_PUBLIC_EXPLORER_URL || "https://sepolia.basescan.org"
).replace(/\/$/, "");

const localDevnet = defineChain({
  id: 31337,
  name: "SCOPE Local Devnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [PUBLIC_RPC] } },
});

/** Resolve the viem Chain object for the configured CHAIN_ID. */
export function resolveChain(): Chain {
  switch (CHAIN_ID) {
    case baseSepolia.id:
      return baseSepolia;
    case sepolia.id:
      return sepolia;
    case 31337:
      return localDevnet;
    default:
      // Unknown chain: build a minimal definition from env.
      return defineChain({
        id: CHAIN_ID,
        name: `Chain ${CHAIN_ID}`,
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [PUBLIC_RPC] } },
      });
  }
}

export const scopeChain = resolveChain();

/** Public (read + simulate) client. Browser and server safe. */
export function getPublicClient() {
  return createPublicClient({
    chain: scopeChain,
    transport: http(typeof window === "undefined" ? SERVER_RPC : PUBLIC_RPC),
  });
}

export const isLocalChain = CHAIN_ID === 31337;

/** Block-explorer deep links. Returns null on a chain with no explorer (local). */
export function explorerTxUrl(hash?: string | null): string | null {
  if (!hash || isLocalChain) return null;
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function explorerAddressUrl(address?: string | null): string | null {
  if (!address || isLocalChain) return null;
  return `${EXPLORER_URL}/address/${address}`;
}
