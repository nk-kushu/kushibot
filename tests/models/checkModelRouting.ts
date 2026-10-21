import { ModelProfileRegistry } from "../../src/models/ModelProfileRegistry.js";
import { RoutingContextResolver } from "../../src/models/RoutingContextResolver.js";
import { RoutingBudgetReader } from "../../src/models/RoutingBudgetReader.js";
import { ModelEligibilityPolicy } from "../../src/models/ModelEligibilityPolicy.js";
import { RoleBasedModelRoutingPolicy } from "../../src/models/RoleBasedModelRoutingPolicy.js";
import { ModelRouter } from "../../src/models/ModelRouter.js";
import { UsageLedger } from "../../src/usage/UsageLedger.js";
import { zeroUsage } from "../../src/usage/zeroUsage.js";
export async function checkModelRouting(): Promise<void> {
  const registry = new ModelProfileRegistry();
  for (const id of ["planner", "economical-text"]) registry.register({ profile: { id, providerId: "fixture", modelId: `model-${id}`, contextTokens: 2000, maxOutputTokens: 500, maxRequestBytes: 8192, maxResponseBytes: 8192, supportsPromptCacheKey: false }, capabilities: ["text"] });
  const resolver = new RoutingContextResolver(registry);
  const ledger = new UsageLedger({ schemaVersion: 1, scopes: [{ id: "run", parentId: null, limits: { ...zeroUsage, modelCalls: 2, inputTokens: 1000, outputTokens: 200 } }], reservations: [] });
  const budgets = new RoutingBudgetReader({ async initialize() {}, async read() { return ledger.snapshot(); }, async mutate(change) { return change(ledger); } }, "run");
  const clock = { nowEpochMs: () => 100 };
  const control = { operationId: "route-one", signal: new AbortController().signal, deadlineEpochMs: 1000, timeoutMs: 100 };
  const layers = [{ allowedProfileIds: ["planner", "economical-text"], preferredProfileIds: ["economical-text"], inputTokens: 100, outputTokens: 50 }, { preferredProfileIds: ["planner"] }];
  const router = new ModelRouter(registry, resolver, budgets, new ModelEligibilityPolicy(), new RoleBasedModelRoutingPolicy(), clock);
  const selected = await router.route("planning", layers, control);
  if (selected.kind !== "selected" || selected.decision.registration.profile.id !== "planner") throw new Error("Specific preference not resolved.");
  if ((await router.route("coding", [...layers, { requiredCapabilities: ["tools"] }], control)).kind !== "unavailable") throw new Error("Text adapter selected for tools.");
  if ((await router.route("planning", [...layers, { allowedProfileIds: ["economical-text"], explicitProfileId: "planner", allowFallback: false }], control)).kind !== "unavailable") throw new Error("Binding expanded permission.");
  const invalid = new ModelRouter(registry, resolver, budgets, new ModelEligibilityPolicy(), { async apply() { return { kind: "selected", profileId: "invented", policyId: "test", policyVersion: "1", reasonCode: "TEST" }; } }, clock);
  if ((await invalid.route("planning", layers, control)).kind !== "unavailable") throw new Error("Invented profile accepted.");
  const racing = new ModelRouter(registry, resolver, budgets, new ModelEligibilityPolicy(), { async apply() {
    ledger.reserve("competing-call", "run", { ...zeroUsage, modelCalls: 2, inputTokens: 1000, outputTokens: 200 });
    return { kind: "selected", profileId: "planner", policyId: "test", policyVersion: "1", reasonCode: "TEST" };
  } }, clock);
  if ((await racing.route("planning", layers, control)).kind !== "unavailable") throw new Error("Stale allowance accepted after selection.");
}
