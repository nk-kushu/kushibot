# Composed agents

`Agent<TTask, TResult>` is the public application boundary for running an agent.
It composes the existing workflow engine; it does not introduce a second engine
or require applications to subclass it. Research, review, coding, and other
applications supply their own workflow, executors, tools, and policies.

```ts
import { Agent, AgentRuntimeFactory } from "kushibot";

const agent = new Agent({
  id: "research",
  requestContract: questionContract,
  workflow: researchWorkflow,
  runtime: new AgentRuntimeFactory({
    gateway,
    profile,
    // Optional: stores, clock, ids, scope, maxTurns, timeoutMs,
    // modelTimeoutMs, limits.
  }),
});

const run = await agent.run(
  { question: "What evidence supports this conclusion?" },
  { signal, onProgress: console.log },
);

if (run.outcome.status === "finished" && run.outcome.outcome.status === "completed") {
  console.log(run.result); // TResult, validated by the application's result contract
}
```

`questionContract` implements `IResultContract<Question>`. `researchWorkflow`
implements `IPolicy<IAgentSetupInput<Question>, IAgentWorkflow<Answer>>`.
The complete executable non-coding example is exercised in
[`tests/agents/Agent.test.ts`](../tests/agents/Agent.test.ts).

## Responsibilities

| Kushibot                                      | Application                                      |
| --------------------------------------------- | ------------------------------------------------ |
| Validate task and mapped result contracts     | Define task/result schemas                       |
| Allocate a run, controls, and usage scope     | Configure model and infrastructure bindings      |
| Register definitions and run `WorkflowEngine` | Define workflow steps, dependencies, transitions |
| Create sessions and budgeted model calls      | Supply instructions, context, tools, acceptance  |
| Return outcomes, snapshots, usage, journals   | Verify domain evidence and decide completion     |

The workflow policy's `apply({ task, runtime })` builds an `IAgentWorkflow<TResult>`:

- `definition`, `executors`, and `policies`: the existing workflow definition,
  executor registry, and step policy registry.
- `workflowPolicies` and `completionPolicy`: registered transition/completion
  policies and the completion policy reference.
- `evidence`: the application's `IPolicy<StepContextEvidenceInput, boolean>`.
  Identity and dependency freshness are also enforced by the existing engine.
- `resultPolicy`: maps the completed `WorkflowResult` into the application's result.
- `resultContract`: validates that mapped result.
- Optional `artifacts()`: returns application-owned evidence for the result.

A coding workflow might depend on an accepted plan. A research workflow might
investigate then synthesize. Neither behavior is built into `Agent`.

## Model sessions

The supplied `runtime: AgentRunRuntime` exposes per-run stores, IDs, clock,
execution context and budget scope. Its task helper composes the standard
`SessionAgentTaskFactory`, `AgenticSession`, action parser, model conversation,
and `BudgetedModelCall`:

```ts
const taskFactory = runtime.createTaskFactory(answerContract, {
  async apply(request) {
    return {
      instructions: request.assignment.instructions + "\n" + outputFormat,
      input: { task: request.input, sources: verifiedSources },
      tools: scopedTools, // IAgentToolCall; permissions enforced at this boundary
      acceptance: answerAcceptancePolicy,
    };
  },
});
```

The binding policy receives `AgentTaskBindingRequest` and returns
`IAgentSessionBinding<TResult>`. Use the returned factory with
`StructuredTaskExecutor`, `WorkspaceInvestigationExecutor`, or
`WorkspaceEditingExecutor`. Custom deterministic executors can use the same
agent workflow without any model sessions.

The built-in model conversation requests one JSON action per turn: `tool`, `note`,
or `final`. It retains bounded conversation history and stops when its context
cannot fit. It uses a conservative byte-based input token bound and up to 4096
output tokens per call, capped by the supplied profile. Model gateway timeout,
usage accounting, cancellation, and unknown provider usage use existing Kushibot
mechanisms. It is a simple bounded session strategy; specialized applications
may continue using `ComposedAgentTurn` and their own task factories for richer
context composition, compression, caching, and model routing.

## Storage and outcomes

`AgentRuntimeFactory` uses fresh in-memory workflow, usage, and journal adapters
by default. They are public adapters, with no filesystem or provider dependencies.
For durable storage supply `stores: IAgentRunStoreFactory`. Its `create({ runId,
scope })` must return isolated `workflow`, `usage`, and `journal` adapters; an
optional `readJournal()` supplies journal entries in the returned result.
Connections and other infrastructure supplied by the host remain host-owned.
Using persistent adapters does not by itself add restart/resume orchestration to
this convenience API; existing recovery/lifecycle APIs remain available.

`run()` returns `IAgentRunResult<TResult>` with the engine outcome, typed `result`,
workflow snapshot, usage snapshot, optional journal entries and artifacts.
`result` is null unless the engine completed successfully. A mapped result failing
its contract throws rather than being reported as a valid typed result.
Pending provider work is retained and never automatically redispatched by `Agent`.

Each call gets a new run and budgets; one invocation is allowed at a time per
agent instance. `run(task, { signal, onProgress })` keeps execution controls out
of the serializable task. Request/configuration errors throw before execution;
stopped, failed, and pending engine outcomes must be inspected by the caller.
There is no automatic publication, rollback, approval policy, or tool permission
inference in this abstraction.

Default limits are 30 turns per session, a 10-minute deadline, 60-second model
calls, and shared allowances of 120 model calls/iterations, 100 tool calls,
2,000,000 input tokens and 250,000 output tokens. Override these in the runtime
factory. Tool adapters remain responsible for their own accounting and bounded
execution; the runtime does not wrap or reinterpret injected tools. A scope
reference does not grant authority: host adapters must enforce actual access.
