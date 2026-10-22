# Core Concepts Explained: Adding Google Login

Imagine you ask: **“Add Google login to my application.”**

The framework needs a plan, task capabilities, isolated model/tool sessions, memory, model selection, bounded decisions, guards, an isolated workspace, approved publication, persistence, and debugging.

**State machines keep the valid lifecycle of each execution explicit**. Start with four concepts, then follow how the other pieces support them:

| Concept | Meaning in this example |
| --- | --- |
| **Workflow** | The reusable plan: investigate → specify → implement → verify → review. |
| **Step** | One task in that plan, such as “Investigate the existing authentication.” |
| **Executor** | The object that knows how to perform that task, such as `WorkspaceInvestigationExecutor`. |
| **Run** | The record of this particular request: “Add Google login,” including its progress and results. |

## 1. Workflow: The Reusable Plan

A `FeatureWorkflow` describes how to implement a feature. It does not contain “Google login” permanently—it can also handle “Add password reset.”

Its plan could be:

```text
Investigate → Write specification → Implement → Verify → Review
```

**The workflow defines the order and rules**, such as “If review finds problems, return to implementation, up to three times.” 

**This graph describes which assignment may run next**. For a publication-inclusive plan, accepted review leads to a frozen proposal, user approval, and publication before overall completion.

**WorkflowDefinition is the plan. WorkflowRun is one use of that plan.**

For example, the plan says:

```text
Investigate → Specify → Implement → Verify → Review
```

You can use that same plan for two different requests:

| Thing              | Example                                   | Has progress/status?                                    |
| ------------------ | ----------------------------------------- | ------------------------------------------------------- |
| WorkflowDefinition | The reusable feature-implementation plan. | No. It only describes what to do and in which order.    |
| WorkflowRun 1      | Add Google login.                         | Yes: investigation finished; implementation is running. |
| WorkflowRun 2      | Add password reset.                       | Yes: not started yet.                                   |

“Immutable” means this plan is not edited while a run uses it. Progress and results are stored in each run, so completing Google login does not mark the reusable plan—or the password-reset run—as completed. Changing the reusable plan creates a new definition/version.

Each task inside a run also tracks its own progress. For example, the investigation step can be completed while the whole run is still working on implementation. Its agentic session tracks the model/tool work for that task. Section 16 shows how these separate progress records work together.

## 2. Step: A Task with a Clear Assignment

The “Investigate” step describes:

```text
Name:     Investigate existing authentication
Input:    Your goal and workspace location
Executor: WorkspaceInvestigationExecutor
Result:   Findings about the current authentication code
```

The step describes what needs doing and which capability to use. The executor contains the implementation of that capability.

For example, the investigation step does not itself contain the logic for searching files or calling a model.

### What Is a Step in Code?

A step is a `StepDefinition<TContext, TInput, TOutput>` object. It holds the assignment: its name, the executor to use, and the policy object that prepares its input.

For example, this could be the framework file `domain/StepDefinition.ts`:

```typescript
import type { Executor } from "../contracts/Executor";
import type { Policy } from "../contracts/Policy";

export class StepDefinition<TContext, TInput, TOutput> {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly executor: Executor<TInput, TOutput>,
    public readonly inputPolicy: Policy<TContext, TInput>,
  ) {}
}
```

The investigation step is an instance of that class. A composition factory supplies `investigationExecutor`, an object implementing `Executor<InvestigationInput, InvestigationResult>`:

```typescript
interface InvestigationInput {
  readonly goal: string;
  readonly workspace: string;
}

interface InvestigationResult {
  readonly findings: string;
  readonly sources: readonly string[];
}

interface FeatureContext {
  readonly request: InvestigationInput;
}

class InvestigationInputPolicy implements Policy<FeatureContext, InvestigationInput> {
  async apply(context: FeatureContext): Promise<InvestigationInput> {
    return {
      goal: context.request.goal,
      workspace: context.request.workspace,
    };
  }
}

const investigateStep = new StepDefinition<
  FeatureContext,
  InvestigationInput,
  InvestigationResult
>(
  "investigate",
  "Investigate existing authentication",
  investigationExecutor,
  new InvestigationInputPolicy(),
);
```

When execution reaches this step, `StepRunner` does the equivalent of:

```typescript
const input = await investigateStep.inputPolicy.apply(featureContext);

const result = await investigateStep.executor.execute(
  input,
  executionContext,
);
```

### Where Does featureContext Come From?

**The workflow engine creates featureContext from the current run's saved request and, when needed, its accepted step results.** It is a normal TypeScript object, not a built-in variable or something the model creates.

For the investigation step, the path is:

1. The user asks for Google login, and the host supplies the selected, authorized workspace.
2. The framework creates a WorkflowRun containing that request and saves it through RunRepository.
3. When investigation is ready to run, the engine reads that run's request and constructs a FeatureContext object.
4. The engine supplies this context to StepRunner. StepRunner passes it to investigateStep.inputPolicy.apply() and awaits its result.
5. The input policy selects goal and workspace; the executor receives that selected input.

For example, this simplified snapshot represents the request loaded from the run repository; the real snapshot also contains lifecycle and other execution fields:

```typescript
const loadedRunSnapshot = {
  runId: "run-42",
  request: {
    goal: "Add Google login",
    workspace: "/my-app",
  },
};

// Inside the engine: build a readonly data view for this step.
const featureContext: FeatureContext = {
  request: {
    goal: loadedRunSnapshot.request.goal,
    workspace: loadedRunSnapshot.request.workspace,
  },
};
```

FeatureContext is the interface describing the object's shape; featureContext is this particular object. The interface does not load anything itself.

StepRunner then uses the object:

```typescript
const input = await investigateStep.inputPolicy.apply(featureContext);
// input is { goal: "Add Google login", workspace: "/my-app" }
```

```text
User request + trusted workspace selection
                 ↓
WorkflowRun stores the request through RunRepository
                 ↓
Engine reads the current run and creates featureContext
                 ↓
StepRunner → step input policy → executor input
```

A later specification context can include the saved investigation result. On resume, the engine rebuilds these views from the persisted run instead of relying on an old in-memory variable. The original run remains the authority; executors do not mutate it through the context.

`featureContext` therefore supplies the workflow data used to prepare this step's input.
`executionContext` supplies per-execution services such as the run ID, step ID, cancellation signal, progress reporting, debug recorder, and artifact store. 

These have different responsibilities.

For “Add Google login,” the sequence is:

1. `StepDefinition` prepares `{ goal: "Add Google login", workspace: "/my-app" }`.
2. `WorkspaceInvestigationExecutor` searches and reads the workspace.
3. It returns `{ findings: "...", sources: [...] }`.
4. StepRunner returns the outcome; the engine coordinates recording it through the run's domain methods and repository.

The expected result type is defined by `TOutput`. The actual result belongs to the run, so the same step definition can serve many requests without mixing their results. TypeScript checks these types at compile time; validating untrusted executor output at runtime requires a separate validation contract.

In the fluent workflow example, `.step("investigate", {...})` is builder syntax that constructs this `StepDefinition` object. This is the proposed code shape, not an already implemented framework. The snippets omit composition wiring and surrounding imports; the runner excerpt illustrates invocation rather than its complete persistence, retry, and recovery lifecycle.

For a detailed explanation of the runner and both contexts, read [StepRunner and Contexts Explained](10-step-runner-and-contexts.md).

## 3. Executor: The Object That Does the Work

`WorkspaceInvestigationExecutor` receives the step’s input and investigates the workspace.

It prepares an investigation assignment and delegates repeated model/tool work to the reusable `AgenticMindUnit`. That unit can:

1. Search for authentication files through allowed tools.
2. Read the relevant code.
3. Ask its injected model to interpret what it found.
4. Return validated findings and file references for the executor to map into its step result.

The executor does not implement its own copy of the agentic loop. A deterministic executor can run ordinary code directly without using a model.

All those internal actions belong to one executor invocation for one workflow step.

The next step could use `StructuredTaskExecutor` to turn those findings into a specification. The review step can use the same executor class with a different task configuration.

## 4. Run: One Actual Execution of the Plan

When you submit “Add Google login,” the framework creates a `WorkflowRun`, for example `run-42`.

As work progresses, it records:

```text
Run: run-42
Goal: Add Google login

✓ Investigate
  Result: Authentication uses email/password in auth/

✓ Write specification
  Result: Add Google OAuth while preserving existing login

● Implement
  Status: In progress

○ Verify
○ Review
```

Tomorrow, “Add password reset” creates a different run using the same workflow. Its inputs, results, and progress are separate. A run can remain active as different steps finish, or wait for publication approval after all coding/check steps completed. Its status is not simply the status of its most recent model call.

## 5. Agent: The Identity That Continues Across Tasks

The agent is the configured identity doing the work, for example `developer-agent` for project `shop`. It is not a single LLM call or conversation.

Today it handles Google login; tomorrow it handles password reset. The workflow runs and agentic sessions differ, while the trusted identity and permitted durable memory scope can stay the same.

Agent configuration defines available capabilities and policies. A model cannot gain new project access by changing a goal or choosing another provider. The framework need not put every responsibility into a large `Agent` class; identity/configuration can be composed with smaller services.

## 6. WorkflowEngine and StepRunner: Overall Coordination and One-Step Execution

**WorkflowEngine manages the workflow's progress: it schedules steps, supplies their data, coordinates execution and saved outcomes, and handles what happens next.**

Selecting the next step is one part of its job. Its main responsibility is coordinating the whole workflow from start to its actual outcome.

For each stage, it:

1. Determines which step is allowed to run next, using the definition and transition policies.
2. Prepares the available task data and context for that step.
3. Asks StepRunner to execute it.
4. Coordinates recording and saving the accepted outcome through domain objects and repositories.
5. Handles whether the workflow should continue, request a bounded fix, wait, stop, or finish according to its rules.

StepRunner handles one selected step: map context into input, invoke the executor, and apply execution policies. The executor performs the specific task. Neither replaces the engine's coordination of the overall plan.

For Google login:

```text
Engine:     Investigation is next.
Engine:     Prepare its context and ask StepRunner to execute it.
StepRunner: Map the input and invoke the investigation executor.
Executor:   Perform investigation and return findings.
Engine:     Record and save the findings.
Engine:     Specification can now start.
```

Later, after the required checks and review:

```text
Engine: The proposal is ready for user review.
Engine: Record that the run is waiting for approval.
Engine: Resume the publication process only after trusted approval arrives.
```

The engine does not implement file investigation, model/tool calls, or file-publication details itself. It coordinates the collaborators responsible for them, while their domain objects enforce valid state changes.

A `WorkflowBuilder` constructs the reusable typed plan; it does not execute it. `FeatureWorkflow.define()` can use that builder to define which result feeds each later step.

### StepRun and Attempt

A `StepRun` records one execution of a step. An attempt records one technical try within that execution.

```text
WorkflowRun: run-42
  Step: implement
    StepRun sr-implement-1
      Attempt a-1: temporary model request failure
      Attempt a-2: execution completed
    StepRun sr-implement-2
      A later fix assignment after verification found an issue
```

These identities keep a network retry separate from revisiting implementation for a correction. The domain objects protect state through methods; their statuses and result collections are not freely writable. A retry can move the same StepRun through active → retry_wait → active with a new attempt ID. A workflow fix creates another StepRun rather than changing a completed execution back to active.

See [StepRunner and Contexts](10-step-runner-and-contexts.md) and [Why Steps and Executors Are Separate](16-why-steps-and-executors-are-separate.md).

## 7. Three Contexts: Data, Execution Services, and Model Input

| Context            | In simple words                                             | Google login example                                                           |
| ------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Workflow context   | Data used to prepare an assignment.                         | Goal, workspace, saved investigation findings.                                 |
| `ExecutionContext` | Identity and scoped capabilities used while doing the work. | Run/step IDs, cancellation, progress, debug recording, artifacts.              |
| Model context      | Bounded information actually sent in one model call.        | Assignment, selected notes, relevant sources/memory, recent tool observations. |

**`AgentContextComposer` prepares model context within the configured context budget.** 

It may select or compact earlier observations while preserving the assignment and unresolved work. It does not send the entire workflow history or memory store automatically.

**An input policy chooses what an executor needs from workflow context**. The executor can report progress through execution context. A model sees what the composer includes. These are different boundaries rather than three names for one shared object.

## 8. AgenticMindUnit: The Reusable Goal-Pursuing Unit

The investigation executor needs more than one model call. The model may need to search, inspect results, read another file, update notes, and only then answer.

`AgenticMindUnit` encapsulates that reusable pattern:

```text
Assignment + allowed tools + initial notes + limits + result contract
                                ↓
Model call → permitted tool action → observation/notebook update
    ↑                                      ↓
    └──────── continue within limits ───────┘
                                ↓
Validated result, or an explicit stopped/failed/interrupted outcome
```

`AgenticMindUnitRunner` implements the coordinating algorithm through injected model, tool, policy, checkpoint, and event interfaces. Executors configure the unit instead of copying its loop.

### Assignment, Session, and Notebook

| Object                                   | Purpose                                                                                                          |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `AgenticMindUnitDefinition` / assignment | Reusable configuration: goal, constraints, completion criteria, tools, limits, and expected result.              |
| `AgenticSession`                         | Mutable state for one invocation: conversation/protocol, counters, usage, pending operations, notebook revision. |
| `DraftNotebook`                          | Concise findings, evidence references, open questions, and next actions within that session.                     |

For investigation:

```text
Goal: Explain how login currently works.
Constraint: Do not edit files.
Completion: Findings supported by file references.

Notebook:
  Finding: Login creates a session cookie.
  Evidence: inspected authentication route.
  Open question: Where is the callback URL configured?
  Next action: Read the configuration module.
```

The assignment remains authoritative. Updating the notebook cannot redefine the goal or grant write tools. Notes are useful task memory, not a private reasoning transcript. Each invocation gets a fresh isolated session; reusing a definition does not share mutable conversations.

### Model, Tools, and Output

`ModelGateway` abstracts the model provider. `ToolRegistry` defines allowed tool objects; `ToolDispatcher` validates arguments and invokes them. A read-only investigation session might receive search/read and notebook tools; an editing session receives explicitly permitted write capabilities.

`ResultContract` validates the proposed final output at runtime. `AgenticMindUnitOutcome` distinguishes a completed result from cancellation, budget stop, failure, or interruption. A structurally valid answer still needs appropriate evidence and verification; a model saying “done” is not sufficient.

See [AgenticMindUnit](12-agentic-mind-unit.md).

## 9. AgentMemory: Remembering Beyond One Conversation

The agent needs to distinguish current work from knowledge it may use on future tasks:

| Memory     | Simple meaning                   | Example                                                                  |
| ---------- | -------------------------------- | ------------------------------------------------------------------------ |
| Working    | What matters during active work. | The current session notebook and pending questions.                      |
| Episodic   | What happened in past tasks.     | A previous callback configuration failure and its outcome.               |
| Semantic   | Supported facts.                 | This project uses session cookies, with evidence and freshness metadata. |
| Procedural | Reusable methods and lessons.    | An authentication verification checklist.                                |

`AgentMemory` is a scoped facade over these capabilities. Working-memory access adapts the existing notebook rather than maintaining a second independently mutable copy.

Short term and long term describe lifetime, while these categories describe meaning. Persisting a notebook does not turn all its observations into confirmed long-term facts.

During Google-login investigation, **the unit retrieves relevant authorized memories** and checks their evidence against current source. After completion, the coordinator can record an episode from the actual task outcome and propose reusable facts/procedures. **A validation policy decides what becomes confirmed memory.**

Future password-reset work can retrieve that knowledge through the same agent/project scope, with its own fresh notebook and run. Entries need provenance, freshness, correction/supersession, deletion, and concurrency rules. **Retrieved memory cannot override the current assignment or permissions.**

See [Agent Memory](13-agent-memory.md).

## 10. Model Routing: Different Models for Different Work

The planning, coding, and review tasks do not have to use the same model:

```text
Specification → eligible strong planning profile
Implementation → eligible economical coding profile
Verification → deterministic code where appropriate
Review → configured review profile
```

**A `ModelProfile` describes configured model identity, capabilities, and limits.** `ModelRoutingPolicy` selects an eligible profile by role, requirements, and budget. `ModelGatewayFactory` supplies its adapter without putting provider branches inside the engine or loop.

A precise planning result becomes the coding assignment: relevant files, constraints, bounded tasks, acceptance criteria, and checks. Independent verification supplies actual feedback. An economical model receiving a vague plan is not made reliable merely by its routing label.

If failures justify escalation, `EscalationPolicy` can request stronger diagnosis or correction. `ModelHandoff` carries the assignment, current changes, evidence, notebook summary, unresolved actions, and usage into a new session. Provider-specific live conversations are not silently transplanted between models.

`RunUsageBudget` accounts for all models, decision calls, retries, and escalation. Per-session loop limits constrain iterations/tools/output/time; starting a new session does not reset the run ledger. If no eligible affordable option remains, the framework reports an explicit stop rather than false completion.

See [Model Routing and Escalation](14-model-routing-and-escalation.md).

For the complete hierarchy of run/session/call budgets, deadlines, reservations, unknown usage, retries, memory/tool/storage bounds, and stop behavior, see [Limits, Budgets, and Execution Control](18-limits-budgets-and-execution-control.md). Children cannot enlarge parent allowances and consumption survives recovery.

## 11. DecisionUnit: System 1 with Interchangeable Providers

Sometimes the agent needs a bounded judgment rather than an investigation loop:

```text
Question: Which optional review applies to these changes?
Options: authentication, database, none
Evidence: bounded changed-file and diff summary
```

`DecisionUnit` asks a configured `DecisionProvider` for an answer. `JevDecisionProvider` is one possible adapter; an alternative structured-model or local-service adapter can implement the same interface.

```text
DecisionUnit → injected DecisionProvider → selected service
             ↓
Validated answer, abstention, or failure
             ↓
DecisionPolicy → accept, fallback, preserve ambiguity, or deeper evaluation
```

JEV is not the abstraction the agent depends on. Switching compatible registered providers is a configuration/composition change. A new service needs an adapter and registration, without edits to agent/workflow logic. Provider-specific confidence handling stays explicit; one service's score is not automatically comparable to another's.

The System 1 label describes the intended bounded-decision role, not a guaranteed speed or correctness. For Google login, a recommendation for authentication review can supplement required checks. A provider failure cannot silently become “none,” and a decision cannot grant tools or remove mandatory verification.

See [DecisionUnit](15-system-one-decision-unit.md).

## 12. Verification, Policies, and Feedback

The coding unit returns changes. 

`VerificationExecutor` runs configured checks through injected capabilities and returns actual evidence. 

A failed check can be a valid executor result; a failure to launch the check is a different outcome. Consequently, a verification StepRun may be completed with checksPassed=false while the parent run remains active and selects a fix. Completed execution does not necessarily mean accepted business outcome.

A review executor compares specification, diff, and verification evidence. **A transition policy decides whether to finish, revisit implementation with a bounded fix assignment, or stop.** It does not treat a model's success claim as verified completion.

Keep these different behaviors separate:

| Situation | Responsible behavior |
| --- | --- |
| Temporary model transport failure | Limited technical retry with recorded reason. |
| Implementation violates a criterion | Fix assignment with evidence, then checks and review. |
| Evidence indicates stronger help is needed | Bounded escalation with an explicit handoff. |
| Process was interrupted | Recovery policy restores or reconciles saved state. |
| Budget/cancellation prevents more work | Explicit stopped/cancelled outcome. |

Policies are interchangeable objects behind small interfaces. Do not grow provider/type/status switches inside the engine to implement every variation. Side-effecting work must not be repeated blindly just because a retry is permitted for read-only work.

See [Recovery, Memory, and Context Handoff](05-recovery-and-memory.md).

## 13. Persistence: Saving the Right Things in the Right Place

| Component         | Purpose                                                                                          |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `RunRepository`   | Saves authoritative workflow/step state and typed results.                                       |
| `CheckpointStore` | Saves enough protocol/session state to resume safely, including counters and pending operations. |
| `ArtifactStore`   | Stores larger reports, diffs, and outputs referenced by results/events.                          |
| Memory stores     | Retain scoped episodes, supported knowledge, procedures, and proposals across tasks.             |
| Debug event store | Retains the correlated history for inspection.                                                   |

A notebook alone **is not a complete checkpoint.** 

Recovery may need model/tool message pairing, notebook revision, usage, and uncertain side-effect records. Reconstruct live services and cancellation signals instead of serializing them.

For example, after a crash the engine can reuse a durably saved investigation result. If a write tool may have succeeded before its completion was saved, reconcile the actual workspace or use its idempotency contract before retrying.

A successful executor return and a durably persisted result are separate facts. Only claim persistence after confirmation. Inspecting/replaying a debug timeline does not execute the tools again.

### Configure Durable Storage: PostgreSQL or SQLite

**Choose the database once. The framework creates its own tables and supplies the repositories/stores used by the rest of the framework.**

Applications should not have to implement every repository or manually create framework tables to get durable execution. Provide interchangeable PostgreSQL and SQLite persistence adapters with the same public store contracts.

These are proposed configuration examples, not already implemented APIs.

```typescript
const persistence = await FrameworkPersistence.initialize({
  provider: "postgresql",
  connectionString: process.env.AGENT_DATABASE_URL,
  tablePrefix: "agent_",
  schemaManagement: "migrate-on-start",
});
```

For an application using a local SQLite file:

```typescript
const persistence = await FrameworkPersistence.initialize({
  provider: "sqlite",
  filename: "./data/agent.sqlite",
  tablePrefix: "agent_",
  schemaManagement: "migrate-on-start",
});
```

Initialization validates the selected configuration, including a missing connection string or invalid file location. Connection credentials stay in trusted host configuration and are not sent to a model or recorded in debug payloads.

### What Happens at Startup?

1. Connect to the selected database; the SQLite adapter opens/creates the configured database file under its permitted boundary.
2. Check the installed framework schema version.
3. Create framework-owned tables on a new installation, or apply pending versioned database migrations to an existing installation.
4. Construct the SQL-backed repositories and stores.
5. Return the persistence bundle and allow task execution after initialization succeeds.

The PostgreSQL database/service must already exist or be provisioned separately; this setting creates the framework's tables inside the configured database. It does not install a database server. The adapter documents any required namespace setup.

“Create tables if missing” handles only the first installation. Versioned migrations also update tables/indexes as framework versions evolve while preserving existing data under the migration contract. A schema-migration ledger records what has been applied. Startup coordination ensures multiple workers cannot apply the same migration independently. Initialization failure stays visible rather than starting work against a partially initialized or incompatible schema.

These are database schema migrations for framework-owned storage, not a plan to change or migrate the existing AI Harness.

### Example Framework-Owned Tables

The exact SQL schema is an implementation decision. The following names illustrate the kinds of records the selected adapter creates:

| Stored information | Example tables |
| --- | --- |
| Workflow execution and results | agent_runs, agent_step_runs, agent_attempts, agent_results. |
| Agentic sessions and recovery | agent_sessions, agent_checkpoints, agent_notebook_revisions. |
| Agent knowledge and proposals | agent_memory_entries, agent_memory_proposals. |
| Produced artifacts | agent_artifacts; optional agent_artifact_content. |
| Debug history | agent_debug_events. |
| Usage and outstanding reservations | agent_usage_entries, agent_budget_reservations. |
| Publication and its actual operations | agent_proposals, agent_approvals, agent_publication_operations, receipt/journal records. |
| Database schema versions | agent_schema_migrations. |

The configured prefix keeps framework table names distinct from application tables. A prefix is a namespace convention, not access control. Each adapter implements appropriate transactions, uniqueness/version checks, indexes, and scope constraints for the same behavioral contracts.

### How This Fits the OOP Design

```text
FrameworkPersistence initialization
  → configured PersistenceProvider
    → PostgreSqlPersistenceProvider or SqlitePersistenceProvider

Returns framework store implementations:
  RunRepository
  CheckpointStore
  Memory stores
  ArtifactStore
  DebugEventStore
  UsageLedger
  Workspace/publication stores
```

Composition injects the returned stores into the engine, session/memory services, guards, debug infrastructure, and publisher. Executors keep using ExecutionContext and their capability interfaces. The engine does not need database-provider branches, and domain objects do not create hidden SQL clients.

A different supported database can be selected through configuration. Moving already-stored data between PostgreSQL and SQLite is a separate explicit export/import operation; changing provider does not automatically transfer existing runs or knowledge.

### Where Artifact Bytes Are Stored

Artifact metadata and access/provenance records can live in SQL while content storage is configured separately:

- Database-backed content: the adapter stores metadata and bytes in the database.
- File/object-backed content: SQL stores metadata and stable references; a configured durable content adapter stores the bytes.

The persistence configuration must make that choice explicit and initialize the required components. Cross-store writes/cleanup use the ArtifactStore commit/recovery contract; they are not assumed to be one SQL transaction. Required artifact bytes must remain available across restarts along with their references.

### Example: Restart During Google Login

Suppose run-42 has completed investigation and specification but is interrupted during implementation. Its run, session checkpoint, notebook revision, accepted result references, usage reservations, and uncertain tool operations were saved through the configured stores.

After restarting with the same PostgreSQL database or SQLite file:

1. Initialization checks/applies the framework's schema version and opens the same stored records.
2. The recovery coordinator loads run-42 and validates its checkpoint/operation/ledger state.
3. It reuses accepted results and reconciles uncertain effects before continuing implementation.
4. It rebuilds live services, cancellation signals, and scoped execution contexts; SQL stores serializable state and references, not running client objects.

The framework does not create a fresh empty task merely because the process restarted. A saved approval/proposal also retains its exact scope and must still be revalidated before publication. Database reconnection alone is not permission to replay external side effects.

### ArtifactStore in Plain Language

An artifact is a saved piece of output, such as a detailed report. ArtifactStore keeps it and returns a reference. A step result can contain the short answer and that reference.

```text
ArtifactStore:
  artifact-17 → detailed investigation report

Investigation step result:
  summary: Authentication uses session cookies.
  report: reference to artifact-17

Specification step:
  Receives the saved summary/reference.
  Reads artifact-17 when it needs the detailed findings.
```

The report is stored once. **Other steps pass its reference instead of copying the full report into every result**. A reference identifies the material; access checks still determine who can read it.

### Example A: An Executor Saves Its Report

These proposed examples use the shared Executor, ExecutionContext, ArtifactRef, and InvestigationInput contracts from the framework/earlier examples; imports are omitted. This report-producing output adds an artifact reference to the earlier minimal investigation example.

```typescript
interface InvestigationReportResult {
  readonly summary: string;
  readonly report: ArtifactRef;
}

interface InvestigationCapability {
  inspect(
    input: InvestigationInput,
    context: ExecutionContext,
  ): Promise<{ readonly summary: string; readonly reportText: string }>;
}

class ReportSavingInvestigationExecutor
  implements Executor<InvestigationInput, InvestigationReportResult>
{
  constructor(private readonly investigation: InvestigationCapability) {}

  async execute(
    input: InvestigationInput,
    context: ExecutionContext,
  ): Promise<InvestigationReportResult> {
    const findings = await this.investigation.inspect(input, context);

    const report = await context.artifacts.write(
      {
        name: "authentication-report.md",
        kind: "investigation-report",
        mediaType: "text/markdown",
        data: new TextEncoder().encode(findings.reportText),
        idempotencyKey: "investigation-report/main",
      },
      { signal: context.signal },
    );

    return { summary: findings.summary, report };
  }
}
```

The injected investigation capability can use AgenticMindUnit and permitted workspace tools. This executor saves its bounded report and returns a small typed object; it does not return a JSON string or save the whole workflow itself.

**For Google login, findings.reportText might explain the current routes and session creation with file references**. The scoped store derives trusted run/step/attempt ownership and applies access, content, and size rules. It scopes the example idempotency key to the producer operation; a new execution/source revision gets distinct identity and cannot overwrite earlier report bytes.

The engine then accepts and persists the returned summary and ArtifactRef as the StepRun result through RunRepository. Report saved and step result saved are separate facts. Required write failures remain visible, and dependent steps run only after the result is accepted under the workflow's durability contract.

### Example B: The Next Step Receives the Reference

The workflow input policy selects values from the accepted investigation result:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationReportInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationReportInput> {
    const { request, results } = context;
    return {
      goal: request.goal,
      investigationSummary: results.investigate.summary,
      report: results.investigate.report,
    };
  }
}

// Builder excerpt; this variant uses the report-producing executor above.
.step("specify", {
  title: "Prepare a specification",
  executor: specificationExecutor,
  inputPolicy: new SpecificationInputPolicy(),
})
```

This is explicit data flow between steps. The next step gets its own input object, not unrestricted access to the previous session's notebook or the entire run.

### Example C: The Specification Executor Reads the Report

```typescript
interface SpecificationReportInput {
  readonly goal: string;
  readonly investigationSummary: string;
  readonly report: ArtifactRef;
}

interface SpecificationCapability {
  create(
    goal: string,
    evidence: { readonly summary: string; readonly reportText: string },
    context: ExecutionContext,
  ): Promise<string>;
}

class ReportReadingSpecificationExecutor
  implements Executor<SpecificationReportInput, string>
{
  constructor(private readonly specification: SpecificationCapability) {}

  async execute(
    input: SpecificationReportInput,
    context: ExecutionContext,
  ): Promise<string> {
    const document = await context.artifacts.read(input.report, {
      maxBytes: 64 * 1024,
      signal: context.signal,
    });

    if (document.ref.mediaType !== "text/markdown") {
      throw new Error("Expected a Markdown investigation report");
    }

    const reportText = new TextDecoder("utf-8", { fatal: true })
      .decode(document.data);

    return this.specification.create(
      input.goal,
      { summary: input.investigationSummary, reportText },
      context,
    );
  }
}
```

The read-size value is illustrative.

ArtifactStore verifies authorized access, readiness, full-read size, and integrity; the executor checks the expected format and decodes it. The plain error above keeps the sketch short; implementation normalizes it into the framework's typed content-contract error.

The injected specification capability may use the configured StructuredTaskExecutor/AgenticMindUnit behavior to produce a specification. The example returns a string to show that outputs need not all have the same object shape. A production workflow can instead require its own validated structured specification contract. This is an example consumer, not a new mandatory default executor.

The report is evidence, not instructions that override the assignment or permissions. The model context composer still selects bounded material to fit the selected model; successfully storing/reading a report does not guarantee that its whole content fits an LLM context.

### What This Changes—and What It Does Not

1. Investigation creates a report artifact and returns its reference.
2. The engine saves the small accepted investigation result.
3. The next step maps that reference into its input.
4. Its executor reads the authorized report and produces a new result.
5. The same record/persist/map cycle continues.

Artifact ready does not mark a session, StepRun, WorkflowRun, or publication completed. It does not confirm a long-term memory or publish source changes. Those concepts retain their own owners and lifecycle rules.

Also, readonly artifacts: ArtifactStore means the context property cannot be reassigned in ordinary TypeScript code. It does not prevent authorized write() calls. Components needing only reads can receive the narrower ArtifactReader interface.

See [ArtifactStore: Produced Materials and Evidence](23-artifact-store-and-produced-materials.md) for the complete contracts, immutability, retention, quotas, recovery, and access rules, or [Executor Results and Contracts](03-executors-and-contracts.md) for the saved-result flow.

## 14. Debug Events: Explaining What Happened and Why

`ScopedDebugRecorder` attaches the right run, step execution, attempt, session, and operation identities to events. `DebugSpan` groups an operation's start and terminal outcome with timing. `DebugPayloadSanitizer` bounds/redacts details before storage or delivery.

A useful Google-login trace might show:

```text
step started: investigate
model selected: investigation profile, eligibility reason
session started: investigation session
operation failed: file search, temporary unavailable
retry scheduled: safe read retry, attempt limit and delay
operation completed: file search, bounded match summary
notebook revised: evidence references and pending question
result persisted: investigation result reference
transition selected: investigate → specify
```

The same timeline covers model selection/escalation, memory retrieval, System 1 recommendations and applied policies, validation, budgets, checkpoints, and final outcomes. Selected model/provider identity and usage remain visible.

`DebugEventStore`, query services, and `DebugTimelineFormatter` make events inspectable as a readable timeline or JSONL without an application UI. Correlation/causation identifies relationships; append sequence alone does not prove cross-producer causality.

For state changes, include aggregate ID/version, accepted command/event identity, previous/next state, reason/policy, and child/result/proposal references. A rejected transition is not recorded as an accepted one, and approval intent is distinct from confirmed publication effects.

Avoid secrets, unrestricted prompts/source content, and private reasoning traces. Required lifecycle durability and optional live delivery have explicit failure behavior. A crash can leave an open span; show interruption or uncertainty rather than inventing success.

See [Debug Events and Run Tracing](11-debug-events-and-run-tracing.md).

## 15. Composition and OOP: Connecting Interchangeable Parts

The composition root/factories assemble concrete implementations behind the framework's public `index.ts` API:

```text
Workflow engine + StepRunner + domain objects
Executors + AgenticMindUnit runner + model/tool interfaces
DecisionUnit + selected DecisionProvider
Scoped memory + durable adapters
Routing/escalation policies + shared budget
Repositories/checkpoints/artifacts + scoped debug recorder
```

Classes own cohesive responsibilities and keep mutable state private. Constructor injection supplies clients and policies; adapters translate external SDK/storage behavior. Core contracts do not import UI code or concrete database/model clients.

Examples consume the public API; internal modules can import their owning contracts directly. Do not make ExecutionContext a global service locator, share mutable model/session state between runs, or create multiple competing notebook/gateway/usage contracts.

The first implementation remains a standalone framework with isolated durable adapters, fake providers/tools for deterministic tests, and examples. Existing Harness code, application-wide schemas, routes, and UI remain unchanged.

See [OOP Architecture](08-oop-architecture-and-design-rules.md), [File Organization](02-location-and-file-organization.md), and [First-Version Scope](07-first-version-scope.md).

## 16. State Machines: Valid Changes for Each Execution

A state machine answers three questions: **What condition is this object in? Which event happened? Is the requested change valid?**

For Google login, the workflow graph might say **implement → verify → review**. Meanwhile the run is active, the current implementation StepRun is active, its agentic session is awaiting a tool result, and no publication exists yet. These facts can all be true simultaneously.

### The Plan and the Lifecycles Are Different

| Part           | What its state means                                                 | Who owns the rules                                                                      |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Workflow graph | Which assignment can follow which accepted result.                   | Immutable WorkflowDefinition plus TransitionPolicy.                                     |
| WorkflowRun    | Overall lifecycle of this request.                                   | WorkflowRun domain methods/state rules; engine coordinates.                             |
| StepRun        | Lifecycle of one execution of a step.                                | StepRun domain methods/state rules; StepRunner/coordinator supplies outcomes.           |
| AgenticSession | Lifecycle and protocol phases of one model/tool loop invocation.     | AgenticSession; AgenticMindUnitRunner coordinates.                                      |
| Publication    | Lifecycle of approval/application for one exact proposal and target. | Publication domain object; trusted approval boundary and WorkspacePublisher coordinate. |

The state vocabulary below is illustrative proposed design, not an already implemented enum/API. A status string is only part of state; current child references, result versions, pending operations, and counters matter too.

### Run Lifecycle: The Overall Task

```text
created → queued → active
                    ├→ waiting_for_approval → active for publication
                    ├→ paused → resume when valid
                    ├→ recovering → active or an honest stopped/failed outcome
                    └→ completed / stopped / failed / cancelled
```

This diagram sketches **possible branches**, **not permission to make every transition from every state**. Domain rules and evidence validate each event. Some configurations can admit work directly without a visible queued interval.

While investigation, specification, and coding finish, run-42 usually remains active. The engine records a new current StepRun and result references rather than inventing run statuses such as reading_auth_file.

For a publication-inclusive plan, run-42 can enter completed only when the implementation criteria, required guards/checks, and confirmed matching publication receipt are durably recorded. A build-only plan may instead finish with an explicitly unpublished proposal. The completion contract must be clear before execution.

**A cancellation request is an intent**. 

Signal children and reconcile known/uncertain effects before reporting the applicable terminal outcome. Do not assert that cancellation undid a file write or partially applied publication.

### StepRun Lifecycle: One Assignment Execution

```text
pending → active → completed
             ├→ retry_wait → active, with a new attempt
             ├→ interrupted → validated recovery
             └→ failed / stopped / cancelled as applicable
```

The engine coordinates accepted state/result persistence through domain methods and repositories. StepRunner handles execution mechanics and injected policies; it is not another independent owner of the same lifecycle.

For Google login:

```text
sr-implement-1: completed with its original change/result references
sr-verify-1: completed, checksPassed=false
sr-review-1: completed, decision=fix-required
sr-implement-2: new StepRun for the correction
```

**No completed old result is rewritten to pretend the fixed version was always there.** Verification/review after the fix uses the corrected artifact/result revision, not an old passing report.

### AgenticSession Lifecycle: One Inner Loop

```text
created → active → completed
             ├→ interrupted → recovering → active when safe
             └→ stopped / failed / cancelled as applicable
```

An active session also has a current phase:

```text
compose input → await model → process response
                               ├→ invoke tools → record observations
                               ├→ update notebook
                               └→ validate final output
```

These phases are not parent run statuses. A notebook revision advances working memory, not the workflow position. A proposed final answer must satisfy its runtime result contract and completion policy before the session completes.

A completed session can return its result while its StepRun is still active because mapping/parent persistence is pending. Recovery can accept the saved child outcome once rather than repeat side effects. The model does not directly mark the run completed.

Escalation creates a new linked session with a different selected gateway; the old session keeps its actual outcome. A valid same-session resume restores protocol state and counters without resetting budgets.

### Publication Lifecycle: Approval and Actual File Application

The agent edits a working copy. After checks, ChangeSetBuilder freezes the exact proposed additions/edits/deletions. Publication owns one proposal/version/digest and its designated original target:

```text
prepared → awaiting_approval
               ├→ rejected or superseded
               └→ approved → preflight → applying → published
                                  └→ conflicted / failed-before-apply
                                               applying
                                                  └→ partial/uncertain → reconciling
```

Prepared is not approved. Approved is not published. Published requires a verified durable receipt under the provider's actual guarantees.

A user requesting changes leads to a new proposal/version and fresh applicable checks/approval. A conflict detected against the original target does not authorize overwriting the user's edits. A resolved candidate must be checked and approved as a new proposal.

Cancellation or crash during multi-file application may leave partial effects. Keep the journal and reconcile actual target state. Rollback must not overwrite subsequent user edits. Do not hide that situation behind a generic cancelled or completed label.

### One Timeline with All the Objects

| Moment                            | Run run-42                                                | Current/relevant StepRun                                 | AgenticSession                                               | Publication                      |
| --------------------------------- | --------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| Request admitted.                 | active.                                                   | Investigation pending.                                   | None.                                                        | None.                            |
| Investigation reads files.        | active.                                                   | sr-investigate-1 active.                                 | Investigation session active / invoking tools.               | None.                            |
| Investigation result saved.       | active.                                                   | sr-investigate-1 completed; specification starts.        | Investigation completed; planning session starts separately. | None.                            |
| Coding returns changes.           | active.                                                   | Implementation completed at result persistence boundary. | Coding session completed.                                    | None.                            |
| Checks find a callback mismatch.  | active.                                                   | Verification completed with failed check evidence.       | No session needed for deterministic check.                   | None.                            |
| Fix performed.                    | active.                                                   | New implementation/check/review StepRuns.                | New isolated coding/review sessions as needed.               | None.                            |
| Accepted reviewed proposal ready. | waiting_for_approval.                                     | Required coding/check steps completed.                   | Prior sessions remain completed.                             | awaiting_approval.               |
| Trusted approval received.        | Waiting until coordinator starts publishing, then active. | No coding task needs to restart.                         | No agentic session can self-approve.                         | approved → preflight → applying. |
| Matching receipt confirmed.       | completed after final invariants/persistence.             | Completed execution history retained.                    | Completed sessions retained.                                 | published.                       |

If interrupted during coding, recovery reconstructs run/step/session state and uncertain tool effects before resuming.

If the original target conflicts during publication, keep the run non-completed while resolving the conflict and obtaining approval for a new proposal.

### How These States Connect to Other Concepts

| Concept                    | Relationship to lifecycle state                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Executor                   | Performs the capability and returns an outcome; it does not assign arbitrary run statuses.                       |
| Workflow context           | Carries selected request/results for input policy; it is not the authoritative lifecycle object.                |
| ExecutionContext           | Supplies identity, cancellation, debug, and artifacts without granting direct state mutation.                    |
| Model context and notebook | Support the active loop; a note/model response does not itself complete a step.                                  |
| AgentMemory                | Keeps scoped knowledge/episodes across runs; memory is not a substitute for current authoritative run state.     |
| Model routing/escalation   | Selects gateways at boundaries and creates explicit handoffs/new sessions, preserving history.                   |
| DecisionUnit / System 1    | Supplies bounded recommendations; policy/domain validation controls accepted transitions.                        |
| Guards and verification    | Return evidence and coverage; enforcement/transition policies decide fixes or acceptance.                        |
| Budgets and deadlines      | Can prevent new work or trigger stopped/recovery behavior; pause/retry/escalation does not replenish allowances. |
| Repositories/checkpoints   | Persist snapshots/pending outcomes; validated rehydration preserves identities and consumed usage.               |
| Debug events               | Explain transitions and effects; logs or UI projections are not another state authority.                         |
| WorkspacePublisher         | Applies only a trusted approved immutable proposal; its actual receipt gates publication-inclusive completion.   |

### Where the Code Lives and How OOP Helps

Workflow graph definitions belong in domain/WorkflowDefinition.ts and builder/. WorkflowRun/StepRun lifecycle rules live with their domain objects, optionally in cohesive domain/lifecycle/ modules. AgenticSession rules live in agentic/lifecycle/. Publication and its rules live in workspaces/publication/.

Use a declarative transition table and invariant guards for simple validation. When states choose genuinely different behavior, implement small state/policy objects through interfaces and registries rather than one giant status switch in the engine. Not every status needs a subclass merely to hold its name.

Domain methods reject invalid commands and protect private state. The engine/runners/publisher coordinate operations through those methods; repositories use version checks to reject stale writes. Durable command/outcome IDs and coordination records/outbox semantics prevent duplicate child completion or publication after retries/restarts. Do not assume sequential method calls across stores are one atomic transaction.

See [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md) for detailed transition rules, concurrency/durability boundaries, file ownership, and worked success/fix/crash/conflict scenarios.

## 17. Guards and Isolated Workspaces: Rules Before Publication

A guard packages skill guidance, stable rules, applicability, and checking configuration. GuardSelectionService asks System 1 DecisionUnit, using the configured JEV or interchangeable DecisionProvider, which candidates apply before planning and after the diff exists. Required guards remain enforced even when the provider abstains/fails.

For Google login, selected OOP and ESLint guidance helps planning/coding. GuardRunner later invokes actual lint capability and structural/model-assisted OOP checks. GuardReports tie passed/failed/not-applicable/unable-to-evaluate outcomes to rule versions, source fingerprints, and evidence. GuardEnforcementPolicy creates bounded corrections for blocking findings; an unavailable required check is not passed.

All edits and checks target a separately created working workspace with a defined baseline. ChangeSetBuilder freezes reviewed content; the user approves that proposal, and WorkspacePublisher checks current target conflicts before applying it back to the original. Only approved paths change. A changed proposal, stale evidence, or conflicting original requires explicit handling rather than automatic overwrite.

The state machines explain the boundaries: coding session completed → step result saved → guards/checks accepted → publication awaiting_approval → applying → published → run completed under the publication-inclusive plan.

See [Guards](20-guards-skills-rules-and-system-one-selection.md) and [Isolated Workspaces and Approved Publication](21-isolated-workspaces-review-and-publication.md).

## 18. How All the Objects Cooperate

For “Add Google login,” the complete conceptual sequence is:

1. Trusted composition supplies agent identity, scopes, providers, allowed tools, stores, limits, and policies. **Create an isolated working workspace** from a defined baseline.
2. **System 1 DecisionUnit can classify the request and select relevant guards through** JEV or another registered provider. Policies validate recommendations and preserve required instructions/checks.
3. FeatureWorkflow supplies an immutable definition. Admission and engine create a fresh WorkflowRun that becomes active under its lifecycle rules.
4. The **engine selects investigation**, creates StepRun/attempt state, and supplies workflow and execution contexts. **StepRunner maps input and invokes the executor**.
5. The executor configures **AgenticMindUnit**. Routing/context resolution selects an eligible model; composition supplies its gateway and scoped capabilities.
6. A created → active AgenticSession uses selected memory, bounded model calls, allowed tools, and its notebook. A valid completed outcome is mapped into a step result.
7. The coordinator accepts/persists that result through domain objects before advancing the workflow. Child completion and parent persistence remain distinct.
8. Planning produces a precise contract; coding can use an economical profile in a separate isolated session. Earlier sessions/results are retained as history.
9. Verification and guards return actual evidence. A completed check StepRun may report failed checks; transition policy creates a new fix StepRun rather than reopening the old one.
10. Escalation can create a stronger-model session with an explicit handoff. Retry/fix/session counters and run-wide usage remain accounted for.
11. Recovery reconciles interrupted protocol/tool state or persistence gaps before resuming; logs and model claims do not establish actual side effects.
12. After accepted checks/review, freeze an immutable proposal. Run becomes waiting_for_approval while Publication awaits the trusted user decision.
13. Approved publication preflights conflicts, applies exact approved operations, and records a verified receipt. Only then can this publication-inclusive run become completed. Changes/conflicts/partial effects follow their own explicit states.
14. The coordinator can record an episode from the confirmed outcome and propose supported durable knowledge without letting optional memory-write failure rewrite task/publication history.
15. Correlated debug events explain transitions, model/decision choices, memory influence, limits, checks, approval, actual effects, and durability.

A future password-reset task reuses permitted durable knowledge and reusable definitions/capabilities, while creating separate run, StepRun, session, workspace, and publication state as needed.

This remains the introductory explanation, with the original StepDefinition code above. For detailed per-stage identifiers, state snapshots, evidence, failure branches, and standalone checks, read [Complete Framework Walkthrough: Google Login](17-google-login-complete-walkthrough.md).

[Core concepts reference](01-core-concepts.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## The Policy Objects in This Walkthrough

All configurable selections use the shared Policy<TInput, TOutput> contract. StepDefinition stores the input policy; StepRunner awaits inputPolicy.apply(workflowContext). The unit's composer calls its context policy's apply() before each model request. Completion, routing, transition, guard, and recovery decisions follow the same method convention with their own typed data. The policy object selects or transforms; the owning executor/runtime performs work, validates invariants, and coordinates durable acceptance. No input callback or separate mapper interface is part of this proposed API.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

