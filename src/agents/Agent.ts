import type { AgentOptions, AgentRunOptions, AgentRunResult } from "./AgentContracts.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { WorkflowDefinitionRegistry } from "../workflows/WorkflowDefinitionRegistry.js";
import { WorkflowDefinitionContract } from "../workflows/WorkflowDefinitionContract.js";
import { WorkflowRun } from "../workflows/WorkflowRun.js";
import { WorkflowStepRunnerFactory } from "../workflows/WorkflowStepRunnerFactory.js";
import { WorkflowEngine } from "../workflows/WorkflowEngine.js";

/** A reusable application boundary over the workflow engine; behavior is injected by composition. */
export class Agent<TTask, TResult> {
  readonly id: string;
  private readonly options: AgentOptions<TTask, TResult>;
  private running = false;
  constructor(options: AgentOptions<TTask, TResult>) {
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(options.id)) throw new Error("Invalid agent ID.");
    this.id = options.id;
    this.options = Object.freeze({ ...options });
  }
  async run(task: TTask, controls: AgentRunOptions = {}): Promise<AgentRunResult<TResult>> {
    if (this.running) throw new Error("This agent is already running.");
    this.running = true;
    try {
      return await this.execute(task, controls);
    } finally {
      this.running = false;
    }
  }
  private async execute(task: TTask, controls: AgentRunOptions): Promise<AgentRunResult<TResult>> {
    const json = new JsonValueContract();
    const checked = await this.options.requestContract.validate(task);
    if (!checked.valid) throw new Error("Agent task failed its request contract.");
    const request = await json.validate(checked.value);
    if (!request.valid) throw new Error("Agent task must be finite JSON.");
    const runtime = await this.options.runtime.create(this.id, controls);
    runtime.context.signal.throwIfAborted();
    const workflow = await this.options.workflow.apply({ task: checked.value, runtime });
    const definitions = new WorkflowDefinitionRegistry(
      new WorkflowDefinitionContract(json),
      workflow.executors,
      workflow.policies,
    );
    await definitions.register(workflow.definition);
    const runId = runtime.context.identity.runId!;
    await runtime.stores.workflow.initialize(
      WorkflowRun.create({
        runId,
        scope: runtime.context.scope,
        definition: workflow.definition,
        request: request.value,
        completionPolicy: workflow.completionPolicy,
        budgetScopeId: runtime.budgetScopeId,
        deadlineEpochMs: runtime.context.deadlineEpochMs,
      }),
    );
    const runners = new WorkflowStepRunnerFactory(
      definitions,
      workflow.executors,
      workflow.policies,
      runtime.ids,
      runtime.clock,
    );
    const engine = new WorkflowEngine(
      runtime.stores.workflow,
      runners,
      workflow.workflowPolicies,
      workflow.evidence,
      runtime.stores.usage,
      runtime.ids,
      runtime.clock,
      json,
    );
    const outcome = await engine.run(runtime.context);
    let result: TResult | null = null;
    if (outcome.status === "finished" && outcome.outcome.status === "completed") {
      const mapped = await workflow.resultContract.validate(
        await workflow.resultPolicy.apply(outcome.outcome.result),
      );
      if (!mapped.valid) throw new Error("Agent result failed its result contract.");
      result = mapped.value;
    }
    return {
      runId,
      result,
      outcome,
      snapshot: await runtime.stores.workflow.read(),
      usage: await runtime.stores.usage.read(),
      journal: (await runtime.stores.readJournal?.()) ?? [],
      artifacts: workflow.artifacts?.() ?? {},
    };
  }
}
