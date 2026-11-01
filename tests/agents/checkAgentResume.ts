import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  Agent,
  AgentRuntimeFactory,
  ExecutorRegistration,
  ExecutorRegistry,
  JsonValueContract,
  NodeSqliteDatabase,
  SqlAgentStoreFactory,
  StepPolicyRegistry,
  WorkflowPolicyRegistry,
  WorkflowWait,
  sqliteUsageLedgerStatements,
  sqliteWorkflowRunStatements,
} from "../../src/index.js";
import type {
  ExecutionOutcome,
  IAgentSetupInput,
  IAgentWorkflow,
  IExecutor,
  IModelGateway,
  IPolicy,
  IResultContract,
  JsonValue,
  ModelProfile,
  WorkflowDefinition,
} from "../../src/index.js";

const profile: ModelProfile = {
  id: "resume-test",
  providerId: "openai",
  modelId: "test",
  contextTokens: 1000,
  maxOutputTokens: 100,
  maxRequestBytes: 65_536,
  maxResponseBytes: 65_536,
  supportsPromptCacheKey: false,
};
const gateway: IModelGateway = {
  generate: async () => {
    throw new Error("No model call is expected.");
  },
};
const anything: IResultContract<JsonValue> = {
  id: "anything",
  version: "1",
  validate: async (value) => ({ valid: true, value: value as JsonValue }),
};

/** Steps ask / finish; `ask` waits until `answers` holds a reply, which outlives each Agent. */
class AskingWorkflow implements IPolicy<IAgentSetupInput<JsonValue>, IAgentWorkflow<JsonValue>> {
  readonly calls = { ask: 0, finish: 0 };
  constructor(private readonly answers: Map<string, string>) {}
  async apply({ runtime }: IAgentSetupInput<JsonValue>): Promise<IAgentWorkflow<JsonValue>> {
    const json = new JsonValueContract();
    const clock = runtime.clock;
    const ask: IExecutor<JsonValue, JsonValue> = {
      execute: async (): Promise<ExecutionOutcome<JsonValue>> => {
        this.calls.ask++;
        const count = this.answers.size;
        return count === 2
          ? { status: "completed", result: [...this.answers.values()] }
          : WorkflowWait.outcome(`wait:q${count}`, `Question ${count}`);
      },
    };
    const finish: IExecutor<JsonValue, JsonValue> = {
      execute: async () => {
        this.calls.finish++;
        return { status: "completed", result: "done" };
      },
    };
    const executors = new ExecutorRegistry();
    const register = (id: string, executor: IExecutor<JsonValue, JsonValue>) =>
      executors.register(
        new ExecutorRegistration({
          id,
          version: "1",
          input: anything,
          result: anything,
          executor,
          json,
          clock,
        }),
      );
    register("ask", ask);
    register("finish", finish);
    const policies = new StepPolicyRegistry();
    const refs = {
      input: { id: "input", version: "1" },
      accept: { id: "accept", version: "1" },
      wait: { id: "wait", version: "1" },
      complete: { id: "complete", version: "1" },
    };
    policies.registerInput(refs.input, { apply: async ({ request }) => request });
    policies.registerAcceptance(refs.accept, { apply: async () => ({ status: "accepted" }) });
    const workflowPolicies = new WorkflowPolicyRegistry();
    workflowPolicies.registerTransition(refs.wait, {
      apply: async ({ trigger }) => ({ take: trigger.outcome.status === "stopped" }),
    });
    workflowPolicies.registerCompletion(refs.complete, {
      apply: async () => ({ accepted: true }),
    });
    const definition: WorkflowDefinition = {
      id: "asking",
      version: "1",
      maxTotalAttempts: 16,
      transitions: [
        { id: "ask-again", fromStepId: "ask", toStepId: "ask", policy: refs.wait, maxTraversals: 8 },
      ],
      steps: [
        {
          id: "ask",
          dependencies: [],
          executor: executors.resolve("ask", "1").metadata,
          inputPolicy: refs.input,
          acceptancePolicy: refs.accept,
          maxAttempts: 16,
        },
        {
          id: "finish",
          dependencies: ["ask"],
          executor: executors.resolve("finish", "1").metadata,
          inputPolicy: refs.input,
          acceptancePolicy: refs.accept,
          maxAttempts: 2,
        },
      ],
    };
    return {
      definition,
      executors,
      policies,
      workflowPolicies,
      completionPolicy: refs.complete,
      evidence: { apply: async () => true },
      resultPolicy: {
        apply: async (result) => result.results.find((item) => item.stepId === "ask")!.result,
      },
      resultContract: anything,
    };
  }
}

export async function checkAgentResume(): Promise<void> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "kushibot-resume-"));
  const answers = new Map<string, string>();
  const open = () => {
    const database = new NodeSqliteDatabase(path.join(directory, "run.sqlite"));
    const workflow = new AskingWorkflow(answers);
    const agent = new Agent<JsonValue, JsonValue>({
      id: "asking",
      requestContract: anything,
      workflow,
      suspendable: true,
      runtime: new AgentRuntimeFactory({
        gateway,
        profile,
        limits: { fixes: 8 },
        timeoutMs: 1000,
        stores: new SqlAgentStoreFactory({
          database,
          workflow: sqliteWorkflowRunStatements,
          usage: sqliteUsageLedgerStatements,
        }),
      }),
    });
    return { agent, workflow, close: () => database.close() };
  };
  try {
    // Each process owns its Agent and database connection, as a restarted worker would.
    const first = open();
    const waiting = await first.agent.run("task");
    assert.equal(waiting.outcome.status, "pending");
    assert.equal(waiting.result, null);
    assert.equal(waiting.snapshot.deadlineEpochMs, null, "A wait must not run out a deadline.");
    assert.deepEqual(
      waiting.outcome.status === "pending" ? waiting.outcome.pendingOperationRefs : [],
      ["wait:q0"],
    );
    await first.close();

    const unanswered = open();
    await assert.rejects(
      unanswered.agent.resume(waiting.runId, "task", ["wait:other"]),
      "Resuming must name exactly what the run is waiting for.",
    );
    await unanswered.close();

    answers.set("q0", "first");
    const second = open();
    const again = await second.agent.resume(waiting.runId, "task", ["wait:q0"]);
    assert.equal(again.runId, waiting.runId);
    assert.equal(again.outcome.status, "pending", "A resumed step can wait again.");
    await second.close();

    answers.set("q1", "second");
    const third = open();
    const finished = await third.agent.resume(waiting.runId, "task", ["wait:q1"]);
    assert.equal(finished.outcome.status, "finished");
    assert.deepEqual(finished.result, ["first", "second"]);
    assert.equal(third.workflow.calls.ask, 1, "Accepted work is not repeated.");
    assert.equal(third.workflow.calls.finish, 1);
    assert.equal(finished.usage.reservations.length, 2, "Usage carries across processes.");
    await third.close();

    const done = open();
    await assert.rejects(done.agent.resume(waiting.runId, "task", ["wait:q1"]));
    await done.close();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
