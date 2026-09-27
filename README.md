# SCOPE

### The Execution Firewall for Autonomous Agents

> **Give agents autonomy. Keep control over what they can do.**

SCOPE is an **onchain execution-policy layer for autonomous agents**.

It solves a fundamental authorization problem created when AI agents are given the ability to transact on blockchains:

> **Cryptographic signing proves who authorized a transaction. It does not, by itself, express what that signer is allowed to do.**

SCOPE turns economic authority into programmable policies and enforces those policies directly in the blockchain execution path.

---

## The Blockchain Problem

Blockchains are designed around cryptographic authorization.

If a valid private key signs a valid transaction, the network can verify the signature and execute the transaction.

That model works well when a human directly controls every transaction.

Autonomous agents create a more granular problem.

An agent may be authorized to act on behalf of a user or organization without being authorized to perform **every transaction that its wallet can sign**.

For example, an AI procurement agent might legitimately be authorized to:

- Spend USDC
- Pay an approved supplier
- Spend no more than $500 per transaction
- Stay below a daily budget
- Operate during defined hours

The agent's wallet, however, may technically be capable of signing transactions that violate all of those constraints.

A compromised tool, manipulated execution request, incorrect model decision, or malicious destination could therefore turn a legitimate agent authorization into an unintended blockchain transaction.

The blockchain can answer:

> **Who signed this?**

The missing question is:

> **Was this particular economic action within the authority granted to the agent?**

SCOPE addresses that gap.

---

# The Solution

SCOPE introduces an **Execution Policy** between an autonomous agent and blockchain state changes.

Policies convert high-level economic authority into machine-enforced execution constraints.

A SCOPE policy can define:

| Dimension | What it controls |
|---|---|
| **WHO** | Which agent is authorized |
| **WHAT** | Which assets or actions are permitted |
| **WHERE** | Which contracts and recipients are permitted |
| **HOW MUCH** | Per-action and daily spending limits |
| **WHEN** | Valid execution windows and deadlines |
| **OUTCOME** | Machine-verifiable execution conditions |

Instead of relying on an agent to voluntarily follow its instructions, SCOPE places the policy **inside the execution path**.

If an execution request violates the policy, the SCOPE executor rejects the transaction before the underlying state change can complete.

### The core principle

> **The AI made the decision. The blockchain enforced the boundary.**

---

# How It Works

```text
                    AUTONOMOUS AGENT
                           │
                           │
                           │ Execution Request
                           ▼
                  ┌──────────────────┐
                  │  SCOPE EXECUTOR  │
                  │                  │
                  │ Execution        │
                  │ Firewall         │
                  └────────┬─────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │  POLICY VALIDATION │
                 └─────────┬─────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
       Identity         Recipient        Limits
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    Preconditions
                           │
                           ▼
                  Atomic Execution
                           │
                           ▼
                 Postcondition Check
                           │
                 ┌─────────┴─────────┐
                 │                   │
                PASS                FAIL
                 │                   │
                 ▼                   ▼
              EXECUTE              REVERT
