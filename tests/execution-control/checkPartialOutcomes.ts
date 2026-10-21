import { ExecutionBoundaryGuard } from "../../src/execution-control/ExecutionBoundaryGuard.js";
import { ProgressGuard } from "../../src/execution-control/ProgressGuard.js";
import { PartialOutcomeFactory } from "../../src/execution-control/PartialOutcomeFactory.js";
export function checkPartialOutcomes(): void {
  const abort = new AbortController(); let now = 9;
  const guard = new ExecutionBoundaryGuard({ nowEpochMs: () => now }, abort.signal, 10);
  if (guard.check() !== null) throw new Error("Early deadline.");
  now = 10;
  if (guard.check()?.code !== "deadline-reached") throw new Error("Deadline boundary ignored.");
  abort.abort(); if (guard.check()?.code !== "cancelled") throw new Error("Cancellation ignored.");
  const progress = new ProgressGuard(2);
  if (progress.observe("same") !== null || progress.observe("same")?.code !== "no-progress") throw new Error("No-progress limit ignored.");
  const refs = ["saved:one"];
  const outcome = new PartialOutcomeFactory().stopped<string>({ code: "limit-reached", message: "Allowance unavailable." }, {
    partial: { summary: "One finding saved.", evidenceRefs: refs, artifactRefs: [], unresolved: ["Verification remains."] }, pendingOperationRefs: ["operation:uncertain"],
  });
  refs.push("later");
  if (outcome.status !== "stopped" || outcome.partial.evidenceRefs.length !== 1 || outcome.pendingOperationRefs.length !== 1 || outcome.partial.unresolved.length !== 1) throw new Error("Partial work changed.");
}
