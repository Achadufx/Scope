"use client";

import { useEffect, useState } from "react";
import {
  Code2,
  Copy,
  RefreshCw,
  Play,
  Key,
  Terminal,
  CheckCircle2,
  Lock,
} from "lucide-react";
import deployments from "@/lib/blockchain/deployments.json";

interface ApiKeyItem {
  id: string;
  name: string;
  maskedKey: string;
  lastUsedAt?: string;
  createdAt: string;
}

export default function DeveloperPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"TYPESCRIPT" | "PYTHON" | "CURL">("TYPESCRIPT");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [testingRequest, setTestingRequest] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchKeys = async () => {
    try {
      const res = await fetch("/api/v1/keys");
      if (res.ok) {
        const json = await res.json();
        setKeys(json.keys || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleRotate = async (keyId: string) => {
    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ROTATE", keyId }),
      });
      if (res.ok) {
        await fetchKeys();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTestRequest = async () => {
    setTestingRequest(true);
    setApiResponse(null);
    try {
      const res = await fetch("/api/v1/executions/propose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "atlas",
          target: deployments.contracts.SafeMerchant,
          recipient: deployments.demoAccounts.supplier,
          asset: deployments.contracts.MockUSDC,
          amount: "480.00",
        }),
      });
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setApiResponse(JSON.stringify({ error: err.message }, null, 2));
    } finally {
      setTestingRequest(false);
    }
  };

  const codeSnippets = {
    TYPESCRIPT: `import { ScopeClient } from "@scope-firewall/sdk";

const scope = new ScopeClient({
  apiKey: process.env.SCOPE_API_KEY,
  agentWallet: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
});

// Autonomous agent proposes procurement action
const response = await scope.executions.propose({
  agentId: "atlas",
  target: "${deployments.contracts.SafeMerchant}",
  recipient: "${deployments.demoAccounts.supplier}",
  asset: "${deployments.contracts.MockUSDC}",
  amount: 480.0,
});

if (response.decision === "ALLOW") {
  console.log("Policy satisfied. Onchain transaction hash:", response.txHash);
} else {
  console.error("Execution blocked by firewall:", response.reason);
}`,
    PYTHON: `import os
import requests

SCOPE_API_KEY = os.getenv("SCOPE_API_KEY")

payload = {
    "agentId": "atlas",
    "target": "${deployments.contracts.SafeMerchant}",
    "recipient": "${deployments.demoAccounts.supplier}",
    "asset": "${deployments.contracts.MockUSDC}",
    "amount": "480.00"
}

headers = {
    "Authorization": f"Bearer {SCOPE_API_KEY}",
    "Content-Type": "application/json"
}

response = requests.post("https://api.scope.network/v1/executions/propose", json=payload, headers=headers)
data = response.json()

print(f"Firewall Decision: {data['decision']}")
if data['decision'] == "ALLOW":
    print(f"Executed onchain: {data['txHash']}")
else:
    print(f"Reverted onchain: {data['reason']}")`,
    CURL: `curl -X POST https://api.scope.network/v1/executions/propose \\
  -H "Authorization: Bearer sk_live_scope_••••••••••••9f42" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "atlas",
    "target": "${deployments.contracts.SafeMerchant}",
    "recipient": "${deployments.demoAccounts.supplier}",
    "asset": "${deployments.contracts.MockUSDC}",
    "amount": "480"
  }'`,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Developer API & SDK</h1>
            <span className="rounded-md bg-accent-light px-2 py-0.5 text-xs font-semibold text-accent font-mono">
              Agent Execution Firewall Gateway
            </span>
          </div>
          <p className="text-xs text-secondary mt-1">
            Integrate autonomous AI agents with SCOPE execution envelopes via REST API or client libraries.
          </p>
        </div>

        <button
          onClick={handleTestRequest}
          disabled={testingRequest}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-surface shadow hover:bg-primary-hover transition-colors"
        >
          {testingRequest ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Executing Request...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" />
              <span>Test Live Request</span>
            </>
          )}
        </button>
      </div>

      {/* Production API Keys Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-bold text-primary">Scoped Production API Keys</h2>
          </div>
          <span className="text-[11px] text-secondary font-mono">Never expose secret keys client-side</span>
        </div>

        {keys.map((k) => (
          <div
            key={k.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg bg-background border border-border"
          >
            <div>
              <div className="text-xs font-bold text-primary">{k.name}</div>
              <div className="font-mono text-xs text-secondary mt-0.5">{k.maskedKey}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleRotate(k.id)}
                className="inline-flex items-center gap-1 rounded border border-border bg-surface px-2.5 py-1 text-[11px] font-semibold text-secondary hover:text-primary transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Rotate Key</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SDK Snippets & Interactive Runner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left: Code Snippets */}
        <div className="rounded-xl border border-border bg-surface overflow-hidden shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-background">
            <div className="flex items-center gap-1">
              {(["TYPESCRIPT", "PYTHON", "CURL"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-primary text-surface font-semibold"
                      : "text-secondary hover:text-primary"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(codeSnippets[activeTab]);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="text-xs font-mono text-secondary hover:text-primary flex items-center gap-1"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>

          <div className="p-4 overflow-x-auto">
            <pre className="text-xs font-mono text-primary leading-relaxed whitespace-pre">
              {codeSnippets[activeTab]}
            </pre>
          </div>
        </div>

        {/* Right: Live Response Output */}
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="h-4 w-4 text-accent" />
              <h3 className="text-sm font-bold text-primary">Live API Response: POST /api/v1/executions/propose</h3>
            </div>
            {apiResponse && (
              <span className="rounded bg-success-surface border border-success-border px-2 py-0.2 text-[10px] font-semibold text-success font-mono">
                200 OK
              </span>
            )}
          </div>

          {apiResponse ? (
            <div className="p-4 rounded-lg bg-background border border-border overflow-x-auto max-h-[420px]">
              <pre className="text-xs font-mono text-primary leading-relaxed whitespace-pre">
                {apiResponse}
              </pre>
            </div>
          ) : (
            <div className="p-12 text-center text-secondary text-xs font-mono space-y-2">
              <div>Click "Test Live Request" above to trigger a test proposal.</div>
              <div className="text-[11px] text-secondary-light">
                Verifies target, asset, amount, recipient against active policy.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
