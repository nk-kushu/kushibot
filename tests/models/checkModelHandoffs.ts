import { ModelHandoffFactory } from "../../src/models/handoffs/ModelHandoffFactory.js";
import { ModelHandoffContract } from "../../src/models/handoffs/ModelHandoffContract.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { VerificationEscalationPolicy } from "../../src/models/VerificationEscalationPolicy.js";
export async function checkModelHandoffs(): Promise<void> {
  const profile = { id: "fixture", providerId: "fixture", modelId: "fixture-model", contextTokens: 2000, maxOutputTokens: 500, maxRequestBytes: 8192, maxResponseBytes: 8192, supportsPromptCacheKey: false };
  const factory = new ModelHandoffFactory({ nowEpochMs: () => 100 }, { nextId: () => "handoff-one" }, new ModelHandoffContract(new JsonValueContract()));
  const input = { scope: { scopeId: "scope", projectId: "project", workspaceId: "workspace" }, sourceSessionId: "session-one", targetSessionId: "session-two", sourceProfile: profile, targetProfile: profile,
    sourceRevision: "revision-one", assignment: "Diagnose the callback mismatch using saved evidence.", partial: { summary: "Callback mismatch reproduced.", evidenceRefs: ["check:callback"], artifactRefs: ["artifact:diff"], unresolved: ["Correct callback configuration."] },
    pendingOperationRefs: [] as string[], budgetScopeId: "run", deadlineEpochMs: 1000, permissionScopeRef: "permission:read-only" };
  const prepared = await factory.prepare(input);
  if (prepared.kind !== "prepared" || prepared.handoff.partial.unresolved.length !== 1 || !Object.isFrozen(prepared.handoff)) throw new Error("Handoff state lost.");
  const blocked = await factory.prepare({ ...input, pendingOperationRefs: ["operation:unknown"] });
  if (blocked.kind !== "blocked") throw new Error("Uncertain effects ignored.");
  let rejected = false; try { await factory.prepare({ ...input, targetSessionId: "session-one" }); } catch { rejected = true; }
  if (!rejected) throw new Error("Live-session mutation allowed.");
  const policy = new VerificationEscalationPolicy(2, 1);
  if ((await policy.apply({ consecutiveFailures: 2, escalationsUsed: 0, failedCheckRefs: ["check:callback"], pendingOperationRefs: [] })).action !== "request-handoff") throw new Error("Escalation threshold ignored.");
  if ((await policy.apply({ consecutiveFailures: 2, escalationsUsed: 1, failedCheckRefs: ["check:callback"], pendingOperationRefs: [] })).action !== "stop") throw new Error("Escalation cap ignored.");
}
