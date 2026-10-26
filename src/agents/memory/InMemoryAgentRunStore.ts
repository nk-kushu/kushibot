import { WorkflowRun } from "../../workflows/WorkflowRun.js";
import type { IWorkflowRunStore } from "../../workflows/IWorkflowRunStore.js";
import type { WorkflowRunSnapshot } from "../../workflows/WorkflowRunSnapshot.js";

export class InMemoryAgentRunStore implements IWorkflowRunStore {
  private state: WorkflowRunSnapshot | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  async initialize(initial: WorkflowRunSnapshot): Promise<void> {
    if (this.state) throw new Error("Run store already initialized.");
    this.state = structuredClone(initial);
  }
  async read(): Promise<WorkflowRunSnapshot> {
    await this.queue;
    if (!this.state) throw new Error("Run store not initialized.");
    return structuredClone(this.state);
  }
  mutate<T>(change: (run: WorkflowRun) => T): Promise<T> {
    const operation = this.queue.then(async () => {
      if (!this.state) throw new Error("Run store not initialized.");
      const run = await WorkflowRun.restore(structuredClone(this.state));
      const value = change(run);
      this.state = structuredClone(run.snapshot());
      return value;
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}
