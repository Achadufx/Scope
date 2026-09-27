import { BaseError, ContractFunctionRevertedError } from "viem";
import {
  getPublicClient,
  getRelayerAccount,
  getRelayerWalletClient,
  getAgentAccount,
  EIP712_DOMAIN,
  EXECUTION_REQUEST_TYPES,
  deployments,
  ScopeExecutorABI,
} from "./client";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * The authoritative decision codes. These are produced by the ScopeExecutor
 * contract's custom-error reverts (decoded onchain), NOT by offchain heuristics.
 * "ALLOW" means the contract simulated/executed the request without reverting.
 */
export type OnchainDecisionCode =
  | "ALLOW"
  | "INVALID_SIGNATURE"
  | "UNAUTHORIZED_AGENT"
  | "NONCE_USED"
  | "DEADLINE_EXPIRED"
  | "POLICY_EXPIRED_OR_OUTSIDE_WINDOW"
  | "CONTRACT_NOT_ALLOWED"
  | "ASSET_NOT_ALLOWED"
  | "RECIPIENT_NOT_ALLOWED"
  | "ACTION_LIMIT_EXCEEDED"
  | "DAILY_LIMIT_EXCEEDED"
  | "OUTCOME_VIOLATION"
  | "EXECUTION_REVERTED"
  | "UNKNOWN_REVERT";

/** Maps a Solidity custom-error name to its decision code. Names MUST match ScopeExecutor.sol. */
const ERROR_NAME_TO_CODE: Record<string, OnchainDecisionCode> = {
  InvalidSignature: "INVALID_SIGNATURE",
  UnauthorizedAgent: "UNAUTHORIZED_AGENT",
  NonceAlreadyUsed: "NONCE_USED",
  DeadlineExpired: "DEADLINE_EXPIRED",
  PolicyInactiveOrExpired: "POLICY_EXPIRED_OR_OUTSIDE_WINDOW",
  TargetNotAllowed: "CONTRACT_NOT_ALLOWED",
  AssetNotAllowed: "ASSET_NOT_ALLOWED",
  RecipientNotAllowed: "RECIPIENT_NOT_ALLOWED",
  ActionLimitExceeded: "ACTION_LIMIT_EXCEEDED",
  DailyLimitExceeded: "DAILY_LIMIT_EXCEEDED",
  OutcomePostconditionFailed: "OUTCOME_VIOLATION",
  TargetExecutionFailed: "EXECUTION_REVERTED",
};

export interface OnchainExecutionRequest {
  agent: `0x${string}`;
  target: `0x${string}`;
  asset: `0x${string}`;
  recipient: `0x${string}`;
  value: bigint;
  callData: `0x${string}`;
  nonce: bigint;
  deadline: bigint;
  postconditionType: number;
  postconditionToken: `0x${string}`;
  postconditionValue: bigint;
}

export interface EnforceParams {
  target: `0x${string}`;
  asset: `0x${string}`;
  recipient: `0x${string}`;
  /** Transfer amount in the asset's base units (USDC = 6 decimals). */
  amountUnits: bigint;
  callData?: `0x${string}`;
  postconditionType?: number;
  postconditionToken?: `0x${string}`;
  postconditionValue?: bigint;
  /** When true and the simulation passes, submit the real transaction. */
  execute: boolean;
}

export interface OnchainAttemptResult {
  /** True once the ScopeExecutor bytecode is live on the configured chain. */
  available: boolean;
  /** The authoritative decision from the contract (simulate or execute). */
  code: OnchainDecisionCode;
  /** True only if a real transaction was mined successfully. */
  executed: boolean;
  txHash?: `0x${string}`;
  blockNumber?: number;
  gasUsed?: number;
  onchainStatus?: "success" | "reverted";
  errorName?: string;
  errorArgs?: readonly unknown[];
  detail: string;
}

/** Generates a collision-resistant, non-sequential nonce for replay-safe requests. */
function freshNonce(): bigint {
  const ms = BigInt(Date.now());
  const rand = BigInt(Math.floor(Math.random() * 1_000_000_000));
  return ms * 1_000_000_000n + rand;
}

export function buildExecutionRequest(params: EnforceParams): OnchainExecutionRequest {
  // The signing agent is the account whose key the server holds (gasless agent).
  const agent = getAgentAccount().address;
  return {
    agent,
    target: params.target,
    asset: params.asset,
    recipient: params.recipient,
    value: params.amountUnits,
    callData: params.callData ?? "0x",
    nonce: freshNonce(),
    deadline: BigInt(Math.floor(Date.now() / 1000) + 300), // 5 minutes
    postconditionType: params.postconditionType ?? 0,
    postconditionToken: params.postconditionToken ?? ZERO_ADDRESS,
    postconditionValue: params.postconditionValue ?? 0n,
  };
}

/** Agent authorizes the request via an EIP-712 signature (offchain, gasless). */
export async function signAsAgent(req: OnchainExecutionRequest): Promise<`0x${string}`> {
  const account = getAgentAccount();
  return account.signTypedData({
    domain: EIP712_DOMAIN,
    types: EXECUTION_REQUEST_TYPES,
    primaryType: "ExecutionRequest",
    message: req,
  });
}

function decodeRevert(err: unknown): {
  code: OnchainDecisionCode;
  errorName?: string;
  errorArgs?: readonly unknown[];
  detail: string;
} {
  if (err instanceof BaseError) {
    const revert = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (revert instanceof ContractFunctionRevertedError) {
      const name = revert.data?.errorName ?? revert.reason ?? undefined;
      const code = (name && ERROR_NAME_TO_CODE[name]) || "UNKNOWN_REVERT";
      return {
        code,
        errorName: name ?? undefined,
        errorArgs: revert.data?.args,
        detail: revert.shortMessage ?? err.shortMessage,
      };
    }
    return { code: "UNKNOWN_REVERT", detail: err.shortMessage };
  }
  return { code: "UNKNOWN_REVERT", detail: (err as Error)?.message ?? "Unknown execution error" };
}

const EXECUTOR_ADDRESS = deployments.contracts.ScopeExecutor as `0x${string}`;

/** Returns true when the executor contract is actually deployed on the active chain. */
async function isDeployed(): Promise<boolean> {
  try {
    const publicClient = getPublicClient();
    const code = await publicClient.getBytecode({ address: EXECUTOR_ADDRESS });
    return !!code && code !== "0x";
  } catch {
    return false;
  }
}

/**
 * The single authoritative enforcement entrypoint used by the execution engine.
 * Builds + signs the request, asks the chain for the decision (simulate), and —
 * when allowed and requested — submits the real transaction for a real receipt.
 *
 * If the contract is not yet deployed / the RPC is unreachable, returns
 * { available: false } so the caller can degrade honestly (no fabricated hashes).
 */
export async function enforceOnchain(params: EnforceParams): Promise<OnchainAttemptResult> {
  if (!EXECUTOR_ADDRESS || EXECUTOR_ADDRESS === ZERO_ADDRESS) {
    return { available: false, code: "UNKNOWN_REVERT", executed: false, detail: "ScopeExecutor address not configured." };
  }
  if (!(await isDeployed())) {
    return {
      available: false,
      code: "UNKNOWN_REVERT",
      executed: false,
      detail: `ScopeExecutor not deployed at ${EXECUTOR_ADDRESS} on the active chain.`,
    };
  }

  const publicClient = getPublicClient();

  let req: OnchainExecutionRequest;
  let signature: `0x${string}`;
  try {
    req = buildExecutionRequest(params);
    signature = await signAsAgent(req);
  } catch (err) {
    return {
      available: true,
      code: "INVALID_SIGNATURE",
      executed: false,
      detail: `Agent signing failed: ${(err as Error).message}`,
    };
  }

  // 1. Simulate: this is the authoritative validation. A revert here is a policy decision.
  try {
    await publicClient.simulateContract({
      address: EXECUTOR_ADDRESS,
      abi: ScopeExecutorABI,
      functionName: "execute",
      args: [req, signature],
      account: getRelayerAccount(),
    });
  } catch (err) {
    const decoded = decodeRevert(err);
    return { available: true, executed: false, onchainStatus: "reverted", ...decoded };
  }

  // 2. Simulation passed => policy allows it. Optionally submit the real transaction.
  if (!params.execute) {
    return { available: true, code: "ALLOW", executed: false, detail: "Simulation passed (preflight only)." };
  }

  try {
    const wallet = getRelayerWalletClient();
    const txHash = await wallet.writeContract({
      address: EXECUTOR_ADDRESS,
      abi: ScopeExecutorABI,
      functionName: "execute",
      args: [req, signature],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    const ok = receipt.status === "success";
    return {
      available: true,
      code: ok ? "ALLOW" : "EXECUTION_REVERTED",
      executed: ok,
      txHash,
      blockNumber: Number(receipt.blockNumber),
      gasUsed: Number(receipt.gasUsed),
      onchainStatus: receipt.status,
      detail: ok ? "Executed onchain." : "Transaction reverted onchain after simulation passed.",
    };
  } catch (err) {
    // Reverted between simulation and mining (state changed, e.g. nonce race / daily rollover).
    const decoded = decodeRevert(err);
    return { available: true, executed: false, onchainStatus: "reverted", ...decoded };
  }
}
