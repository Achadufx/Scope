import { createPublicClient, createWalletClient, http, defineChain, parseUnits, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import deployments from "./deployments.json";
import { ScopeExecutorABI, ScopePolicyRegistryABI, MockUSDCABI } from "./abis";

export const hardhatLocal = defineChain({
  id: 31337,
  name: "SCOPE Local Devnet",
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"] },
  },
});

export const getPublicClient = () => {
  return createPublicClient({
    chain: hardhatLocal,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
  });
};

// Hardhat standard test keys for demonstration
export const DEMO_KEYS = {
  // Account #0 (Owner/Deployer): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
  owner: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`,
  // Account #1 (Atlas Agent): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  agent: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`,
  // Account #2 (Attacker): 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  attacker: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a" as `0x${string}`,
  // Account #3 (Supplier / Acme Components): 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  supplier: "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6" as `0x${string}`,
};

export const getAgentWalletClient = () => {
  const account = privateKeyToAccount(DEMO_KEYS.agent);
  return createWalletClient({
    account,
    chain: hardhatLocal,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
  });
};

export const getOwnerWalletClient = () => {
  const account = privateKeyToAccount(DEMO_KEYS.owner);
  return createWalletClient({
    account,
    chain: hardhatLocal,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"),
  });
};

export const EIP712_DOMAIN = {
  name: "ScopeExecutor",
  version: "1",
  chainId: 31337,
  verifyingContract: deployments.contracts.ScopeExecutor as `0x${string}`,
};

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

export { deployments };
