import { ModelProfileRegistry } from "../../src/models/ModelProfileRegistry.js";
import { RoutingContextResolver } from "../../src/models/RoutingContextResolver.js";
import { DecisionAssistedModelRoutingPolicy } from "../../src/models/DecisionAssistedModelRoutingPolicy.js";
import { RoleBasedModelRoutingPolicy } from "../../src/models/RoleBasedModelRoutingPolicy.js";
import type { DecisionOutcome } from "../../src/decisions/DecisionOutcome.js";
export async function checkDecisionAssistedRouting(): Promise<void> {
  const registry = new ModelProfileRegistry();
  for (const id of ["first", "second"]) registry.register({ profile: { id, providerId: "fixture", modelId: id, contextTokens: 1000, maxOutputTokens: 100, maxRequestBytes: 4096, maxResponseBytes: 4096, supportsPromptCacheKey: false }, capabilities: ["text"] });
  const context = new RoutingContextResolver(registry).resolve("planning", [{ allowedProfileIds: ["first", "second"], preferredProfileIds: ["first"], allowFallback: true }]);
  const control = { operationId: "routing-decision", signal: new AbortController().signal, deadlineEpochMs: null, timeoutMs: 100 };
  const input = { context, candidates: [registry.resolve("first"), registry.resolve("second")], control };
  let calls = 0;
  let outcome: DecisionOutcome = { status: "answered", answer: { kind: "answered", choice: "second", supportingRefs: [] } };
  const policy = new DecisionAssistedModelRoutingPolicy({ async evaluate() { calls++; return outcome; } }, new RoleBasedModelRoutingPolicy());
  const selected = await policy.apply(input);
  if (selected.kind !== "selected" || selected.profileId !== "second" || calls !== 1) throw new Error("Recommendation not used once.");
  await policy.apply({ ...input, candidates: [registry.resolve("first")] });
  if (calls !== 1) throw new Error("Single candidate used a paid decision.");
  outcome = { status: "abstained" };
  const fallback = await policy.apply(input);
  if (fallback.kind !== "selected" || fallback.profileId !== "first" || fallback.reasonCode !== "RECOMMENDATION_FALLBACK") throw new Error("Configured fallback lost.");
  if ((await policy.apply({ ...input, context: { ...context, allowFallback: false } })).kind !== "unavailable") throw new Error("Unapproved fallback used.");
  outcome = { status: "stopped", reason: { code: "cancelled", message: "Cancelled." } };
  if ((await policy.apply(input)).kind !== "stopped") throw new Error("Cancellation became fallback.");
  outcome = { status: "uncertain", operationId: "routing-decision" };
  if ((await policy.apply(input)).kind !== "uncertain") throw new Error("Pending operation hidden.");
}
