import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { scopeChain } from "@/lib/blockchain/chain";

/**
 * wagmi config for SCOPE's hybrid-wallet model.
 *
 * The OWNER connects a real injected wallet (MetaMask) here and authorizes policies
 * onchain (createPolicy on ScopePolicyRegistry). The AGENT never uses this — it signs
 * its ExecutionRequest programmatically (EIP-712, gasless) server-side, and the funded
 * relayer submits. So the browser only ever needs the injected connector.
 *
 * Chain is env-driven via lib/blockchain/chain.ts (Base Sepolia by default).
 */
export const wagmiConfig = createConfig({
  chains: [scopeChain],
  connectors: [injected({ shimDisconnect: true })],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [scopeChain.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
