# Core Concepts

This document is the map of the framework's main concepts. The framework is a proposed standalone, OOP-oriented foundation for building agents. Each object owns a clear responsibility, **mutable execution state is isolated**, and external capabilities are supplied through interfaces and adapters.

Think of an agent receiving “Add Google login.” It needs a plan, objects that perform the work, memory, model selection, saved progress, and a trace explaining what happened. The concepts below describe those different responsibilities.

## What Does Concept Mean in These Tables?

A **concept is an idea or responsibility in the framework**. It does not automatically mean one class. The tables describe what needs to exist and what job it has; implementation chooses the code form that fits that job.

| Concept | Likely code representation |
| --- | --- |
| WorkflowRun | A class owning progress, results, and lifecycle rules. |
| StepDefinition | A class describing one assignment. |
| Executor | An interface defining a capability; concrete executor classes implement it. |
| ExecutionContext | An interface describing scoped services supplied during execution. |
| Workflow context | A typed data object containing the request and selected results. |
| Run status | A value such as active or completed, protected by lifecycle rules. |
| Agent memory | Several interfaces and collaborating classes, not necessarily one large class. |

### A Class Defines a Kind of Object; an Instance Is an Actual Object

```typescript
// A minimal illustrative class, not the complete framework implementation.
class WorkflowRun {
  constructor(public readonly id: string) {}
}

// Two actual objects created from the same class.
const googleLoginRun = new WorkflowRun("run-101");
const passwordResetRun = new WorkflowRun("run-102");
```

The real WorkflowRun class also protects lifecycle and result invariants. Each instance owns the state of its own execution.

### An Interface Describes a Contract

```typescript
interface Executor<TInput, TOutput> {
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
}
```

An interface is a TypeScript contract; it is not itself an object you construct. A class such as VerificationExecutor implements that contract and supplies the behavior. Composition creates an instance and injects its dependencies. A workflow step receives that executor object.

Choose classes for cohesive behavior and protected state, interfaces for replaceable capability boundaries, and plain typed objects/values for data. A concept may involve multiple collaborators. Strong OOP does not require turning every table row or data field into its own class.

## 1. Agent and Reusable Plan

| Concept                          | Question it answers                          | Responsibility and example                                                                                                                            |
| -------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Agent identity and configuration | Who is doing the work across multiple tasks? | Supplies a stable identity, configured capabilities, and memory scope. One agent can perform many workflow runs; it is not one model call or session. |
| Workflow / `WorkflowDefinition`  | How do we perform this type of work?         | Immutable reusable plan of steps and transitions: **investigate → specify → implement → verify → review. It holds no per-run progress.**              |
| `WorkflowBuilder`                | How do we construct a valid plan?            | Builds typed definitions, validating step identities and dependencies. The fluent `.step(...)` API constructs step-definition objects.                |
| Step / `StepDefinition`          | **What must be accomplished at this point**? | Declares identity, title, input policy, executor, and expected output contract. “Investigate authentication” is one assignment.                      |
| `Executor<TInput, TOutput>`      | Who performs this task, and how?             | Capability contract implemented by cohesive classes, such as investigation, editing, and verification executors.                                      |

**One executor can serve many workflows.**
**One workflow can invoke several executors and use the same executor class in different steps.** 
**A step describes the assignment; the executor implements the capability**.

Expected output types help at compile time; runtime validation is a separate contract.

If the distinction feels unnecessary, read [Why Steps and Executors Are Separate](16-why-steps-and-executors-are-separate.md). Direct executor or AgenticMindUnit calls do not require a workflow step; steps identify assignments within a managed plan.

See [Executors and Contracts](03-executors-and-contracts.md), [Workflow Definition and Engine](04-workflow-definition-and-engine.md), and [the step code example](09-core-concepts-explained-with-example.md).

## 2. Execution and Recorded State

| Concept                                  | Question it answers                                     | Responsibility and example                                                                                                                            |
| ---------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `WorkflowEngine`                         | Which step runs next, and how does the plan progress?   | **Coordinates** definitions, transitions, step execution, run-state changes, and persistence through injected collaborators.                          |
| `StepRunner`                             | How do we execute this selected step?                   | Prepares input, **invokes the executor**, and applies execution policies. It does not choose the whole plan or contain file-search logic.             |
| Run / `WorkflowRun`                      | What happened in this particular execution of the plan? | **Owns the request, status, results, and lifecycle invariants for “Add Google login,” for example `run-42`.**                                         |
| `StepRun`                                | What happened when this step was executed?              | Owns that **step execution's state, result, attempts, and checkpoint references.** Revisiting a step in a fix loop creates a distinct step execution. |
| Attempt                                  | Which try at this step execution is this?               | Distinguishes technical retries. A second attempt is not a new workflow or automatically a new fix-loop iteration.                                    |
| Retry, recovery, and transition policies | Which behavior applies after an outcome?                | Interchangeable objects decide permitted retries, safe restoration, or next transitions with explicit limits and reasons.                             |

**The executor does the task. The engine handles what happens afterward.**

For example, when investigating Google login:

1. The investigation executor returns its findings.
2. The engine asks the StepRun/WorkflowRun objects to record that result and the step's completion. Their methods check that the requested change is valid. These are the **domain methods**.
3. A **repository** saves the accepted state and result so they remain available after a restart.
4. The engine selects the next step. Finishing investigation does not mean the whole run is finished.

**The executor does not set run.status to completed by itself. It knows how to investigate; the engine coordinates the larger process, and the run objects enforce its state rules.**

**The workflow definition is a reusable plan, not shared progress.** “Add Google login” and “Add password reset” can follow the same plan, but **each gets its own WorkflowRun, step executions, and results**. Google-login findings belong to its run and are not automatically used as the password-reset result.

See [StepRunner and Contexts Explained](10-step-runner-and-contexts.md), [Recovery, Memory, and Context Handoff](05-recovery-and-memory.md), and [OOP Architecture](08-oop-architecture-and-design-rules.md).

**The workflow defines the process graph;** 

WorkflowRun, StepRun, AgenticSession, and Publication each protect their own lifecycle. 

### Example: Each Object Checks Its Own State Changes

**The engine organizes the work. Each execution object checks the changes that belong to it.**

Imagine Google-login coding has finished, but the user has not approved applying the files to the original workspace:

| Object                 | Its current state                                                             | What it is responsible for checking                                            |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| AgenticSession         | Completed.                                                                    | Did this model/tool session produce a valid final outcome?                     |
| Implementation StepRun | Completed after its result was accepted and saved.                            | Is the result valid for this step execution and attempt?                       |
| WorkflowRun            | Waiting for approval, once the required checks/review and proposal are ready. | Can the overall process advance or finish under its plan and completion rules? |
| Publication            | Awaiting approval.                                                            | Has the trusted user approved this exact proposal and target?                  |

There is no single status that describes all four objects. Coding can be completed while publication is still waiting.

The engine coordinates the next actions:

1. It receives the coding outcome through the executor/StepRunner and coordinates recording the step result through the domain objects and repository.
2. It schedules verification and review. If accepted, it coordinates preparing the proposal and recording that the run is waiting for approval.
3. After a trusted user approval arrives, **it asks the publication subsystem** to proceed. Publication checks the proposal/approval match; the publisher checks the current target and applies only permitted changes.
4. It receives the confirmed publication receipt and **asks WorkflowRun to complete.** The run checks that its required steps, evidence, and publication outcome satisfy the plan.

**An invalid request is rejected by the object that owns the rule.** For example, Publication rejects an approval for a different proposal. WorkflowRun rejects completion without the required confirmed receipt. The engine must handle those outcomes, not bypass the rules by assigning status fields.

**“One giant status switch” would mean putting every object's rules into one long list of status-based branches inside WorkflowEngine:** model-session completion rules, step retry rules, approval rules, file-application rules, and run completion rules. **That would give the engine too many unrelated jobs.**

**Instead, the engine calls small public methods or collaborators**. 

**Session rules stay with AgenticSession.** 
**Step rules with StepRun.** 
**Run rules with WorkflowRun, and approval/application rules with Publication and its publisher.**

The engine still controls the order of work and handles errors; it delegates the detailed rules to their owners.

Completed coding does not imply run/publication completion. See [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md) for ownership, transitions, file placement, and examples.

## 3. Contexts and Capabilities

| Concept                                    | Question it answers                                              | Responsibility and example                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Workflow context, such as `FeatureContext` | Which task data can **this step use to prepare its input**?      | Readonly view of the request and selected previous results. The specification step receives investigation findings.            |
| `ExecutionContext`                         | Which execution is active, and which scoped services can it use? | Supplies run/step identity, cancellation, progress, debug recording, and artifact storage. It is not a global service locator. |
| Model context / `AgentContextComposer`     | What can the model see in this call?                             | Composes bounded input from the assignment, notebook, selected memory, recent observations, and evidence references.           |

These contexts are different. 

**Workflow context is task data;** 
**ExecutionContext supplies the services and controls an executor uses during its task, such as reporting progress, saving artifacts, and checking cancellation.** 
**Model context is the bounded input actually sent to an LLM.**

### Example: What Can an Executor Do with ExecutionContext?

An investigation executor receives execute(input, context):

- input tells it what to do: investigate authentication in the selected workspace.
- **context supplies working services and controls for that execution.**

```typescript
// Inside the executor, after producing a reportText string:
context.progress("Reading authentication files");
context.signal.throwIfAborted();

const report = await context.artifacts.write(
  {
    name: "authentication-report.md",
    kind: "investigation-report",
    mediaType: "text/markdown",
    data: new TextEncoder().encode(reportText),
    idempotencyKey: "investigation-report/main",
  },
  { signal: context.signal },
);
```

Here progress() sends a real progress event, artifacts.write() saves the report through the configured store, and signal lets the executor observe cancellation requested for this execution. The scoped store applies its usual access, size, and operation-identity rules.

**That is what “live” meant: these methods are connected to working services for the current run, rather than being descriptions of services.** “Capabilities” simply means the operations or controls supplied to the executor. The framework creates and passes them in; the executor uses them through their interfaces.

A cancellation signal requests cooperative stopping; it does not automatically undo work or forcibly stop every external operation.

Persist serializable state and reconstruct live service objects and cancellation signals on resume.

See [StepRunner and Contexts Explained](10-step-runner-and-contexts.md).

## 4. Agentic Execution and Bounded Decisions

| Concept                                     | Question it answers                                                  | Responsibility and example                                                                                                                                                  |
| ------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgenticMindUnit`                           | How does a model pursue a goal using tools over multiple iterations? | Reusable abstraction for assignment, model/tool loop, notebook, permitted tools, limits, and typed outcome. Agentic executors delegate to it instead of copying the loop.   |
| `AgenticMindUnitRunner`                     | Who implements the common loop algorithm?                            | Coordinates model calls, allowed actions, observations, output validation, budgets, checkpoints, and events through injected interfaces.                                    |
| `AgenticSession`                            | Where is the progress of one agentic task kept?                      | Holds that task's messages, working notes, actions, usage, and status. Each AgenticMindUnit invocation gets its own session.                                                |
| Assignment / `AgenticMindUnitDefinition`    | What must this invocation pursue, and within which boundaries?       | Defines goal, constraints, completion criteria, initial notes, tool registry, limits, and result contract. The assignment remains authoritative as notes change.            |
| `DraftNotebook`                             | What **useful working notes should survive between iterations?**     | Structured findings, evidence references, open questions, and next actions. It is not a private reasoning transcript.                                                       |
| `ToolRegistry` / `ToolDispatcher`           | What actions are available and how are they executed?                | Registry exposes an explicit allowlist; dispatcher validates and invokes registered tool objects. A session cannot grant itself additional tools.                           |
| `ModelGateway` | How does the loop call its selected model? | A common interface for sending model requests and receiving responses. An adapter translates between this interface and the selected model service. |
| `ResultContract` / `AgenticMindUnitOutcome` | Is the proposed result valid, and how did execution end?             | Validates output at runtime and distinguishes completion from failure, cancellation, interruption, or a budget stop. Schema validity alone does not prove task correctness. |
| `DecisionUnit` — System 1                   | Can a **bounded classification or selection guide the agent**?       | Evaluates known options through a provider such as a JEV-style adapter, returning a validated answer or explicit abstention/failure.                                        |
| `DecisionProvider` / `JevDecisionProvider`  | Which model/service answers System 1 questions?                      | The provider interface is implemented by adapters such as JevDecisionProvider; JEV supplies a bounded answer, while framework policies decide what to apply.                |
| `DecisionPolicy`                            | Should that recommendation be applied?                               | Enforces mandatory rules and chooses acceptance, fallback, preserved ambiguity, or deeper evaluation.                                                                       |

### AgenticSession: The Progress of One Agentic Task

An AgenticSession holds the progress of one AgenticMindUnit invocation while it works toward its assignment.

For example, the investigation executor starts a unit to investigate authentication. That invocation creates a session:

```text
Session: investigate-authentication-1
Goal: Understand the current login code.
Status: Working.

Recent activity:
  Model requested a file search.
  Search returned auth/login.ts.
  Model requested reading that file.

Working notes:
  Login uses session cookies, based on evidence inspected so far.

Pending action:
  Waiting for the file-reading tool to return.

Usage:
  2 model calls so far.
  Tokens consumed so far.
```

**As the task progresses, this information changes**. 

That is what “mutable loop state” means. “Conversation/protocol state” means the recorded messages and which model tool request each tool result answers, so the loop can continue correctly.

**When investigation finishes, its session finishes.** 

Planning and coding can each start another session with their own progress:

```text
Agent: developer-agent
  Run: Add Google login
    Session 1: Investigate authentication
    Session 2: Prepare specification
    Session 3: Implement changes
```

**The workflow run connects these tasks through accepted step results.** 

Their session messages and writable notes remain separate. A deterministic verification task can run without an agentic session.

The session owns its current state; checkpoints persist the information needed to resume after interruption. 

Holding state in a session does not mean every change is automatically saved to durable storage.

`AgenticMindUnit` pursues a goal over a loop. 
`DecisionUnit` answers a bounded question. 

Deterministic executors can run ordinary code without either. Decision recommendations never override tool permissions, required checks, or budgets.

See [AgenticMindUnit](12-agentic-mind-unit.md) and [DecisionUnit: A System 1 Decision Layer](15-system-one-decision-unit.md).

### ModelGateway: One Way for the Loop to Call Different Models

**ModelGateway is the interface the agentic loop uses to send a request to its selected model and receive the response.**

Different model services can expect different request formats and return different response formats. An adapter class handles those differences so the loop can keep using the same interface.

```text
AgenticMindUnitRunner
  → ModelGateway interface
    → Selected adapter class
      → Model service
    ← Adapter translates the response
  ← Response in the framework's common format
```

For example, a proposed interface could be:

```typescript
interface ModelGateway {
  generate(
    request: ModelRequest,
    signal: AbortSignal,
  ): Promise<ModelResponse>;
}
```

ModelRequest and ModelResponse are supporting framework contracts, omitted here for simplicity. The request contains the selected model input, permitted tool descriptions, and call limits. The response contains supported output such as text or requested tool calls, plus usage information when available.

Inside the runner, the call looks like:

```typescript
// The model gateway was supplied to this runner through its constructor.
const response = await this.model.generate(request, context.signal);
```

The selected adapter does the translation:

1. Convert the framework request into the model service's request format.
2. Call that service using its configured client.
3. Convert the answer, tool-call requests, usage, and errors into the framework's documented format.
4. Return the response to the loop.

**Example: investigating Google login.** The runner asks the selected model what action to take next. The response requests reading auth/login.ts. The gateway returns that request; ToolDispatcher checks permissions/arguments and invokes the actual file-reading tool. The tool result becomes input to a later model call.

The gateway does not itself decide that a tool is allowed, run the whole loop, or mark the task completed. Those responsibilities belong to the dispatcher, runner, and execution objects.

“Provider-neutral” means the loop calls generate() without knowing the service's SDK details. “Injected” means composition creates the configured adapter object and passes it to the runner rather than the runner creating a hidden model client.

ModelRouter chooses an eligible model profile;
ModelGatewayFactory supplies its adapter. 
A compatible alternative adapter can be used without rewriting the loop. 

If a model lacks required capabilities, routing must reject it. Changing the model for active work uses the framework's explicit new-session/handoff rules rather than silently changing an in-flight session.

See [AgenticMindUnit](12-agentic-mind-unit.md) and [Model Routing](14-model-routing-and-escalation.md) for the detailed responsibilities.

### System 1 with Interchangeable Providers

**System 1 helps the agent answer small questions, such as “Which review does this change need?”**

The framework can use JEV to answer, but it does not depend on JEV. You can replace it with another supported model or service.

| Name                | Simple meaning                                          |
| ------------------- | ------------------------------------------------------- |
| DecisionUnit        | The object the agent asks for a decision.               |
| DecisionProvider    | The interface that any decision service must implement. |
| JevDecisionProvider | One class implementing that interface using JEV.        |
| DecisionPolicy      | The rules that decide what to do with the answer.       |

```text
Agent asks a question
  → DecisionUnit uses the configured provider, such as JEV
  → The framework checks the answer
  → DecisionPolicy decides what happens next
```

**Example: Google login**

1. The agent asks: “Which extra review applies: authentication, database, or none?”
2. The configured JEV provider answers: “Authentication.”
3. The policy adds that review and keeps all required checks.
4. If the provider cannot answer or returns an invalid answer, the policy uses its configured fallback or requests more investigation. Failure does not automatically mean “none.”

To switch between already-supported providers, change the configuration. 
To support a new service, add a class implementing DecisionProvider and register it. 
The agent and workflow still use DecisionUnit in the same way.

JEV suggests a decision; it does not perform the coding task, grant tools, approve publication, or decide that tests passed. AgenticMindUnit handles goal-driven model/tool work. Debug events record the provider's answer and what the policy actually did.

See [DecisionUnit: A System 1 Decision Layer](15-system-one-decision-unit.md) for the detailed design.

### Guards: Guidance Plus Verification

A GuardDefinition packages a skill description/instructions, stable rule IDs, check configuration, and applicability metadata. GuardSelectionService asks System 1 DecisionUnit, using JEV or another configured DecisionProvider, which candidates apply before work and after changes. GuardSelectionPolicy preserves required guards and handles abstention/failure explicitly.

GuardRunner invokes interchangeable GuardCheck implementations such as EslintCheck and ModelAssistedOopReview. GuardReport records coverage, findings, evidence, and the exact checked source/rule versions; GuardEnforcementPolicy selects acceptance, bounded fixes, further review, or stop. An unavailable required check is not a pass. See [Guards: Skills, Rules, and System 1 Selection](20-guards-skills-rules-and-system-one-selection.md).

## 5. Agent Memory Across Tasks

| Concept                               | Question it answers                                 | Responsibility and example                                                                                                                         |
| ------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgentMemory` / scoped memory view    | What may this agent remember and retrieve?          | Facade over injected memory capabilities, enforcing agent-private, project-shared, and session-local scope.                                        |
| **Working** memory                    | What matters for active work now?                   | Session notebook, recent observations, and pending work. The notebook has one owner, not a second independently mutable copy in the memory facade. |
| **Episodic** memory                   | What happened in previous tasks?                    | Past outcomes with evidence, such as a callback-URL failure.                                                                                       |
| **Semantic** memory                   | Which supported facts are useful later?             | “This project uses session cookies,” with source and freshness metadata.                                                                           |
| **Procedural** memory                 | Which reusable methods or lessons apply?            | An authentication verification procedure.                                                                                                          |
| Memory proposal and validation policy | Which observations should become durable knowledge? | Explicitly evaluates evidence before confirming a fact or procedure; draft notes do not become facts automatically.                                |

**Short term and long term describe lifetime.** 
**Episodic, semantic, and procedural describe meaning.** 
**Saved working notes are still working notes.** 

Authoritative workflow results, model context, checkpoints, and durable agent knowledge have separate owners and purposes.

Retrieve only relevant, permitted memory into the model context. Preserve provenance, handle stale/conflicting entries, and support correction and deletion. See [Agent Memory Across Tasks and Sessions](13-agent-memory.md).

## 6. Model Selection, Handoffs, and Budgets

| Concept                        | Question it answers                                   | Responsibility and example                                                                                               |
| ------------------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `ModelProfile`                 | What configured model capabilities are available?     | Immutable profile describing provider/model identity, capabilities, and limits.                                          |
| `ModelRoutingPolicy`           | Which eligible profile fits this task?                | Selects by role, requirements, and budget: a stronger planning profile and an economical coding profile, for example.    |
| `ModelGatewayFactory`          | How is the selected model supplied?                   | Resolves the profile to an adapter without provider branches in the engine or loop.                                      |
| `ModelHandoff` | What does a new session need to continue the work? | Gives the new session the goal, completed work, current problems, and evidence it needs to continue safely. |
| `EscalationPolicy`             | When does the work need stronger assistance?          | Uses actual failures and configured limits to select deeper diagnosis or another eligible profile.                       |
| `RunUsageBudget` / loop limits | How much work may be consumed?                        | Tracks calls, usage, reservations, iterations, and deadlines. New sessions and retries do not reset the run-wide ledger. |

Select models at session boundaries. A changed model gets an explicit handoff and a new session; it does not silently inherit another provider's live protocol state. Planning quality, bounded coding tasks, independent verification, and useful feedback make routing effective.

### ModelHandoff: Help a New Session Continue the Work

A ModelHandoff is a package of information given to a new session so it can continue the work without starting from zero.

Imagine an economical coding model tried to add Google login, but verification found a problem. The framework starts a new session using a stronger model. The new session receives a handoff like this:

```text
Goal:
  Add Google login while preserving existing login.

Work already done:
  Callback route added.
  Tests added.

Current workspace:
  workspace-101, source revision code-r2.

Problem:
  The callback-configuration test still fails.

Evidence:
  References to the actual test report and current changes.

Next assignment:
  Diagnose and fix the callback configuration.

Pending or uncertain actions:
  None in this example.
```

The connection is:

```text
Previous session's work and results
                ↓
         ModelHandoff
                ↓
New session continues with the relevant information
```

“Bounded” means selecting the relevant information within size/context limits rather than copying the entire previous conversation. The new session has its own messages and working notes. Stable source/result/artifact references let it inspect the supporting evidence when permitted.

If an earlier action has an uncertain outcome—for example, a file write may have finished before a crash—the handoff preserves that uncertainty. The new session must reconcile the actual effect before repeating the action; a summary cannot turn “unknown” into “not done.”

The handoff does not reset the run's consumed budget, grant new tools, or create publication approval. Those remain controlled by the existing trusted policies and execution records. A new session is different from resuming the same session from a validated checkpoint.

See [Model Routing and Escalation](14-model-routing-and-escalation.md).

Limits apply beyond tokens: active/queued runs, deadlines, attempts, fixes, iterations, tool/process output, context/notebook growth, memory queries/writes, artifacts/checkpoints, and debug queues. Parent caps constrain children; durable reservations and unknown usage survive retries and recovery. See [Limits, Budgets, and Execution Control](18-limits-budgets-and-execution-control.md).

## 7. Persistence, Verification, and Debugging

| Concept                                           | Question it answers                                 | Responsibility and example                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `RunRepository`                                   | How are authoritative run states and results saved? | Persists validated snapshots and supports restoration through domain contracts.                                                           |
| `CheckpointStore`                                 | What is needed to resume interrupted work safely?   | Stores or references notebook, conversation/protocol state, counters, and pending/completed operations. A notebook alone is insufficient. |
| `ArtifactStore`                                   | Where do larger produced materials live?            | Stores reports and other artifacts; results and events carry references.                                                                  |
| Verification executor                             | What objective checks actually passed or failed?    | Runs configured checks and returns evidence. A failed check can be a valid task result rather than an executor exception.                 |
| `ScopedDebugRecorder` / debug events              | What happened, why, where, and for how long?        | Correlated, structured events for runs, steps, attempts, sessions, model/tool calls, decisions, memory, budgets, and recovery.            |
| `DebugEventStore` / query and formatting services | How can a developer inspect the history?            | Persist and filter timelines and export readable output or JSONL with safe summaries and references.                                      |
| Composition root / factories and adapters         | How do all these objects get connected?             | Assemble concrete providers, tools, stores, and policies behind the framework's public `index.ts` API.                                    |

**Checkpoints enable recovery;** 
**Debug events explain execution;** 
**Artifacts hold produced materials;** 
**Durable agent memory supports future tasks.**

None is an interchangeable substitute for the others. Side-effecting operations with uncertain outcomes require reconciliation rather than blind replay.

See [Debug Events and Run Tracing](11-debug-events-and-run-tracing.md), [Recovery](05-recovery-and-memory.md), and [File Organization](02-location-and-file-organization.md).

## Isolated Workspaces and Approved Publication

WorkspaceProvider creates a separate working copy from a defined baseline; agent file/tools and guards run inside that boundary. ChangeSetBuilder freezes exact additions, edits, and deletions into a review bundle. WorkspacePublisher applies only that proposal to the designated original after trusted user approval and target-conflict checks. Edits after approval require a new proposal/approval; failed or partial application remains explicit through a durable journal and receipt. See [Isolated Workspaces, Review, and Approved Publication](21-isolated-workspaces-review-and-publication.md).

## 8. Putting It Together: Add Google Login

1. A configured agent receives the request. A `DecisionUnit` may classify it as authentication-related; deterministic policies retain mandatory constraints.
2. A `FeatureWorkflow` definition supplies the plan and the engine creates a new `WorkflowRun` for this request.
3. The engine selects an investigation step. `StepRunner` maps workflow context into its input and supplies scoped `ExecutionContext` capabilities.
4. The investigation executor configures an `AgenticMindUnit` assignment. Composition supplies an eligible model gateway, allowed read/search tools, limits, and a scoped memory view.
5. A fresh `AgenticSession` retrieves relevant permitted knowledge and cycles through model calls, tools, observations, and notebook updates until it produces a validated outcome or stops.
6. The executor maps a successful outcome to the step result. The engine records and persists it, then prepares the specification step's input from that result.
7. Planning can use a stronger profile. Coding receives a bounded contract and can use an economical profile in a different isolated session.
8. Verification runs actual checks. Review assesses the changes against the specification and evidence. Policies decide completion, bounded fixes, escalation, or a stopped outcome.
9. The coordinator records an episode from the confirmed task outcome and may submit supported lessons as memory proposals for future tasks.
10. Debug events explain selected models, unit decisions, tool operations, memory use, retries, persistence, and the final outcome throughout the same correlated timeline.

This is an example of the proposed standalone framework's behavior, not a requirement to change existing Harness code. See [First-Version Scope](07-first-version-scope.md) for implementation requirements and [Core Concepts Explained: Adding Google Login](09-core-concepts-explained-with-example.md) for the introductory walkthrough and step-class example.

## Policies: One Shared Contract

A policy is an object that applies configured rules to input and returns a typed result. All configurable decisions and transformations share Policy<TInput, TOutput> with apply(input): Promise<TOutput>. Executor input selection, model context, routing, completion, transitions, retries, guards, memory, provider prompt-cache configuration, sub-agent admission, and skill ordering use concrete implementations of this one contract.

StepDefinition holds inputPolicy: Policy<TContext, TInput>. StepRunner awaits inputPolicy.apply(workflowContext), then calls executor.execute(input, executionContext). AgenticMindUnit retains its execution capability and uses the same shared policies internally. Names such as DecisionPolicy and ModelRoutingPolicy describe policy roles/implementations, not additional interfaces. Runtime services still enforce budgets, permissions, valid lifecycle changes, and trusted approval.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

## Provider Prompt Caching Is an Architecture Requirement

The framework must enable provider prompt caching through stable request structure and provider adapters. AgentContextComposer must preserve unchanged instructions, tool definitions, and output contracts in consistent order and representation; adapters must preserve that structure in provider payloads and expose supported controls and usage. Current task evidence remains current and correctly scoped. The provider decides cache hits; every new request still generates a new response. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

[Back to table of contents](harness-workflows-executors-framework-idea.md)
