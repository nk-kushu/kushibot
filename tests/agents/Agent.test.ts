import {
  Agent,
  AgentRuntimeFactory,
  DefaultAgentAssignmentPolicy,
  ExecutorRegistration,
  ExecutorRegistry,
  InMemoryAgentStoreFactory,
  JsonValueContract,
  StepPolicyRegistry,
  StructuredTaskExecutor,
  TaskInputContract,
  WorkflowPolicyRegistry,
} from "../../src/index.js";
import type {
  AgentRunResult,
  AgentRunStores,
  AgentSetupInput,
  AgentWorkflow,
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
  ): Promise<AgentRunStores> {
    this.runs.push(run.runId);
    return new InMemoryAgentStoreFactory().create();
  }
}
class ResearchDefinition implements IPolicy<AgentSetupInput<Question>, AgentWorkflow<Answer>> {
  setups = 0;
  toolCalls = 0;
  acceptCompletion = true;
  invalidMapping = false;
  async apply({ task, runtime }: AgentSetupInput<Question>): Promise<AgentWorkflow<Answer>> {
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
      new ExecutorRegistration(
        "research",
        "1",
        tasks,
        answers,
        new StructuredTaskExecutor(
          tasks,
          answers,
          new DefaultAgentAssignmentPolicy("Research the supplied question."),
          factory,
          json,
          runtime.clock,
        ),
        json,
        runtime.clock,
      ),
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
  create(modelCalls = 10): Agent<Question, Answer> {
    return new Agent({
      id: "research",
      requestContract: new QuestionContract(),
      workflow: this.definition,
      runtime: new AgentRuntimeFactory({
        gateway: this.gateway,
        profile: this.profile,
        stores: this.stores,
        limits: { modelCalls },
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

  const concurrent = new ResearchFixture().create();
  const active = concurrent.run({ question: "First?" });
  await expectRejection(() => concurrent.run({ question: "Second?" }), "already running");
  await active;
}

async function expectRejection(
  work: () => Promise<AgentRunResult<Answer>>,
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
