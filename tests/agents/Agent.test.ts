import {
  Agent,
  AgentRuntimeFactory,
  BoundedDebugPublisher,
  DebugHealthCounter,
  DefaultAgentAssignmentPolicy,
  ExecutorRegistration,
  ExecutorRegistry,
  InMemoryAgentStoreFactory,
  JsonValueContract,
  LoggingController,
  ScopedDebugRecorderFactory,
  StepPolicyRegistry,
  StructuredTaskExecutor,
  TaskInputContract,
  WorkflowPolicyRegistry,
} from "../../src/index.js";
import type {
  DebugEvent,
  IScopedDebugRecorderFactory,
  IAgentRunResult,
  IAgentRunStores,
  IAgentSetupInput,
  IAgentWorkflow,
  ExecutionScopeRef,
  IAgentRunStoreFactory,
  IModelGateway,
  IPolicy,
  IResultContract,
  ModelCallControl,
  ModelProfile,
  ModelReply,
  ModelRequest,
  ValidationResult,
} from "../../src/index.js";

type Question = Readonly<{ question: string }>;
type Answer = Readonly<{ answer: string }>;
class QuestionContract implements IResultContract<Question> {
  readonly id = "research-question";
  readonly version = "1";
  async validate(raw: unknown): Promise<ValidationResult<Question>> {
    if (
      typeof raw === "object" &&
      raw !== null &&
      Object.keys(raw).length === 1 &&
      "question" in raw &&
      typeof raw.question === "string" &&
      raw.question.trim()
    )
      return { valid: true, value: { question: raw.question } };
    return {
      valid: false,
      issues: [{ path: [], code: "INVALID_QUESTION", message: "Question is required." }],
    };
  }
}
class AnswerContract implements IResultContract<Answer> {
  readonly id = "research-answer";
  readonly version = "1";
  async validate(raw: unknown): Promise<ValidationResult<Answer>> {
    if (
      typeof raw === "object" &&
      raw !== null &&
      Object.keys(raw).length === 1 &&
      "answer" in raw &&
      typeof raw.answer === "string" &&
      raw.answer.trim()
    )
      return { valid: true, value: { answer: raw.answer } };
    return {
      valid: false,
      issues: [{ path: [], code: "INVALID_ANSWER", message: "Answer is required." }],
    };
  }
}
class ResearchGateway implements IModelGateway {
  calls = 0;
  uncertain = false;
  cancel: AbortController | undefined;
  async generate(request: ModelRequest, _controls: ModelCallControl): Promise<ModelReply> {
    this.calls++;
    this.cancel?.abort();
    const last = JSON.parse(request.messages[request.messages.length - 1].text) as {
      observation?: { value: { answer: string } };
    };
    const action = last.observation
      ? { kind: "final", value: { answer: last.observation.value.answer } }
      : { kind: "tool", toolId: "lookup", arguments: { key: "answer" } };
    return {
      status: "completed",
      text: JSON.stringify(action),
      providerId: "research",
      modelId: "fixture",
      responseId: "response:1",
      errorCode: null,
      usage: this.uncertain
        ? null
        : { inputTokens: 10, outputTokens: 10, cachedInputTokens: null, reasoningTokens: null },
    };
  }
}
class ResearchStores implements IAgentRunStoreFactory {
  readonly runs: string[] = [];
  async create(
    run: Readonly<{ runId: string; scope: ExecutionScopeRef }>,
  ): Promise<IAgentRunStores> {
    this.runs.push(run.runId);
    return new InMemoryAgentStoreFactory().create();
  }
}
class ResearchDefinition implements IPolicy<IAgentSetupInput<Question>, IAgentWorkflow<Answer>> {
  setups = 0;
  toolCalls = 0;
  acceptCompletion = true;
  invalidMapping = false;
  async apply({ task, runtime }: IAgentSetupInput<Question>): Promise<IAgentWorkflow<Answer>> {
    this.setups++;
    const json = new JsonValueContract(),
      tasks = new TaskInputContract(json),
      answers = new AnswerContract();
    const factory = runtime.createTaskFactory(answers, {
      apply: async () => ({
        instructions: "Look up a fact and answer the research question.",
        input: { question: task.question },
        tools: {
          dispatch: async (request) => {
            this.toolCalls++;
            return {
              status: "completed",
              replayed: false,
              observation: {
                operationId: request.operationId,
                toolId: request.toolId,
                toolVersion: "1",
                value: { answer: "42" },
              },
            };
          },
        },
        acceptance: { apply: async () => ({ accepted: true, feedback: "Accepted." }) },
      }),
    });
    const executors = new ExecutorRegistry();
    executors.register(
      new ExecutorRegistration({
        id: "research",
        version: "1",
        input: tasks,
        result: answers,
        executor: new StructuredTaskExecutor({
          input: tasks,
          result: answers,
          policy: new DefaultAgentAssignmentPolicy("Research the supplied question."),
          factory,
          json,
          clock: runtime.clock,
        }),
        json,
        clock: runtime.clock,
      }),
    );
    const policies = new StepPolicyRegistry();
    const inputRef = { id: "research-input", version: "1" },
      acceptRef = { id: "research-accept", version: "1" };
    policies.registerInput(inputRef, {
      apply: async () => ({
        goal: task.question,
        acceptanceCriteria: ["Return an answer"],
        sourceRefs: [],
        filePaths: [],
      }),
    });
    policies.registerAcceptance(acceptRef, { apply: async () => ({ status: "accepted" }) });
    const workflowPolicies = new WorkflowPolicyRegistry(),
      completionPolicy = { id: "research-complete", version: "1" };
    workflowPolicies.registerCompletion(completionPolicy, {
      apply: async () =>
        this.acceptCompletion
          ? { accepted: true }
          : {
              accepted: false,
              code: "RESEARCH_INCOMPLETE",
              message: "Research evidence is incomplete.",
            },
    });
    return {
      definition: {
        id: "research",
        version: "1",
        maxTotalAttempts: 1,
        transitions: [],
        steps: [
          {
            id: "answer",
            dependencies: [],
            executor: executors.resolve("research", "1").metadata,
            inputPolicy: inputRef,
            acceptancePolicy: acceptRef,
            maxAttempts: 1,
          },
        ],
      },
      executors,
      policies,
      workflowPolicies,
      completionPolicy,
      evidence: { apply: async () => true },
      resultPolicy: {
        apply: async (result) => {
          if (this.invalidMapping) return { answer: "" };
          const checked = await answers.validate(result.results[0].result);
          if (!checked.valid) throw new Error("Answer missing.");
          return checked.value;
        },
      },
      resultContract: answers,
    };
  }
}
class ResearchFixture {
  readonly gateway = new ResearchGateway();
  readonly definition = new ResearchDefinition();
  readonly stores = new ResearchStores();
  private readonly profile: ModelProfile = {
    id: "research",
    providerId: "research",
    modelId: "fixture",
    contextTokens: 100_000,
    maxOutputTokens: 4096,
    maxRequestBytes: 1_048_576,
    maxResponseBytes: 1_048_576,
    supportsPromptCacheKey: false,
  };
  create(modelCalls = 10, debug?: IScopedDebugRecorderFactory): Agent<Question, Answer> {
    return new Agent({
      id: "research",
      requestContract: new QuestionContract(),
      workflow: this.definition,
      runtime: new AgentRuntimeFactory({
        gateway: this.gateway,
        profile: this.profile,
        stores: this.stores,
        limits: { modelCalls },
        ...(debug ? { debug } : {}),
      }),
    });
  }
}

export async function verifyAgents(): Promise<void> {
  const fixture = new ResearchFixture(),
    agent = fixture.create();
  const first = await agent.run({ question: "What is the answer?" });
  if (
    first.result?.answer !== "42" ||
    first.snapshot.outcome?.status !== "completed" ||
    fixture.definition.toolCalls !== 1 ||
    first.journal.length === 0
  )
    throw new Error(
      "Generic research agent must run its own model, tools, workflow and typed result.",
    );
  const second = await agent.run({ question: "Research again." });
  if (
    first.runId === second.runId ||
    second.result?.answer !== "42" ||
    fixture.stores.runs.length !== 2 ||
    second.usage.reservations.length !== first.usage.reservations.length
  )
    throw new Error("Runs must use independent stores and usage accounting.");
  const before = fixture.gateway.calls;
  await expectRejection(() => agent.run({ question: "" }), "request contract");
  if (fixture.gateway.calls !== before)
    throw new Error("Invalid tasks must not reach the provider.");

  const budget = new ResearchFixture();
  const stopped = await budget.create(0).run({ question: "Budgeted?" });
  if (
    budget.gateway.calls !== 0 ||
    stopped.result !== null ||
    stopped.snapshot.outcome?.status === "completed"
  )
    throw new Error("Shared budget must stop model dispatch and suppress typed success.");

  const cancelled = new ResearchFixture(),
    controller = new AbortController();
  cancelled.gateway.cancel = controller;
  const cancelledResult = await cancelled
    .create()
    .run({ question: "Cancel?" }, { signal: controller.signal });
  if (cancelledResult.result !== null || cancelledResult.snapshot.outcome?.status !== "stopped")
    throw new Error("Cancellation must stop generic agents.");

  const uncertain = new ResearchFixture();
  uncertain.gateway.uncertain = true;
  const pending = await uncertain.create().run({ question: "Unknown usage?" });
  if (
    pending.outcome.status !== "pending" ||
    pending.result !== null ||
    uncertain.gateway.calls !== 1
  )
    throw new Error("Unknown provider usage must retain pending state without redispatch.");

  const incomplete = new ResearchFixture();
  incomplete.definition.acceptCompletion = false;
  const rejected = await incomplete.create().run({ question: "Evidence?" });
  if (rejected.result !== null || rejected.snapshot.outcome?.status === "completed")
    throw new Error("Application completion policy must gate typed results.");

  const invalid = new ResearchFixture();
  invalid.definition.invalidMapping = true;
  await expectRejection(
    () => invalid.create().run({ question: "Validate result?" }),
    "result contract",
  );

  await verifyAgentDebugEvents();

  const concurrent = new ResearchFixture().create();
  const active = concurrent.run({ question: "First?" });
  await expectRejection(() => concurrent.run({ question: "Second?" }), "already running");
  await active;
}

async function verifyAgentDebugEvents(): Promise<void> {
  const events: DebugEvent[] = [];
  const publisher = new BoundedDebugPublisher(
    [{ id: "memory", sink: { send: async (event) => void events.push(event) } }],
    1000,
    1000,
    new DebugHealthCounter(),
  );
  const debug = new ScopedDebugRecorderFactory({
    logging: new LoggingController({ enabled: true, level: "debug" }),
    publisher,
    producerId: "agent-test",
  });
  const result = await new ResearchFixture().create(10, debug).run({ question: "Traced?" });
  await publisher.drain();
  const seen = events.map((event) => `${event.type}:${event.payload.operation ?? ""}`);
  for (const expected of [
    "operation.started:agent.run",
    "operation.started:workflow.step",
    "progress.reported:agent.session",
    "operation.completed:model.call",
    "progress.reported:model.reply",
    "operation.completed:tool.call",
    "progress.reported:tool.outcome",
    "operation.completed:workflow.step",
    "operation.completed:agent.run",
    "progress.reported:agent.outcome",
    "progress.reported:workflow.plan",
    "progress.reported:step.attempt",
    "operation.started:executor.run",
    "progress.reported:executor.outcome",
    "policy.applied:step.acceptance",
    "operation.started:mind-unit.run",
    "operation.started:session.turn",
    "progress.reported:session.action",
    "policy.applied:session.acceptance",
    "policy.applied:workflow.completion",
  ])
    if (!seen.includes(expected)) throw new Error(`Agent debug events must include ${expected}.`);
  // Spans nest: a tool call sits in a turn, in the mind unit, in the executor, in the step, in the run.
  const parents = new Map(
    events
      .filter((event) => event.type === "operation.started")
      .map((event) => [event.trace.spanId, event] as const),
  );
  const toolCall = events.find((event) => event.payload.operation === "tool.call");
  const chain: string[] = [];
  for (let span = toolCall && parents.get(toolCall.trace.spanId); span; span = parents.get(span.trace.parentSpanId ?? ""))
    chain.push(span.payload.operation ?? "");
  if (chain.join(">") !== "tool.call>session.turn>mind-unit.run>executor.run>workflow.step>agent.run")
    throw new Error(`Agent debug spans must nest, got ${chain.join(">")}.`);
  if (!toolCall?.identity.sessionId || !toolCall.identity.stepRunId)
    throw new Error("Tool call events must carry their session and step run identity.");
  if (events.some((event) => event.identity.runId !== result.runId))
    throw new Error("Agent debug events must carry the run identity.");
  if (events.at(-1)?.payload.nextState !== "completed")
    throw new Error("The agent outcome event must report the final status.");
  // Every turn describes its context window: sizes by origin and the budget, never content.
  const windows = events.filter((event) => event.payload.operation === "context.window");
  const turns = events.filter((event) => event.type === "operation.started" && event.payload.operation === "session.turn");
  if (windows.length !== turns.length || windows.length === 0)
    throw new Error("Each session turn must report its context window.");
  const second = windows[1]?.payload;
  if (!second?.metrics || second.metrics.contextTokens !== undefined && second.metrics.contextTokens <= 0 ||
      !(second.metrics.taskBytes! > 0) || !(second.metrics.observationBytes! > 0) || !(second.metrics.assistantBytes! > 0) ||
      !second.relatedRefs?.some((ref) => ref.startsWith("added:tool.")))
    throw new Error("Context windows must measure the task, the model's actions and tool observations.");
  if (events.some((event) => event.payload.operation === "context.window" && JSON.stringify(event.payload).includes("Traced?")))
    throw new Error("Context window events must not carry message content.");
  if (!seen.includes("result.persisted:artifacts.collected"))
    throw new Error("Agent runs must report the artifacts they collected.");
  const quiet = await new ResearchFixture().create().run({ question: "Untraced?" });
  if (quiet.result?.answer !== "42") throw new Error("Agents without debug must still run.");
}

async function expectRejection(
  work: () => Promise<IAgentRunResult<Answer>>,
  message: string,
): Promise<void> {
  try {
    await work();
  } catch (error) {
    if (error instanceof Error && error.message.includes(message)) return;
    throw error;
  }
  throw new Error(`Expected rejection containing ${message}.`);
}
