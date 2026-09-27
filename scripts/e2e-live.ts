/**
 * Live end-to-end verification against the deployed Base Sepolia contracts.
 * Calls the REAL engine (evaluateAndExecute) — the same function the API route uses —
 * for each Attack Lab preset, mirroring the route's preset→params mapping and scenario
 * clock. NORMAL_PURCHASE submits a real onchain transaction; the block scenarios revert
 * in simulate (no tx, no gas) or are stopped by the offchain operational-hours gateway.
 */
import { evaluateAndExecute } from "../lib/execution/engine";
import deployments from "../lib/blockchain/deployments.json";

const D = deployments as any;

function paramsFor(presetId: string) {
  const base = {
    target: D.contracts.SafeMerchant,
    asset: D.contracts.MockUSDC,
    recipient: D.demoAccounts.supplier,
    amount: 480,
    postconditionType: 0,
    postconditionToken: "0x0000000000000000000000000000000000000000",
    postconditionValue: 0,
  };
  switch (presetId) {
    case "COMPROMISED_SUPPLIER":
      return { ...base, recipient: D.demoAccounts.attacker, amount: 480 };
    case "BUDGET_BLEED":
      return { ...base, amount: 700 };
    case "OFF_HOURS":
      return { ...base, amount: 350 };
    case "OUTCOME_SLIPPAGE":
      return {
        ...base,
        recipient: D.contracts.MaliciousMerchant,
        target: D.contracts.MaliciousMerchant,
        amount: 500,
        postconditionType: 1,
        postconditionToken: D.contracts.MockUSDC,
        postconditionValue: 200,
      };
    default:
      return base;
  }
}

function scenarioTime(presetId: string) {
  const inHours = new Date();
  inHours.setUTCHours(14, 0, 0, 0);
  const offHours = new Date();
  offHours.setUTCHours(3, 14, 0, 0);
  return presetId === "OFF_HOURS" ? offHours.toISOString() : inHours.toISOString();
}

async function main() {
  const presets = process.argv.slice(2);
  const list = presets.length ? presets : ["NORMAL_PURCHASE", "COMPROMISED_SUPPLIER", "BUDGET_BLEED", "OFF_HOURS", "OUTCOME_SLIPPAGE"];

  for (const presetId of list) {
    const p = paramsFor(presetId);
    const simulatedTime = scenarioTime(presetId);
    console.log(`\n===== ${presetId} =====`);
    console.log(`  amount=$${p.amount} recipient=${p.recipient.slice(0, 12)}… target=${p.target.slice(0, 12)}… at ${simulatedTime.slice(11, 16)}Z`);
    try {
      const r = await evaluateAndExecute({ ...p, simulatedTime } as any);
      const oc = (r.checks || []).find((c) => c.step === "ONCHAIN_ENFORCEMENT");
      console.log(`  decision=${r.decision}  reason=${r.reason}`);
      console.log(`  capitalMoved=$${r.capitalMoved}  capitalProtected=$${r.capitalProtected}`);
      console.log(`  txHash=${r.txHash ?? "—"}  block=${r.blockNumber ?? "—"}  gas=${r.gasUsed ?? "—"}`);
      if (oc) console.log(`  onchain: ${oc.details}`);
    } catch (e: any) {
      console.log(`  THREW: ${e?.shortMessage || e?.message || e}`);
    }
  }
  console.log("\nDone.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
