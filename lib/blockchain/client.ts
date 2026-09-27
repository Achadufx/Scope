import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import deployments from "./deployments.json";
import { scopeChain, CHAIN_ID } from "./chain";
import { ScopeExecutorABI, ScopePolicyRegistryABI, MockUSDCABI } from "./abis";

const SERVER_RPC =
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

function normalizeKey(k?: string): `0x${string}` | undefined {
  if (!k) return undefined;
  const t = k.trim();
  return (t.startsWith("0x") ? t : `0x${t}`) as `0x${string}`;
}

/**
 * Relayer = the funded deployer wallet. It submits execution transactions
 * on-chain (and pays gas). This is a server-only account — never exposed to
 * the browser. The agent authorizes via an EIP-712 signature; the relayer
 * merely forwards that signed request to ScopeExecutor.execute().
 */
export function getRelayerAccount() {
  const pk = normalizeKey(process.env.DEPLOYER_PRIVATE_KEY);
  if (!pk) throw new Error("DEPLOYER_PRIVATE_KEY is not set in the environment.");
  return privateKeyToAccount(pk);
}

export function getRelayerWalletClient() {
  return createWalletClient({
    account: getRelayerAccount(),
    chain: scopeChain,
    transport: http(SERVER_RPC),
  });
}

/**
 * Agent signing account. Autonomous agents sign their own ExecutionRequest
 * (EIP-712, gasless/offchain). No funding required — it only signs.
 */
export function getAgentAccount() {
  const pk = normalizeKey(process.env.AGENT_PRIVATE_KEY);
  if (!pk) throw new Error("AGENT_PRIVATE_KEY is not set in the environment.");
  return privateKeyToAccount(pk);
}

/** EIP-712 domain — chainId comes from env and MUST match the deploy chain. */
export const EIP712_DOMAIN = {
  name: "ScopeExecutor",
  version: "1",
  chainId: CHAIN_ID,
  verifyingContract: deployments.contracts.ScopeExecutor as `0x${string}`,
} as const;

export const EXECUTION_REQUEST_TYPES = {
  ExecutionRequest: [
    { name: "agent", type: "address" },
    { name: "target", type: "address" },
    { name: "asset", type: "address" },
    { name: "recipient", type: "address" },
    { name: "value", type: "uint256" },
    { name: "callData", type: "bytes" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
    { name: "postconditionType", type: "uint8" },
    { name: "postconditionToken", type: "address" },
    { name: "postconditionValue", type: "uint256" },
  ],
} as const;

export { deployments, ScopeExecutorABI, ScopePolicyRegistryABI, MockUSDCABI };
export { getPublicClient, explorerTxUrl, explorerAddressUrl } from "./chain";
