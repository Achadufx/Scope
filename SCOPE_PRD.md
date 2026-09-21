# SCOPE: The Execution Firewall for Autonomous Agents
## Product Requirements Document & Build Specification

**Version:** 1.0  
**Build Target:** Hackathon-quality production MVP  
**Hackathon:** 3rd-Web-Hack  
**Deadline:** September 27, 2026  

---

## 1. Executive Summary & Product North Star

### North Star
**SCOPE** is an onchain execution firewall for autonomous agents. An agent may be intelligent enough to decide an action, but intelligence is not authorization. SCOPE lets the owner define enforceable economic boundaries around autonomous execution.

### Product in One Sentence
> **SCOPE lets autonomous agents transact freely inside an economic policy—and makes the blockchain reject actions that escape it.**

### The "Judge Oh" Moment
> *"The AI made the decision. The blockchain enforced the boundary."*

---

## 2. Core Concept & Differentiation

### Core Abstraction: Execution Policy
The central abstraction is **EXECUTION POLICY**, not a trust score or heuristic risk score. A policy defines:
- **WHO** — Which agent is delegated authority (`agent` address).
- **WHAT** — Permitted assets (`allowedAssets`) and actions (function selectors / call types).
- **WHERE** — Approved contracts (`allowedTargets`) and recipients (`allowedRecipients`).
- **HOW MUCH** — Per-transaction maximums (`maxPerAction`) and daily exposure limits (`dailyLimit`).
- **WHEN** — Time-bounded validity windows (`validAfter`, `validUntil`, daily operational hours).
- **UNDER WHAT OUTCOME** — Machine-verifiable postconditions (e.g. `MIN_TOKEN_RECEIVED`, `MAX_TOKEN_SPENT`).

### Key Differentiation
A standard spending limit or wallet balance only asks: *"Does the balance cover $500?"*  
SCOPE evaluates whether the **entire execution envelope** remains compliant:
- A $500 payment to an unknown attacker address is **REVERTED onchain**, even though the amount is well within the spending limit.
- If a DEX or merchant returns fewer tokens than the policy's postcondition threshold, the transaction **atomically reverts**.

### Positioning vs. Existing Standards
- **Not a replacement for ERC-7579:** ERC-7579 provides modular account scaffolding. SCOPE provides the application-level economic execution policy layer.
- **Beyond Basic Wallets:** Normal wallets only authenticate signers; SCOPE separates agent identity from execution authority.
- **Beyond Session Keys:** Session keys delegate signing authority; SCOPE establishes the enforceable economic envelope the delegated authority must remain inside.

---

## 3. Product Loop

$$\text{DEFINE} \longrightarrow \text{AUTHORIZE} \longrightarrow \text{PROPOSE} \longrightarrow \text{SIMULATE} \longrightarrow \text{VALIDATE} \longrightarrow \text{EXECUTE} \longrightarrow \text{VERIFY OUTCOME} \longrightarrow \text{AUDIT}$$

1. **DEFINE:** Owner constructs policy rules in the Policy Builder UI or SDK.
2. **AUTHORIZE:** Owner authorizes policy via onchain registry registration and EIP-712 signature.
3. **PROPOSE:** Agent signs and submits an `ExecutionRequest`.
4. **SIMULATE:** Engine pre-validates call against offchain simulation and active database state.
5. **VALIDATE:** `ScopeExecutor` smart contract verifies cryptographic signature, nonces, deadline, targets, assets, amounts, daily limit, and validity windows.
6. **EXECUTE:** Call is dispatched to approved target contract atomically.
7. **VERIFY OUTCOME:** Postconditions (such as received token balances or state checks) are asserted atomically before transaction completion. Reverts on any violation.
8. **AUDIT:** Transaction hash, execution traces, policy checks, and violation telemetry logged to Explorer and Evidence Vault.

---

## 4. MVP Surfaces & Architecture

### User Surfaces
1. **Landing Page:** Institutional presentation ("Give agents autonomy. Keep control over what they can do.") with instant demo access.
2. **Command Center:** Real-time metrics (Active Agents, Policies, Actions Today, Blocked Attacks), agent fleet overview, today's exposure vs daily limit, live activity stream.
3. **Agents:** List of managed autonomous agents, wallet addresses, scoped authorities, and status.
4. **Agent Detail:** Deep-dive into specific agent, attached active policies, lifetime metrics, execution history.
5. **Policy Builder:** Form + visual live policy summary for assets, per-action cap, daily ceiling, allowed merchants/contracts, operational hours, unknown-recipient defense, and postcondition requirements. EIP-712 authorization modal.
6. **Action Simulator:** Pre-flight sandbox testing execution requests against the active policy.
7. **Attack Lab:** Live split-screen adversarial demonstration ("Without SCOPE" vs "With SCOPE") pitting agents against Compromised Supplier, Over-Limit, and Off-Hours attacks with actual onchain verification.
8. **Execution Result & Evidence:** Deep forensic breakdown (`POLICY → REQUEST → VALIDATION → VIOLATION → REVERT`) with decoded parameters, capital moved ($0.00), and block explorer links.
9. **Contract / Verification:** Onchain contract addresses, source code verification, ABI interfaces, and testnet explorer links.
10. **Developer API:** Interactive API explorer (`POST /api/v1/executions/propose`), API key rotation, code snippets (TypeScript / Python / cURL).
11. **Settings:** Workspace management, RPC endpoints, network switching, demo data reset.

---

## 5. Smart Contract Architecture

### Contracts
1. **`ScopePolicyRegistry.sol`**
   - Stores policies keyed by `bytes32 policyHash` or `uint256 policyId`.
   - Manages policy lifecycle: `createPolicy`, `activatePolicy`, `revokePolicy`, `getPolicy`.
   - Emits audit events: `PolicyCreated`, `PolicyActivated`, `PolicyRevoked`.

2. **`ScopeExecutor.sol`**
   - Core firewall contract.
   - Enforces EIP-712 signed execution requests from authorized agents.
   - Authoritatively validates preconditions: agent permission, target whitelist, asset whitelist, `maxPerAction`, rolling `dailyLimit`, `validAfter`, `validUntil`, nonces, deadlines.
   - Atomically executes call to target contract and validates postconditions (e.g. `MIN_TOKEN_RECEIVED`).
   - Atomically reverts with custom errors on any violation:
     - `UnauthorizedAgent()`
     - `PolicyInactiveOrExpired()`
     - `TargetNotAllowed(address target)`
     - `AssetNotAllowed(address asset)`
     - `ActionLimitExceeded(uint256 amount, uint256 maxAllowed)`
     - `DailyLimitExceeded(uint256 amount, uint256 dailyRemaining)`
     - `RecipientNotAllowed(address recipient)`
     - `OutcomePostconditionFailed(uint256 actual, uint256 expected)`
     - `InvalidSignature()`
     - `NonceAlreadyUsed(uint256 nonce)`
     - `DeadlineExpired(uint256 deadline)`

3. **`MockUSDC.sol`**
   - Standard ERC-20 demo token with 6 decimals, faucet minting, and explicit "DEMO USDC" branding.

4. **`SafeMerchant.sol`**
   - Authorized merchant contract (e.g., `Acme Components` / `ProcurementRouter`).
   - Receives payment, updates invoice state, and returns expected deliverables or receipt tokens.

5. **`MaliciousMerchant.sol`**
   - Adversarial contract / simulated attacker wallet recipient.
   - Demonstrates phishing, redirection of funds, or slippage exploitation.

---

## 6. Data Model & Database Schema (Prisma / PostgreSQL or SQLite)

- **`Workspace`**: Organization container (`id`, `name`, `slug`, `createdAt`).
- **`Agent`**: Agent metadata & keys (`id`, `workspaceId`, `name`, `description`, `walletAddress`, `status`, `createdAt`).
- **`Policy`**: Active policy record (`id`, `agentId`, `ownerAddress`, `maxPerAction`, `dailyLimit`, `validAfter`, `validUntil`, `active`, `policyHash`, `chainId`, `contractAddress`, `createdAt`).
- **`PolicyRule`**: Granular rules (`id`, `policyId`, `type`, `value`, `metadata`).
  - Types: `ALLOWED_ASSET`, `ALLOWED_TARGET`, `ALLOWED_RECIPIENT`, `MAX_AMOUNT`, `DAILY_LIMIT`, `TIME_WINDOW`, `MIN_OUTPUT`.
- **`Execution`**: Recorded transaction attempts (`id`, `agentId`, `policyId`, `target`, `asset`, `amount`, `recipient`, `status`, `decision`, `txHash`, `blockNumber`, `gasUsed`, `capitalMoved`, `createdAt`).
- **`Violation`**: Captured policy violation details (`id`, `executionId`, `type`, `expected`, `actual`, `createdAt`).
- **`ApiKey`**: Scoped developer credentials (`id`, `workspaceId`, `name`, `keyHash`, `prefix`, `lastUsedAt`, `createdAt`).

---

## 7. Attack Lab Specifications

### 3 Guided Scenarios
1. **Scenario 1: Compromised Supplier / Rogue Recipient**
   - *Normal:* Atlas → Acme Components → $480 USDC → ProcurementRouter (ALLOWED & EXECUTED).
   - *Attack:* Atlas (compromised prompt / malicious tool) attempts to send $480 USDC to attacker address `0x9999...beef` → SCOPE REVERTS (`RECIPIENT_NOT_ALLOWED`).
   - *Capital Saved:* $480.00.

2. **Scenario 2: Action Limit Bypass / Budget Bleed**
   - *Attack:* Atlas attempts to issue a $700 purchase order when policy caps individual actions at $500 USDC.
   - *SCOPE Result:* REVERTS (`ACTION_LIMIT_EXCEEDED`).
   - *Capital Saved:* $700.00.

3. **Scenario 3: Off-Hours / Out-of-Window Rogue Execution**
   - *Attack:* Atlas attempts to trigger procurement at 03:00 UTC or after policy expiration timestamp.
   - *SCOPE Result:* REVERTS (`POLICY_EXPIRED_OR_OUTSIDE_WINDOW`).

---

## 8. Technology Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui components, Lucide icons, viem & wagmi.
- **Backend:** Next.js API Routes, Prisma ORM, PostgreSQL / SQLite, Zod validation.
- **Contracts:** Solidity 0.8.24, OpenZeppelin v5, Hardhat / viem deployment and testing suite.
- **Design System:** Stripe × Linear aesthetic. Background `#F7F8FA`, Surface `#FFFFFF`, Primary `#111318`, Secondary `#667085`, Border `#E4E7EC`, Accent `#4F46E5`, Success `#16803C`, Danger `#C53030`. Tabular numerals for all financial figures.
