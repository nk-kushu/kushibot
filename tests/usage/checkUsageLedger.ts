import { UsageLedger } from "../../src/usage/UsageLedger.js";
import { zeroUsage } from "../../src/usage/zeroUsage.js";
export function checkUsageLedger(): void {
  const limits = { ...zeroUsage, toolCalls: 2, inputTokens: 10 };
  const ledger = new UsageLedger({ schemaVersion: 1, scopes: [{ id: "run", parentId: null, limits }], reservations: [] });
  ledger.addScope({ id: "child", parentId: "run", limits });
  const request = { ...zeroUsage, toolCalls: 1 };
  if (!ledger.reserve("one", "child", request).admitted) throw new Error("First call denied.");
  ledger.markUnknown("one");
  if (!ledger.reserve("two", "run", request).admitted || ledger.reserve("three", "child", request).admitted) throw new Error("Parent allowance bypassed.");
  const replay = ledger.reserve("one", "child", request);
  if (!replay.admitted || !replay.replayed || replay.reservation.status !== "unknown") throw new Error("Replay lost uncertainty.");
  ledger.settle("one", request); ledger.settle("one", request);
  ledger.settle("two", { ...zeroUsage, toolCalls: 2 });
  const restored = new UsageLedger(ledger.snapshot());
  if (restored.totals("run").consumed.toolCalls !== 3 || restored.reserve("four", "run", request).admitted) throw new Error("Overage disappeared.");
  let rejected = false;
  try { ledger.addScope({ id: "oversized", parentId: "run", limits: { ...limits, toolCalls: 3 } }); } catch { rejected = true; }
  if (!rejected || !Object.isFrozen(ledger.snapshot().reservations)) throw new Error("Scope or snapshot validation failed.");
}
