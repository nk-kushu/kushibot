import { ToolRegistry } from "../../src/tools/ToolRegistry.js";
import { ToolDispatcher } from "../../src/tools/ToolDispatcher.js";
import { BoundedToolRunner } from "../../src/tools/BoundedToolRunner.js";
import { ReadSourceTool } from "../../src/tools/source/ReadSourceTool.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { MemoryToolOperationJournal } from "../fakes/MemoryToolOperationJournal.js";
import { UsageLedger } from "../../src/usage/UsageLedger.js";
import { zeroUsage } from "../../src/usage/zeroUsage.js";
export async function checkToolDispatcher(): Promise<void> {
  const json = new JsonValueContract(); const registry = new ToolRegistry(json); let reads = 0;
  await registry.register(new ReadSourceTool({ async read() { reads++; return "export const login = true;"; } }));
  const ledger = new UsageLedger({ schemaVersion: 1, scopes: [{ id: "run", parentId: null, limits: { ...zeroUsage, toolCalls: 1 } }], reservations: [] });
  const store = { async initialize() {}, async read() { return ledger.snapshot(); }, async mutate<T>(change: (value: UsageLedger) => T) { return change(ledger); } };
  const scope = { scopeId: "scope", projectId: "project" }; const clock = { nowEpochMs: () => 100 }; let id = 0;
  let permitted = true;
  const dispatcher = new ToolDispatcher(registry, { async authorize() { return permitted; } }, new MemoryToolOperationJournal(), store, "run", scope, ["read-source"], clock, { nextId: () => `claim-${++id}` }, new BoundedToolRunner(clock), json, 100);
  const context = { identity: { operationId: "read-one" }, scope, signal: new AbortController().signal, deadlineEpochMs: 1000, reporter: { async progress() {} } };
  const request = { operationId: "read-one", toolId: "read-source", arguments: { sourceRef: "source:login.ts", maxBytes: 1024 } };
  if ((await dispatcher.dispatch({ ...request, arguments: { path: "/outside" } }, context)).status !== "rejected" || reads !== 0) throw new Error("Invalid arguments dispatched.");
  permitted = false;
  if ((await dispatcher.dispatch(request, context)).status !== "rejected" || reads !== 0) throw new Error("Forbidden tool dispatched.");
  permitted = true;
  const first = await dispatcher.dispatch(request, context); const replay = await dispatcher.dispatch(request, context);
  if (first.status !== "completed" || first.replayed || replay.status !== "completed" || !replay.replayed || Number(reads) !== 1 || ledger.totals("run").consumed.toolCalls !== 1) throw new Error("Replay repeated execution or charge.");
  const denied = await dispatcher.dispatch({ ...request, operationId: "read-two" }, { ...context, identity: { operationId: "read-two" } });
  if (denied.status !== "stopped" || Number(reads) !== 1) throw new Error("Exhausted allowance dispatched.");
  if ((await dispatcher.dispatch(request, { ...context, deadlineEpochMs: 100 })).status !== "stopped") throw new Error("Expired deadline ignored.");
}
