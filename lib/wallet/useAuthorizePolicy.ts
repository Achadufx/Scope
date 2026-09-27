"use client";

import { useState, useCallback } from "react";
import { useWriteContract, useAccount } from "wagmi";
import { parseUnits, getAddress } from "viem";
import { getPublicClient, scopeChain } from "@/lib/blockchain/chain";
import { ScopePolicyRegistryABI } from "@/lib/blockchain/abis";
import deployments from "@/lib/blockchain/deployments.json";

export type AuthorizeStatus =
  | "idle"
  | "signing" // waiting for the owner's wallet signature
  | "confirming" // tx submitted, waiting to mine
  | "reading" // reading the real policyHash back from the chain
  | "persisting" // saving to the backend
  | "done"
  | "error";

export interface AuthorizePolicyInput {
  agentId: string; // DB agent id (for the POST)
  agentAddress: string; // onchain agent address
  name: string;
  allowedTargets: string[];
  allowedAssets: string[];
  allowedRecipients: string[];
  maxPerAction: string | number; // USDC (human units)
  dailyLimit: string | number; // USDC (human units)
  validAfter?: number; // unix seconds
  validUntil?: number; // unix seconds
  timeWindow?: string; // offchain-enforced operational-hours label
  minOutput?: string;
}

export interface AuthorizeResult {
  txHash: `0x${string}`;
  policyHash: `0x${string}`;
}

/**
 * The owner-authorize flow, honest end to end:
 *   1. owner signs createPolicy in their real wallet (they pay gas);
 *   2. we wait for the tx to mine;
 *   3. we read the AUTHORITATIVE policyHash back from the registry
 *      (createPolicy auto-activates, so agentActivePolicy[agent] holds it) — never fabricated;
 *   4. we persist that real hash + tx to the backend so the DB mirrors the chain.
 */
export function useAuthorizePolicy() {
  const { address, isConnected, chainId } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [status, setStatus] = useState<AuthorizeStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [policyHash, setPolicyHash] = useState<`0x${string}` | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setTxHash(null);
    setPolicyHash(null);
  }, []);

  const authorize = useCallback(
    async (input: AuthorizePolicyInput): Promise<AuthorizeResult | null> => {
      setError(null);
      setTxHash(null);
      setPolicyHash(null);
      try {
        if (!isConnected || !address) {
          throw new Error("Connect your wallet to authorize this policy onchain.");
        }
        if (chainId !== scopeChain.id) {
          throw new Error(`Switch your wallet to ${scopeChain.name} before authorizing.`);
        }

        const registry = getAddress(deployments.contracts.ScopePolicyRegistry) as `0x${string}`;
        const agent = getAddress(input.agentAddress) as `0x${string}`;
        const now = Math.floor(Date.now() / 1000);
        const validAfter = BigInt(input.validAfter ?? now - 60);
        const validUntil = BigInt(input.validUntil ?? now + 30 * 86400);
        const targets = input.allowedTargets.map((a) => getAddress(a) as `0x${string}`);
        const assets = input.allowedAssets.map((a) => getAddress(a) as `0x${string}`);
        const recipients = input.allowedRecipients.map((a) => getAddress(a) as `0x${string}`);
        const maxUnits = parseUnits(String(input.maxPerAction), 6);
        const dailyUnits = parseUnits(String(input.dailyLimit), 6);

        // 1. Owner signs createPolicy — a real onchain transaction, owner pays gas.
        setStatus("signing");
        const hash = await writeContractAsync({
          address: registry,
          abi: ScopePolicyRegistryABI,
          functionName: "createPolicy",
          args: [agent, targets, assets, recipients, maxUnits, dailyUnits, validAfter, validUntil],
          chainId: scopeChain.id,
        });
        setTxHash(hash);

        // 2. Wait for it to mine.
        setStatus("confirming");
        const publicClient = getPublicClient();
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") {
          throw new Error("Policy authorization transaction reverted onchain.");
        }

        // 3. Read the REAL policyHash back from the registry — the source of truth.
        setStatus("reading");
        const realPolicyHash = (await publicClient.readContract({
          address: registry,
          abi: ScopePolicyRegistryABI,
          functionName: "agentActivePolicy",
          args: [agent],
        })) as `0x${string}`;
        setPolicyHash(realPolicyHash);

        // 4. Persist to the backend with the real onchain hash + tx.
        setStatus("persisting");
        const res = await fetch("/api/v1/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: input.agentId,
            name: input.name,
            owner: address,
            maxPerAction: String(input.maxPerAction),
            dailyLimit: String(input.dailyLimit),
            allowedAssets: input.allowedAssets,
            allowedTargets: input.allowedTargets,
            allowedRecipients: input.allowedRecipients,
            validAfter: new Date(Number(validAfter) * 1000).toISOString(),
            validUntil: new Date(Number(validUntil) * 1000).toISOString(),
            timeWindow: input.timeWindow,
            minOutput: input.minOutput,
            policyHash: realPolicyHash,
            txHash: hash,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message || body.error || "Backend failed to persist the authorized policy.");
        }

        setStatus("done");
        return { txHash: hash, policyHash: realPolicyHash };
      } catch (err: any) {
        const msg = err?.shortMessage || err?.message || "Authorization failed.";
        setError(msg);
        setStatus("error");
        return null;
      }
    },
    [address, isConnected, chainId, writeContractAsync]
  );

  return { authorize, reset, status, error, txHash, policyHash, isConnected, chainId, address };
}
