# SCOPE — The Execution Firewall for Autonomous Agents

> **"Give agents autonomy. Keep control over what they can do."**  
> *SCOPE turns economic policies into onchain execution boundaries for autonomous agents.*

---

## 1. Product North Star & Problem Statement

As autonomous AI agents acquire wallet keys to purchase compute, manage inventory, execute DeFi strategies, and settle supplier invoices, giving an agent a raw private key grants unrestricted signing capability. **Intelligence is not authorization.** A prompt injection, hallucination, or compromised tool can redirect capital immediately.

**SCOPE** introduces the **Execution Policy** abstraction—an onchain economic firewall that wraps autonomous execution inside machine-enforced boundaries:
- **WHO** — Authorized agent wallet address
- **WHAT** — Allowed assets (e.g. USDC)
- **WHERE** — Approved contracts (e.g. ProcurementRouter) and approved merchants (e.g. Acme Components)
- **HOW MUCH** — Per-action maximums ($500) and daily rolling limits ($2,000)
- **WHEN** — Time-bounded operational windows (08:00–18:00 UTC)
- **UNDER WHAT OUTCOME** — Atomic machine-verifiable postconditions (e.g. minimum received output)

When an agent attempts an action that escapes this economic envelope, **the blockchain reverts the transaction atomically ($0.00 capital moved)**.

---

## 2. The "Judge Oh" Moment

> *"The AI made the decision. The blockchain enforced the boundary."*

```
AGENT REQUEST ($480 USDC)
          ↓
    SCOPE POLICY
  Allowed: Acme Components
  Actual:  Attacker Wallet (0x3C44...93BC)
          ↓
   POLICY VIOLATION
   (RecipientNotAllowed)
          ↓
  BLOCKCHAIN REVERT
          ↓
    CAPITAL MOVED
        $0.00
```

---

## 3. Product Surfaces

1. **Landing Page (`/`)**: Institutional presentation of the execution firewall, visual kill shot flow, and architectural principles.
2. **Command Center (`/dashboard`)**: Real-time metrics (Active Agents, Policies, Actions Today, Attacks Blocked), Atlas fleet card ($1,284 / $2,000 today's exposure), and live audit stream.
3. **Attack Lab (`/attack-lab`)**: Live split-screen adversarial testing ("Without SCOPE" vs "With SCOPE") testing:
   - Compromised Supplier (Rogue Recipient Injection)
   - Budget Bleed ($700 against $500 max cap)
   - Off-Hours Rogue Execution (Operational window escape)
   - Outcome Postcondition Failure (Slippage / drain exploit)
4. **Policy Builder (`/policies`)**: Visual policy constructor with live summary and **EIP-712 typed cryptographic signature authorization**.
5. **Action Simulator (`/simulator`)**: Pre-flight validation sandbox testing candidate transactions with stepped checks.
6. **Evidence Vault (`/executions` and `/executions/[id]`)**: Deep forensic audit pipeline (`POLICY → REQUEST → VALIDATION → VIOLATION → REVERT`) with decoded revert reasons and explorer links.
7. **Smart Contracts (`/contracts`)**: Bytecode verification, ABIs, and deployed addresses.
8. **Developer API (`/developer`)**: `POST /api/v1/executions/propose` gateway, masked API keys, and SDK snippets in TypeScript, Python, and cURL.
9. **Settings (`/settings`)**: EVM RPC endpoint, chain settings, and demo state reset.

---

## 4. Smart Contract Architecture

```
ScopePolicyRegistry
       │
       │ (Policy definitions, whitelists, limits)
       ▼
  ScopeExecutor (Firewall)
       ├── EIP-712 Signature Verification
       ├── Nonce & Deadline Replay Guard
       ├── Target & Asset Whitelists
       ├── maxPerAction & Daily Spending Limit
       ├── Atomic Dispatch to Target
       └── Atomic Postcondition Assertion
             ├── SafeMerchant (Acme Components)
             └── MaliciousMerchant (Phishing Clone / Slippage Skimmer)
```

### Deployed Contracts
- **`ScopePolicyRegistry.sol`**: Manages policy lifecycle (`createPolicy`, `activatePolicy`, `revokePolicy`, `getPolicy`).
- **`ScopeExecutor.sol`**: Authoritative execution firewall enforcing EIP-712 signatures, preconditions, atomic calls, and postconditions (`MIN_TOKEN_RECEIVED`).
- **`MockUSDC.sol`**: 6-decimal test token labeled "DEMO USDC".
- **`SafeMerchant.sol`**: Legitimate procurement destination (Acme Components).
- **`MaliciousMerchant.sol`**: Adversarial contract for live attack demonstration.

---

## 5. Architectural Differentiation

| Dimension | Normal Wallet | Session Keys | ERC-7579 | **SCOPE** |
| :--- | :--- | :--- | :--- | :--- |
| **Identity vs Authority** | Blurs signing identity with unlimited spend | Delegates signing authority | Modular account framework | Separates agent identity from execution envelope |
| **Counterparty Bounds** | None | Limited | Modular validation | Strict target & recipient whitelists |
| **Postcondition Enforcement** | None | None | Hook-based | Atomic outcome assertion (`MIN_TOKEN_RECEIVED`) |
| **Revert Guarantees** | Offchain heuristic | Offchain check | Contract execution | Authoritative onchain hard revert ($0 moved) |

---

## 6. Quickstart & Verification

```bash
# 1. Install dependencies
npm install

# 2. Run smart contract test suite (6 passing on Paris EVM)
npm run contracts:test

# 3. Deploy contracts & seed database
npm run contracts:deploy
npm run db:seed

# 4. Start local development server
npm run dev
# Open http://localhost:3000
```
