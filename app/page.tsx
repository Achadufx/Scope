import Link from "next/link";
import {
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lock,
  Cpu,
  RefreshCw,
  Sliders,
  Zap,
  Layers,
  Database,
  Terminal,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full border-b border-border bg-surface pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-secondary mb-8">
            <span className="flex h-2 w-2 rounded-full bg-accent" />
            <span className="font-mono text-primary font-semibold">SCOPE v1.0</span>
            <span className="text-secondary">•</span>
            <span>Onchain Execution Firewall for Autonomous Agents</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-primary leading-[1.15]">
            Give agents autonomy. <br />
            <span className="text-secondary font-normal">Keep control over what they can do.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-secondary max-w-2xl mx-auto font-normal leading-relaxed">
            SCOPE turns economic policies into onchain execution boundaries for autonomous agents.
            Transact freely inside an economic policy—and let the blockchain reject actions that escape it.
          </p>

          <p className="mt-2 text-sm font-medium text-accent">
            “Your agent can decide. SCOPE decides whether that decision is authorized.”
          </p>

          {/* Action CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-surface shadow hover:bg-primary-hover transition-colors"
            >
              <span>Launch Demo</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/attack-lab"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-danger-border bg-danger-surface px-6 py-3 text-sm font-semibold text-danger hover:bg-danger-border/30 transition-colors"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>See Attack Lab</span>
            </Link>
          </div>

          {/* Institutional Trust metrics strip */}
          <div className="mt-14 pt-8 border-t border-border grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            <div>
              <div className="text-xs uppercase tracking-wider text-secondary font-mono font-medium">Core Abstraction</div>
              <div className="mt-1 text-sm font-bold text-primary font-sans">Execution Policy</div>
              <div className="text-xs text-secondary mt-0.5">Not heuristic risk scores</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-secondary font-mono font-medium">Enforcement</div>
              <div className="mt-1 text-sm font-bold text-primary font-sans">Smart Contract Hard Revert</div>
              <div className="text-xs text-secondary mt-0.5">Authoritative onchain state</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-secondary font-mono font-medium">Postcondition</div>
              <div className="mt-1 text-sm font-bold text-primary font-sans">Atomic Outcome Guard</div>
              <div className="text-xs text-secondary mt-0.5">Slippage & output verification</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-secondary font-mono font-medium">Cryptographic Root</div>
              <div className="mt-1 text-sm font-bold text-primary font-sans">EIP-712 Typed Envelopes</div>
              <div className="text-xs text-secondary mt-0.5">Strict replay & nonce bounds</div>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Kill Shot Diagram */}
      <section className="w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="text-xs font-mono font-semibold uppercase text-accent tracking-wider">The "Judge Oh" Moment</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary mt-1">
            The AI made the decision. The blockchain enforced the boundary.
          </h2>
          <p className="text-sm text-secondary mt-2 max-w-xl mx-auto">
            A spending limit only says "don't spend more than $500." SCOPE asks whether the entire execution remains inside the economic envelope.
          </p>
        </div>

        {/* Visual Kill Shot Diagram Card */}
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            {/* Step 1: Agent Request */}
            <div className="p-4 rounded-lg bg-background border border-border">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-secondary">
                <Cpu className="h-4 w-4 text-primary" />
                <span>AGENT REQUEST</span>
              </div>
              <div className="mt-2 text-lg font-bold text-primary tabular-nums">$480.00 USDC</div>
              <div className="mt-1 text-xs text-secondary">Atlas Procurement Agent</div>
              <div className="mt-2 text-[11px] font-mono text-secondary bg-surface p-1.5 rounded border border-border truncate">
                Target: 0xCf7E...0Fc9
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-secondary font-mono text-sm">
              <ArrowRight className="h-5 w-5 text-secondary" />
            </div>

            {/* Step 2: Scope Policy Evaluation */}
            <div className="p-4 rounded-lg bg-background border border-border md:col-span-1">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-accent">
                <Sliders className="h-4 w-4" />
                <span>SCOPE POLICY</span>
              </div>
              <div className="mt-2 text-xs space-y-1">
                <div className="flex justify-between text-secondary">
                  <span>Allowed:</span>
                  <span className="font-semibold text-primary">Acme Components</span>
                </div>
                <div className="flex justify-between text-danger font-medium">
                  <span>Actual:</span>
                  <span className="font-mono truncate max-w-[90px]">0x3C44...93BC</span>
                </div>
                <div className="text-[10px] text-danger font-mono bg-danger-surface p-1 rounded border border-danger-border mt-1">
                  Recipient Mismatch
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex justify-center text-secondary font-mono text-sm">
              <ArrowRight className="h-5 w-5 text-secondary" />
            </div>

            {/* Step 3: Enforcement & Capital Protected */}
            <div className="p-4 rounded-lg bg-danger-surface border border-danger-border md:col-span-1">
              <div className="flex items-center gap-2 text-xs font-mono font-semibold text-danger">
                <XCircle className="h-4 w-4" />
                <span>ONCHAIN REVERT</span>
              </div>
              <div className="mt-2 text-lg font-bold text-danger tabular-nums font-mono">$0.00 MOVED</div>
              <div className="mt-1 text-xs text-secondary font-medium">100% Capital Protected</div>
              <div className="mt-2 text-[10px] font-mono text-danger bg-surface p-1.5 rounded border border-danger-border">
                Revert: RecipientNotAllowed
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Loop */}
      <section className="w-full border-y border-border bg-surface py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-xs font-mono font-semibold uppercase text-secondary tracking-wider">The SCOPE Loop</h3>
            <p className="text-2xl font-bold text-primary mt-1">Deterministic Economic Enforcement Lifecycle</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
            {[
              { step: "01", name: "DEFINE", desc: "Owner configures rules" },
              { step: "02", name: "AUTHORIZE", desc: "EIP-712 signature" },
              { step: "03", name: "PROPOSE", desc: "Agent signs request" },
              { step: "04", name: "SIMULATE", desc: "Pre-flight checks" },
              { step: "05", name: "VALIDATE", desc: "Contract enforces bounds" },
              { step: "06", name: "EXECUTE", desc: "Atomic call dispatch" },
              { step: "07", name: "VERIFY", desc: "Postconditions asserted" },
              { step: "08", name: "AUDIT", desc: "Onchain evidence vault" },
            ].map((item, idx) => (
              <div key={item.step} className="rounded-lg border border-border bg-background p-3 flex flex-col items-center">
                <span className="text-[10px] font-mono font-bold text-accent">{item.step}</span>
                <span className="text-xs font-bold text-primary mt-1">{item.name}</span>
                <span className="text-[11px] text-secondary mt-1 leading-tight">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiation & Positioning Comparison */}
      <section className="w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h3 className="text-xs font-mono font-semibold uppercase text-secondary tracking-wider">Architectural Clarity</h3>
          <p className="text-2xl font-bold text-primary mt-1">Why SCOPE is Different</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-xs font-mono font-semibold text-secondary uppercase">Why Not Just a Wallet?</div>
            <div className="text-base font-bold text-primary mt-2">Identity vs Authority</div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              A normal wallet only authenticates the signer. Giving an autonomous agent private keys provides unrestricted signing capability.
              SCOPE separates cryptographic identity from execution authority.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-xs font-mono font-semibold text-secondary uppercase">Why Not Just Session Keys?</div>
            <div className="text-base font-bold text-primary mt-2">Delegation vs Economic Envelope</div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              Session keys establish delegated authority. SCOPE defines the comprehensive economic envelope that delegated authority must remain inside—including counterparties and atomic postconditions.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6">
            <div className="text-xs font-mono font-semibold text-secondary uppercase">Why ERC-7579 Compatibility?</div>
            <div className="text-base font-bold text-primary mt-2">Account Scaffolding vs Policy Layer</div>
            <p className="text-xs text-secondary mt-2 leading-relaxed">
              We aren't replacing ERC-7579. ERC-7579 provides modular account scaffolding. SCOPE is the application-level policy firewall built around economic execution semantics.
            </p>
          </div>
        </div>

        {/* What SCOPE does not do */}
        <div className="mt-8 rounded-xl border border-border bg-background p-6">
          <div className="text-xs font-mono font-semibold uppercase text-secondary">Honest Institutional Boundaries</div>
          <div className="mt-1 text-sm font-bold text-primary">What SCOPE Does Not Claim To Do</div>
          <p className="mt-1 text-xs text-secondary leading-relaxed">
            Smart contracts cannot magically deduce subjective human intent. SCOPE does not predict markets, grade investment profitability, or replace smart contract audits.
            SCOPE only authoritatively enforces machine-verifiable constraints: addresses, assets, amounts, function selectors, deadlines, nonces, limits, and atomic state postconditions.
          </p>
        </div>
      </section>
    </div>
  );
}
