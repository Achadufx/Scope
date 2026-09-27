"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { wagmiConfig } from "@/lib/wallet/config";

/**
 * Client-side providers. WagmiProvider must wrap every component that uses a wallet
 * hook (ConnectWallet in the Navbar, the Policy Builder's authorize flow), so this
 * wraps the whole app in the root layout.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
