import {
  ExecutionIdentityContract,
  ExecutionIdentityFactory,
  ExecutionLifecycle,
  agenticSessionLifecycle,
} from "../../src/index.js";
import { ExampleIdGenerator } from "../configuration/ExampleIdGenerator.js";

async function main(): Promise<void> {
  const identities = new ExecutionIdentityFactory(new ExampleIdGenerator(), new ExecutionIdentityContract());
  const run = await identities.createRun();
  const step = await identities.createStep(run);
  const session = await identities.createSession(step);
  const operation = await identities.createOperation(session);
  if (session.sessionId === undefined) throw new Error("Expected a session identity.");
  const lifecycle = ExecutionLifecycle.create(agenticSessionLifecycle, session.sessionId);
  lifecycle.transition("active");
  lifecycle.recordPendingOperation(operation.operationId);
  lifecycle.transition("interrupted");
  const serialized = JSON.stringify(lifecycle.snapshot());
  const restored = await ExecutionLifecycle.restore(agenticSessionLifecycle, JSON.parse(serialized) as unknown);
  restored.transition("recovering");
  // Fixture only: production coordinators reconcile actual effects and usage first.
  restored.recordReconciledOperation(operation.operationId);
  restored.transition("active");
  restored.transition("stopped");
  console.log({ run, step, session, lifecycle: restored.snapshot() });
}

void main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
