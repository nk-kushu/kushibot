import type { IAgentOptions } from "./IAgentOptions.js";
import type { IAgentRunOptions } from "./IAgentRunOptions.js";
import type { IAgentRunResult } from "./IAgentRunResult.js";
import { JsonValueContract } from "../persistence/JsonValueContract.js";
import { WorkflowDefinitionRegistry } from "../workflows/WorkflowDefinitionRegistry.js";
import { WorkflowDefinitionContract } from "../workflows/WorkflowDefinitionContract.js";
import { WorkflowRun } from "../workflows/WorkflowRun.js";
import { WorkflowStepRunnerFactory } from "../workflows/WorkflowStepRunnerFactory.js";
import { WorkflowEngine } from "../workflows/WorkflowEngine.js";

/** A reusable application boundary over the workflow engine; behavior is injected by composition. */
export class Agent<TTask, TResult> {
  readonly id: string;
  private readonly options: IAgentOptions<TTask, TResult>;
  private running = false;

  /**
   * Configures an agent with its task contract, workflow policy, and runtime factory.
   * Validates the agent ID and freezes a shallow copy of the options; injected
   * collaborators remain externally owned. Construction does not start a run.
   *
   * @throws If the ID is not 1–128 letters, digits, underscores, periods, colons, or hyphens.
   */
  constructor(options: IAgentOptions<TTask, TResult>) {
    if (!/^[A-Za-z0-9_.:-]{1,128}$/.test(options.id)) throw new Error("Invalid agent ID.");
    this.id = options.id;
    this.options = Object.freeze({ ...options });
  }

  /**
   * Starts a fresh invocation with optional cancellation and progress reporting.
   * Allows one invocation at a time per instance and releases that restriction
   * whether execution returns or throws, so the instance can be used again.
   *
   * A resolved promise does not imply success: inspect the returned engine outcome.
   * The typed result is populated only for a successfully completed workflow.
   *
   * @throws If another invocation is active, or validation, setup, execution,
   * result mapping, or collection of run evidence throws.
   */
  async run(task: TTask, controls: IAgentRunOptions = {}): Promise<IAgentRunResult<TResult>> {
    if (this.running) throw new Error("This agent is already running.");
    this.running = true;
    try {
      return await this.execute(task, controls);
    } finally {
      this.running = false;
    }
  }

  /**
   * Validates the task as contract-approved finite JSON, creates a per-run runtime,
   * and asks the application's workflow policy to bind its executors and policies.
   * Registers that definition, initializes the workflow store, and delegates
   * execution to Kushibot's workflow engine under the runtime's controls and budget.
   *
   * On successful completion, maps and validates the application's typed result.
   * Other engine outcomes retain a null result. Returns the outcome alongside
   * workflow and usage snapshots, available journal entries, and application artifacts.
   * Storage durability is determined by the injected runtime's store adapters.
   *
   * Validation failures and collaborator errors propagate to the caller; this
   * method does not roll back tool side effects or retry unresolved operations.
   */
  private async execute(
    task: TTask,
    controls: IAgentRunOptions,
  ): Promise<IAgentRunResult<TResult>> {
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
      runtime.debug,
    );
    const outcome = await runtime.debug.operation("agent.run", () => engine.run(runtime.context), {
      relatedRefs: [
        `agent:${this.id}`,
        `workflow:${workflow.definition.id}@${workflow.definition.version}`,
      ],
    });
    runtime.debug.event(
      "progress.reported",
      outcome.status === "finished" && outcome.outcome.status === "completed" ? "info" : "warn",
      {
        operation: "agent.outcome",
        nextState: outcome.status === "finished" ? outcome.outcome.status : outcome.status,
        ...(outcome.status === "finished" && outcome.outcome.status === "stopped"
          ? { relatedRefs: [`reason:${outcome.outcome.reason.code}`] }
          : {}),
      },
    );
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
