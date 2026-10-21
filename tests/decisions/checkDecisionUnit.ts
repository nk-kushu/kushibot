import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { DecisionRequestContract } from "../../src/decisions/DecisionRequestContract.js";
import { BoundedDecisionUnit } from "../../src/decisions/BoundedDecisionUnit.js";
import { FakeDecisionProvider } from "../fakes/FakeDecisionProvider.js";
import { ReviewSelectionPolicy } from "../../examples/decisions/ReviewSelectionPolicy.js";
import type { DecisionProviderResult } from "../../src/decisions/DecisionProviderResult.js";
export async function checkDecisionUnit(): Promise<void> {
  const json = new JsonValueContract();
  const request = { purpose: "select-review", question: "Choose review.", options: ["authentication", "none"], evidence: [{ ref: "evidence:one", text: "OAuth handler changed." }] };
  const control = { operationId: "decision-one", signal: new AbortController().signal, deadlineEpochMs: null, timeoutMs: 100 };
  const check = async (result: DecisionProviderResult) => new BoundedDecisionUnit(new FakeDecisionProvider(result), new DecisionRequestContract(json), json, { nowEpochMs: () => 100 }).evaluate(request, control);
  const answered = await check({ status: "output", value: { kind: "answered", choice: "authentication", supportingRefs: ["evidence:one"] } });
  if (answered.status !== "answered") throw new Error("Valid answer rejected.");
  if ((await check({ status: "output", value: { kind: "answered", choice: "admin", supportingRefs: [] } })).status !== "invalid-output") throw new Error("Unknown choice accepted.");
  if ((await check({ status: "output", value: { kind: "answered", choice: "authentication", supportingRefs: ["invented"] } })).status !== "invalid-output") throw new Error("Invented source accepted.");
  const none = await check({ status: "output", value: { kind: "answered", choice: "none", supportingRefs: [] } });
  if (none.status !== "answered" || (await check({ status: "output", value: { kind: "abstained", supportingRefs: [] } })).status !== "abstained" || (await check({ status: "unavailable" })).status !== "unavailable") throw new Error("Outcome meanings collapsed.");
  const provider = new FakeDecisionProvider({ status: "unavailable" }); const abort = new AbortController(); abort.abort();
  const stopped = await new BoundedDecisionUnit(provider, new DecisionRequestContract(json), json, { nowEpochMs: () => 100 }).evaluate(request, { ...control, signal: abort.signal });
  if (stopped.status !== "stopped" || provider.count() !== 0) throw new Error("Cancelled decision dispatched.");
  const policy = new ReviewSelectionPolicy(new Map([["authentication", ["auth-review"]], ["none", []]]), ["safe-fallback-review"]);
  const selection = await policy.apply({ requiredChecks: ["mandatory-auth"], outcome: none });
  if (selection.requiredChecks[0] !== "mandatory-auth" || selection.additionalChecks.length !== 0 || selection.source !== "decision") throw new Error("None removed a required check or became fallback.");
  const fallback = await policy.apply({ requiredChecks: ["mandatory-auth"], outcome: { status: "unavailable", code: "UNAVAILABLE" } });
  if (fallback.source !== "fallback" || fallback.additionalChecks[0] !== "safe-fallback-review") throw new Error("Explicit fallback lost.");
}
