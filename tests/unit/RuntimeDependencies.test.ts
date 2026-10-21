import { FixedClock } from "../fakes/FixedClock.js";
import { SequenceIdGenerator } from "../fakes/SequenceIdGenerator.js";
import { RecordingExecutionReporter } from "../fakes/RecordingExecutionReporter.js";

export async function verifyRuntimeDependencies(): Promise<void> {
  const clock = new FixedClock(1000);
  if (clock.nowEpochMs() !== 1000 || clock.nowEpochMs() !== 1000) {
    throw new Error("The fixture clock must remain deterministic.");
  }
  const supplied = ["op-1", "op-2"];
  const ids = new SequenceIdGenerator(supplied);
  supplied[0] = "changed-after-construction";
  if (ids.nextId() !== "op-1" || ids.nextId() !== "op-2") {
    throw new Error("Identifiers must follow the copied fixture sequence.");
  }
  let exhausted = false;
  try {
    ids.nextId();
  } catch (error: unknown) {
    if (!(error instanceof Error) || error.message !== "Test identifier sequence exhausted.") {
      throw error;
    }
    exhausted = true;
  }
  if (!exhausted) throw new Error("Sequence exhaustion must be explicit.");

  const reporter = new RecordingExecutionReporter();
  await reporter.progress("Inspected session creation.");
  const snapshot = reporter.snapshot();
  await reporter.progress("Reached the iteration limit.");
  if (snapshot.length !== 1 || reporter.snapshot().length !== 2) {
    throw new Error("Reporter snapshots must not share the mutable internal array.");
  }
}
