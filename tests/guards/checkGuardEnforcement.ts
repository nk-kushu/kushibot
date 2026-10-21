import { GuardRegistry } from "../../src/guards/GuardRegistry.js";
import { GuardRunner } from "../../src/guards/GuardRunner.js";
import { BoundedGuardCheckRunner } from "../../src/guards/BoundedGuardCheckRunner.js";
import { GuardEnforcementPolicy } from "../../src/guards/GuardEnforcementPolicy.js";
import { GuardGuidanceComposer } from "../../src/guards/GuardGuidanceComposer.js";
import { RecordedLintCheck } from "../../src/guards/checks/RecordedLintCheck.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { createLintGuard } from "../../examples/guards/createLintGuard.js";
export async function checkGuardEnforcement(): Promise<void> {
  const registry = new GuardRegistry(); let exitCode = 0;
  registry.registerCheck(new RecordedLintCheck({ async read(_ref, target) { return { checkId: "eslint", checkVersion: "1", revisionRef: target.revisionRef, exitCode, evidenceRef: "artifact:lint-report" }; } }, "verification:lint"));
  registry.registerGuard(createLintGuard());
  const selection = { schemaVersion: 1 as const, guards: [registry.guard("lint")], unresolvedGuardIds: [], pendingOperationRefs: [] };
  const target = { workspaceId: "workspace", revisionRef: "revision-one", artifactRefs: ["artifact:source-snapshot"] };
  const context = { identity: { operationId: "guard-batch" }, scope: { scopeId: "scope", projectId: "project", workspaceId: "workspace" }, signal: new AbortController().signal, deadlineEpochMs: 1000, reporter: { async progress() {} } };
  const clock = { nowEpochMs: () => 100 }; let id = 0;
  const runner = new GuardRunner(registry, { async verify() { return true; } }, { async verify(refs) { return refs.every(ref => ref === "artifact:lint-report"); } }, new BoundedGuardCheckRunner(clock, 100), new JsonValueContract(), clock, { nextId: () => `check-${++id}` });
  const policy = new GuardEnforcementPolicy(registry, ["lint"]);
  const passing = await runner.run(selection, target, context);
  if ((await policy.apply({ ...passing, expectedTarget: target })).action !== "accept") throw new Error("Valid fixture receipt rejected.");
  exitCode = 1;
  const failing = await runner.run(selection, target, context);
  if ((await policy.apply({ ...failing, expectedTarget: target })).action !== "request-fix") throw new Error("Lint failure accepted.");
  if ((await policy.apply({ ...passing, report: { ...passing.report, checks: [] }, expectedTarget: target })).action !== "stop") throw new Error("Missing coverage accepted.");
  if ((await policy.apply({ ...passing, expectedTarget: { ...target, revisionRef: "revision-two" } })).action !== "stop") throw new Error("Stale evidence accepted.");
  if ((await policy.apply({ ...passing, report: { ...passing.report, selection: { ...selection, guards: [] } }, expectedTarget: target })).action !== "stop") throw new Error("Required guard removed.");
  if (new GuardGuidanceComposer(registry, []).compose(selection)[0].guardId !== "lint") throw new Error("Pinned guidance missing.");
  let conflict = false; try { new GuardGuidanceComposer(registry, [["lint", "lint"]]).compose(selection); } catch { conflict = true; }
  if (!conflict) throw new Error("Configured guidance conflict ignored.");
}
