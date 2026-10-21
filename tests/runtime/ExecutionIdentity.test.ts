import { ExecutionIdentityFactory } from "../../src/contracts/runtime/ExecutionIdentityFactory.js";
import { ExecutionIdentityContract } from "../../src/contracts/runtime/ExecutionIdentityContract.js";
import { InvalidExecutionIdentityError } from "../../src/errors/InvalidExecutionIdentityError.js";
import { SequenceIdGenerator } from "../fakes/SequenceIdGenerator.js";

export async function verifyIdentities(): Promise<void> {
  const contract = new ExecutionIdentityContract();
  const factory = new ExecutionIdentityFactory(new SequenceIdGenerator(
    Array.from({ length: 30 }, (_, index) => `fixture-${index + 1}`),
  ), contract);
  const run = await factory.createRun();
  const step = await factory.createStep(run);
  const parent = await factory.createSession(step);
  const child = await factory.createSession(parent);
  const operation = await factory.createOperation(child);
  const direct = await factory.createSession();
  if (step.runId !== run.runId || step.parentOperationId !== run.operationId ||
      child.sessionId === parent.sessionId || child.stepRunId !== step.stepRunId ||
      child.parentOperationId !== parent.operationId || operation.sessionId !== child.sessionId ||
      operation.parentOperationId !== child.operationId || direct.runId !== undefined) {
    throw new Error("Identity linkage was not preserved.");
  }
  for (const invalid of [
    { operationId: "" },
    { operationId: "x", parentOperationId: "x" },
    { operationId: "x", stepRunId: "step-without-run" },
    { operationId: "x", unknown: true },
  ]) {
    if ((await contract.validate(invalid)).valid) throw new Error("Invalid identity accepted.");
  }
  let rejected = false;
  try {
    await factory.createStep(parent);
  } catch (error: unknown) {
    if (!(error instanceof InvalidExecutionIdentityError)) throw error;
    rejected = true;
  }
  if (!rejected) throw new Error("A step must not become another workflow-run parent.");
}
