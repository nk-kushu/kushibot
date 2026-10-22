# Complete Agent Example: Every Framework Feature Together

A detailed, connected Google-login assignment covering all current framework topic pages.

## Document Contents

1. [The task and the finished result](#section-01)
2. [The complete route through the framework](#section-02)
3. [The identities and places used in this story](#section-03)
4. [Composition: which objects are connected before execution](#section-04)
5. [The four built-in executors and their different jobs](#section-05)
6. [Admission, the request, and the first durable state](#section-06)
7. [Budgets are resolved before any model is called](#section-07)
8. [Capture the original and create a separate working workspace](#section-08)
9. [System 1 classifies the task and selects guard candidates](#section-09)
10. [Selected guards contribute instructions and checkable rules](#section-10)
11. [Define a reusable workflow, with named steps](#section-11)
12. [Keep the run, step, session and publication lifecycles separate](#section-12)
13. [Three contexts, one explicit input policy](#section-13)
14. [Retrieve memory without confusing it with execution state](#section-14)
15. [Select an investigation model through hierarchical routing](#section-15)
16. [Start AgenticMindUnit with an immutable assignment](#section-16)
17. [Observe the inner loop, a read failure and notebook updates](#section-17)
18. [Save the investigation report and return a typed result](#section-18)
19. [Accept the result and prepare the next context](#section-19)
20. [The planning step reads the report and produces the contract](#section-20)
21. [Economical coding uses a bounded handoff in a new session](#section-21)
22. [Verification saves actual failures and review consumes them](#section-22)
23. [The first fix fails and routing escalates with evidence](#section-23)
24. [The stronger coding session is interrupted and safely resumed](#section-24)
25. [OOP and ESLint guards check the resulting artifact](#section-25)
26. [Track every result and artifact without confusing the stores](#section-26)
27. [A real budget ledger and what approaching exhaustion means](#section-27)
28. [Freeze a review bundle with exact proposed file bytes](#section-28)
29. [Ask the user to approve the concrete proposal](#section-29)
30. [The original changed: conflict and a new approval](#section-30)
31. [Apply only approved changes and survive interrupted publication](#section-31)
32. [The complete coordinated state timeline](#section-32)
33. [What the agent stores during the task versus afterward](#section-33)
34. [A later task benefits without inheriting old execution state](#section-34)
35. [One debug timeline explains every important decision](#section-35)
36. [Debug delivery, artifact retention and resource growth remain bounded](#section-36)
37. [Failure branches that stop the story instead of fabricating success](#section-37)
38. [Concurrency, idempotency and durable coordination](#section-38)
39. [What the user sees and what can be inspected](#section-39)
40. [A compact workflow class and the actual result handoffs](#section-40)
41. [Where every implementation responsibility belongs](#section-41)
42. [How providers and capabilities are replaced without rewriting the agent](#section-42)
43. [How to build this exact example as an offline acceptance scenario](#section-43)
44. [Feature coverage and links to every current topic](#section-44)

<a id="section-01"></a>

## 1. The task and the finished result

The user asks the configured development agent:

> Add Google login to the Shop application. Keep existing email/password login working. Work in a separate copy. Show me the exact changes and check results, and update my original files only after I approve.

This document follows that one assignment through the complete proposed framework. It explains the normal behavior and the recovery needed when actual work is not smooth. Every later example refers back to this task, not a separate unconnected demonstration.

The main story includes a temporary read failure, two failed verification passes, stronger-model escalation, interruption during an edit, an OOP guard correction, target changes after approval, and interrupted publication followed by reconciliation. The eventual outcome is a confirmed approved local publication, supported by saved results, reports, and a durable receipt.

These are design examples for a framework that has not yet been implemented. Identifiers, limits, model aliases, fixture files, and diagnostics are illustrative. The authentication content describes a controlled fixture scenario, not a complete Google OAuth implementation guide. The examples use no actual credentials and do not claim to configure an external OAuth application.

The first implementation builds the standalone framework and fixture demonstrations. It does not change the current AI Harness. Parallel/nested workflow execution, learned model routing, hosted vector infrastructure, and additional production storage/providers are optional extensions rather than prerequisites.

This new document brings the whole design together. The existing [Google-login walkthrough](17-google-login-complete-walkthrough.md) remains a useful companion; the coverage map at the end links every current topic page.

<a id="section-02"></a>

## 2. The complete route through the framework

```text
Trusted request and agent configuration
  → admission, scope, limits, durable run identity
  → isolated workspace and baseline
  → System 1 classification and guard selection
  → workflow selects investigation
  → StepRunner maps input into an executor assignment
  → AgenticMindUnit session uses model, tools, memory, notebook
  → report artifact + small saved step result
  → strong planning session prepares a specification
  → economical coding session implements a bounded task
  → actual verification + guard checks + review
  → bounded fixes and stronger-model escalation when justified
  → recover interrupted work without blindly repeating effects
  → freeze an immutable proposal
  → user approval for exact bytes and target
  → conflict resolution/new approval if original changed
  → journaled application and confirmed receipt
  → complete run and record supported reusable knowledge
```

The workflow coordinates this process, but each object owns its own state. The model never becomes the authority for approval, actual tool effects, resource balances, or whether publication completed.

One object doing everything would make this hard to test and replace. The framework instead gives the same collaborators different clear jobs and injects their implementations at composition time.

<a id="section-03"></a>

## 3. The identities and places used in this story

| Identity | Meaning |
| --- | --- |
| developer-agent / project shop | Stable trusted agent/project scope across tasks. |
| run-101 | This Google-login workflow execution. |
| implement-feature/v1 | Immutable workflow definition and version. |
| baseline-101 | Captured original source state at task start. |
| workspace-101 | Isolated writable working environment. |
| sr-investigate-1 | One execution of the investigate step. |
| sr-implement-1 through sr-implement-4 | Initial implementation and three later corrections before first publication review. |
| sr-reconcile-target-1 | Bounded reconciliation of an original-target conflict after initial approval. |
| session-investigate-1 | The investigation AgenticMindUnit invocation. |
| session-code-1, session-code-2, session-code-3, session-code-4 | Distinct coding/fix sessions, with explicit model/handoff lineage. |
| proposal-101/v1 and proposal-101/v2 | Immutable reviewed proposals, not mutable aliases. |
| pub-101-v1 and pub-101-v2 | Separate publication lifecycles for those proposals. |
| receipt-101-v2 | Confirmed record of the eventual application. |

The original fixture workspace is /fixtures/original/shop. The agent edits /fixtures/workspaces/workspace-101. Framework-owned run/artifact/checkpoint data is stored separately under /fixtures/framework-data and excluded from source publication.

These paths are explanatory. Real providers map handles to controlled locations, enforce canonical path boundaries, and do not accept model-generated roots as authorization.

Display labels for reports and friendly artifact IDs are also explanatory. Store-generated opaque IDs, exact content digests, actual byte counts, and trusted metadata are what implementation uses.

<a id="section-04"></a>

## 4. Composition: which objects are connected before execution

The host supplies trusted configuration, scope and adapter credentials to a composition root. Standalone demonstrations use durable local adapters and scripted fake providers/tools. No real model account is required to test the orchestration.

| Collaborator | Configured job |
| --- | --- |
| WorkflowEngine + StepRunner | Plan coordination and one-step execution. |
| WorkflowBuilder + FeatureWorkflow | Typed immutable plan construction. |
| RunRepository + CheckpointStore | Authoritative snapshots, outcomes and resumable state. |
| AgenticMindUnitRunner and session factory | Reusable model/tool loop with isolated state. |
| ModelRouter implementing the routing capability | Resolve layered defaults, eligible profiles and selection policy. |
| ModelGatewayFactory | Assemble a gateway for the selected concrete model. |
| DecisionUnit + DecisionProviderRegistry | Bounded System 1 questions through the configured provider. |
| GuardRegistry + selection/runner/enforcement | Select guidance, execute checks, interpret reports. |
| Scoped AgentMemory | Working, episodic, semantic and procedural capabilities. |
| WorkspaceManager/provider/boundary | Create and constrain isolated source work. |
| ChangeSetBuilder + WorkspacePublisher | Freeze reviewable bytes and apply only approved operations. |
| Approval store + publication journal | Trusted decisions and recoverable application effects. |
| Usage ledger + execution-control policies | Reservations, limits, deadlines, admission and progress checks. |
| ArtifactStore | Durable produced materials referenced by small results. |
| ScopedDebugRecorder + event store/publisher/formatter | One correlated persisted debug/progress timeline. |

Use the framework's public index.ts from examples and consumers. Core/domain contracts do not import concrete SDKs, database clients, routes or UI. Concrete adapters depend on interfaces, and composition assembles them. Internal modules may import their owning contracts directly rather than importing their own public barrel and creating cycles.

Constructor injection supplies external collaborators. Class-owned helpers stay private. Registries/factories resolve real behavior variants instead of adding provider, guard, status or executor switches inside the engine. A readonly data shape does not need a class solely for appearance; behavior and invariants determine object ownership.

<a id="section-05"></a>

## 5. The four built-in executors and their different jobs

The planned framework supplies these defaults:

| Executor | In this task |
| --- | --- |
| WorkspaceInvestigationExecutor | Reads/searches the working codebase and returns findings/evidence. |
| StructuredTaskExecutor | Configured for specification and review tasks with declared structured results. |
| WorkspaceEditingExecutor | Applies bounded code corrections inside workspace-101. |
| VerificationExecutor | Invokes actual configured test/lint/type-check capabilities without requiring an LLM. |

All implement the shared contract:

```typescript
interface Executor<TInput, TOutput> {
  execute(input: TInput, context: ExecutionContext): Promise<TOutput>;
}
```

A default is reusable configuration/capability, not a single fixed prompt or provider. A custom executor can implement the same interface without changing workflow-engine control flow. The specification and review uses can share a class while having separate task configuration, model role, input and output contracts.

Agentic executors configure AgenticMindUnit rather than copying a while-loop. Verification can run ordinary code. Editing does not include trusted publication authority. Guards may reuse verification capabilities but also own guidance, rule coverage and enforcement; they are not merely another executor name.

<a id="section-06"></a>

## 6. Admission, the request, and the first durable state

The host validates the incoming request, project identity, workspace source, and capability scope. The model cannot assign itself another agent/project or enlarge permissions by writing a different ID.

```typescript
const request = {
  goal: "Add Google login while preserving existing login",
  workspace: "workspace-101", // Resolved scoped handle in this example.
};
```

AdmissionController checks active/queued capacity, queue age, request size and applicable quotas. It acquires capacity under its actual enforcement scope. A local in-memory limiter controls one process; a multi-worker deployment needs an atomic shared adapter for shared quotas.

The request/intent is durably recorded as run-101. Its lifecycle can pass created → queued → active when capacity and configuration permit. A queued request has not started every step or model session.

The selected definition version, effective policies/limits, source request and correlation identity are recorded. A per-run absolute deadline starts according to documented admission semantics; it is not silently restarted on pause, worker restart or escalation.

Events identify requested/admitted work, applied scope and configuration. No executor can create a fake completed run by returning a plausible string.

<a id="section-07"></a>

## 7. Budgets are resolved before any model is called

For this fixture, trusted configuration establishes illustrative upper bounds:

```text
Run: 100 model/decision calls, 200,000 input tokens, 40,000 output tokens
Run: 120 tool calls, 4 coding-fix cycles, 2 escalations, 30-minute expiry
Session: 12 iterations, 20 tool calls, 8,000 output tokens
Step: initial attempt plus at most 2 technical retries
Model call: configured context/output cap and request timeout
Tools: allowed scope, runtime, response-byte and process-output bounds
Memory: bounded query count, top-k results, selected-context allocation
Storage/debug: object/total byte caps, retention, queue and export limits
```

These are example values, not recommended production defaults. Child allowances cannot exceed parent constraints. Missing settings inherit validated defaults; unlimited is explicit where supported. Reject malformed/negative/non-finite values and impossible combinations.

RunUsageBudget delegates to one durable UsageLedger. Calls reserve capacity before dispatch and settle measured usage afterward. Outstanding reservations and unknown charges count against availability; repeated settlement is idempotent. A routing-time snapshot alone does not reserve capacity.

Context capacity differs from aggregate tokens: a small prompt repeated over many calls can consume a large run allowance. Count system/assignment instructions, schemas, selected memory, observations, input/output and provider-reported metered categories according to the adapter. Cost estimates need versioned prices and are not exact invoices.

Timeout does not prove a provider charged nothing. Preserve unknown usage by operation/request ID and reconcile conservatively. A fresh session/model/provider or fix does not reset consumption.

<a id="section-08"></a>

## 8. Capture the original and create a separate working workspace

The creation request explicitly selects the current working state of /fixtures/original/shop. This fixture includes a user-edited README and an untracked local test helper; approved inclusion rules capture both so they are not silently lost.

WorkspaceProvider captures a stable manifest baseline-101 containing included path/type/mode/content fingerprints and source identity. It verifies source stability during copy or retries/fails visibly. Cache/dependency/framework-data/secret paths follow explicit exclusion and runtime-configuration policy. An excluded path absent from the copy does not become a deletion proposal.

DirectoryCopyWorkspaceProvider can implement the first standalone version. GitCloneWorkspaceProvider and GitWorktreeWorkspaceProvider are interchangeable alternatives with explicit guarantees. A plain Git clone of a committed revision does not include uncommitted/untracked working state automatically. A worktree shares Git metadata and is not a complete independent repository sandbox.

The result is WorkspaceHandle workspace-101. Tools and commands are rooted in its isolated boundary. Enforce actual access-time path and symlink/type rules rather than trusting a model-generated filename. A filesystem working copy alone does not constrain external network/database effects; separate tool/process capabilities do that.

No task edits the original through these scoped workspace tools. The original is only a future publication target after explicit approval.

<a id="section-09"></a>

## 9. System 1 classifies the task and selects guard candidates

DecisionUnit evaluates bounded questions through an injected DecisionProvider. For this configuration, the selection provider is JEV via JevDecisionProvider. Its bootstrap profile/provider is explicitly configured: do not recursively ask the router to choose the model that chooses models forever.

The first decision classifies the request among authentication, billing, documentation and other. It returns authentication with bounded evidence. It is a recommendation under a contract, not a tool-permission change.

GuardSelectionService then sends a multi-selection/per-guard relevance request:

```text
Purpose: select-guards
Task evidence: authentication feature; TypeScript services/routes
Enabled candidates: oop-programming/v1, eslint/v1, database-schema/v1
Required set from trusted configuration: eslint/v1
System 1 recommendation: oop-programming relevant; eslint relevant;
                         database-schema not indicated by current evidence
```

GuardSelectionPolicy validates IDs, enabled/applicable candidates, response shape, finite confidence metadata where present, and mandatory configuration. The effective set is required ESLint plus accepted OOP relevance. Required/disabled conflicts are visible configuration errors rather than silently ignored settings.

If the provider abstains/fails, preserve required guards and apply configured conservative fallback/unresolved applicability. A failed call is never an implicit empty guard set. Another registered compatible provider can replace JEV through configuration; a new backend needs an adapter/registration, not rewritten guards/workflows. Confidence semantics are not assumed equal across services.

Decision calls consume shared budget and emit events showing provider recommendation separately from policy-applied outcome.

<a id="section-10"></a>

## 10. Selected guards contribute instructions and checkable rules

The selected OOP guard is a versioned package, not just a prompt:

```text
Skill: use cohesive classes, injected dependencies and composition;
       keep class-owned helpers private.
Rule oop.constructor-injection: external collaborators are injected.
Rule oop.private-helpers: class-owned helpers remain inside their class.
Rule oop.cohesion: one coherent responsibility per class.
Checks: registered structural analysis + model-assisted OOP review.
```

The ESLint guard describes configured lint expectations and invokes a trusted configured lint capability afterward. The model does not turn guard metadata into arbitrary shell commands or change lint settings merely to hide findings.

Planning and coding assignments receive the selected guidance before editing. Skill/rule versions and instruction-content references are recorded. Mandatory instructions cannot silently disappear to fit context; conflict or insufficient safe allocation is visible.

GuardRunner later invokes GuardCheck implementations polymorphically. GuardEnforcementPolicy evaluates actual coverage/findings under configured blocking rules. System 1 chooses relevance; it does not fabricate lint results or replace deeper architectural assessment.

Post-diff selection can add newly applicable guards. It cannot dismiss an already-obligatory failing guard merely because a model now calls it irrelevant. Changed guidance requiring corrections becomes an explicit bounded assignment.

<a id="section-11"></a>

## 11. Define a reusable workflow, with named steps

FeatureWorkflow uses WorkflowBuilder to build implement-feature/v1. The core loop is investigate → specify → implement → verify → review. A fix can revisit implementation under limits. Accepted work prepares a proposal, waits for approval and publishes; a target conflict leads to a bounded reconcile-target assignment, rechecks and a new proposal.

WorkflowDefinition and StepDefinition objects are immutable reusable configuration. WorkflowRun stores actual progress. The builder should infer prior result types and reject duplicate/invalid step dependencies; the engine also validates dependencies and accepted result revisions at runtime.

An illustrative step definition says:

```text
ID investigate
Title Investigate existing authentication
Input policy request.goal + request.workspace
Executor injected WorkspaceInvestigationExecutor
Output summary, sources, questions and report ArtifactRef
```

The step does not contain file-search logic. It identifies one use of a capability at a position in the process. Another step could use the same investigation executor to inspect billing with different input and identity. StepRun records one execution of that position; it is not the immutable StepDefinition.

A direct standalone unit or executor call needs no workflow wrapper. Steps are useful when the host needs a managed plan, explicit dependencies, recorded outcomes and transitions.

<a id="section-12"></a>

## 12. Keep the run, step, session and publication lifecycles separate

At this point run-101 is active and investigate is selected. The engine creates sr-investigate-1, pending → active, and starts its attempt. No publication exists yet.

```text
WorkflowDefinition: immutable implement-feature/v1
WorkflowRun: active, currentStepRun=sr-investigate-1
StepRun: active, attempt=attempt-investigate-1
AgenticSession: created only when the executor starts the unit
Publication: none
```

The graph answers which assignment can come next. Domain lifecycle rules answer whether each execution can legally start, accept a result, pause, recover or complete. WorkflowEngine coordinates; it does not become one giant switch implementing every status/provider/tool.

Use small state/policy implementations when statuses select genuinely different behavior. Declarative allowed-transition tables and invariant guards suffice for simple validation. Do not create empty classes for every label merely to appear OOP.

Model text and UI checkmarks cannot assign status. Public domain methods validate ownership, version, pending commands and completion evidence. Repositories enforce concurrency/version rules but do not invent transitions.

<a id="section-13"></a>

## 13. Three contexts, one explicit input policy

The original request is not automatically the complete executor input. The engine prepares a readonly context view, and StepRunner uses the step's input policy to select data.

```typescript
interface FeatureRequest {
  readonly goal: string;
  readonly workspace: string;
}
interface InvestigationInput {
  readonly goal: string;
  readonly workspace: string;
}
interface InvestigationContext {
  readonly request: FeatureRequest;
}

const mapInvestigationInput = (
  context: InvestigationContext,
): InvestigationInput => ({
  goal: context.request.goal,
  workspace: context.request.workspace,
});
```

ExecutionContext is passed separately. It supplies readonly runId/stepId, cancellation signal, progress(), scoped debug recorder and authorized artifact capability. Readonly prevents reference reassignment during TypeScript checking; it does not make writable collaborators read-only at runtime.

Model context is a third thing: the bounded input actually sent in one model call. AgentContextComposer selects assignment, instructions, notes, observations and relevant retrieved memory. It does not copy the entire workflow/database into a prompt.

```text
Workflow context → input policy → executor input
ExecutionContext → scoped identity and live capabilities
Model context → selected bounded input for one LLM call
```

StepRunner executes the selected assignment and applies execution policies. It does not select the overall graph position, bypass persistence, or pass an unrestricted writable WorkflowRun to the executor.

<a id="section-14"></a>

## 14. Retrieve memory without confusing it with execution state

Composition supplies a scoped AgentMemory view for developer-agent/project shop/session-investigate-1. It can retrieve:

| Category | Retrieved example | Treatment |
| --- | --- | --- |
| Semantic | At an earlier revision, the project used session cookies. | Check current source before relying on it. |
| Episodic | A prior fixture task encountered callback URL mismatch. | Useful experience, not proof this task has the same issue. |
| Procedural | Authentication verification checklist. | Advisory method under current assignment/permissions. |
| Working | Current session notebook. | Isolated task-local state, not another session's mutable notes. |

Retrieval applies trusted access, expiry, status and relevance filters with query/top-k/byte/token bounds. Contradictions and missing evidence stay visible. Vector search is optional; deterministic keyword/metadata retrieval can implement the first standalone version. The durable store, not the index, is authoritative.

Execution state answers what is happening now: active StepRun, pending tool, accepted result version, current budget, exact approval. Reusable knowledge answers what may help future tasks. Both can be durable, but memory retrieval cannot replace an operation journal or authorize publication.

WorkingMemory adapts the session's DraftNotebook rather than storing a competing copy. AgentMemory does not own run statuses or model protocol. A saved notebook is still task memory, not automatically confirmed long-term facts.

<a id="section-15"></a>

## 15. Select an investigation model through hierarchical routing

ModelRouter resolves agent defaults, workflow preferences, step requirements and the actual executor assignment. It filters registered profiles for tool support, context/output capacity, allowed scope, budget and deadline before invoking a selection policy.

For investigation, economical-investigator is the only eligible configured candidate, so the router can skip a System 1 recommendation. For a less obvious choice it can ask DecisionUnit to choose from eligible profiles under a bounded contract.

More-specific preferences can override defaults; mandatory capabilities, parent caps and allowlists cannot be weakened by task hints. A contradictory explicit binding produces a visible routing outcome, not a quiet downgrade.

ModelGatewayFactory supplies the selected adapter to this session's runner. Shared services do not mutate a global selectedModel field. The selected concrete identity, alias, routing-context version and reason are saved in session metadata/checkpoints.

A separately routed summary operation can use another eligible model without changing the investigation session's main gateway. Its input/output and usage remain bounded, it cannot rewrite notebook state directly, and its derived artifact retains provenance. Selection scope is not permission for silent mid-session provider changes.

<a id="section-16"></a>

## 16. Start AgenticMindUnit with an immutable assignment

WorkspaceInvestigationExecutor configures a reusable AgenticMindUnit definition:

```text
Name investigate-authentication
Goal explain current login flow and relevant extension points
Constraints no workspace edits; use only permitted evidence/tools
Completion findings with source references and explicit unresolved questions
Tools searchFiles, readFile, recordFinding, setNextActions
Limits inherited run budget plus session-specific upper bounds
Result contract bounded summary, sources, questions, detailed report text
```

AgenticMindUnit is the public capability. AgenticMindUnitRunner implements the coordination loop. AgenticSession session-investigate-1 owns this invocation's mutable notebook/protocol/counters/pending operations.

The assignment stays authoritative as the notebook evolves. The agent cannot edit its notes to grant write tools or extend its deadline. ToolRegistry exposes only configured objects; ToolDispatcher enforces the same allowlist and validates arguments at invocation.

The session becomes created → active. Its phase moves among composing input, awaiting model, processing response, invoking tools, recording observations, notebook update and output validation. These phases are not parent run statuses.

<a id="section-17"></a>

## 17. Observe the inner loop, a read failure and notebook updates

The first model call requests searchFiles for authentication routes. The registered tool reports a temporary unavailable error before producing search results. The bounded read-retry policy records a reason and retries the read once under the remaining time/call allowance. It does not rerun the entire workflow or pretend the read succeeded.

The successful observation returns bounded paths. A subsequent call requests readFile for auth/login.ts. The notebook capability records:

```text
Assignment reference investigate-authentication/v1
Finding current inspected login route creates a session cookie
Evidence auth/login.ts at source code-r0
Open question where callback configuration is assembled
Next action inspect auth/config.ts
```

More calls gather sources and resolve the question. Notebook updates are structured task summaries/evidence, not private reasoning transcripts. Tool observations are data, not instructions that override framework permissions.

Each dispatched underlying model/tool operation has its own identity, start/outcome events, limits and cancellation behavior. Model actions are handled through registered handlers for tool/final-output behavior instead of an ever-growing action-kind switch.

The model proposes a final result. Runtime ResultContract validation and CompletionPolicy check required shape/evidence. Invalid output can receive bounded correction feedback; reaching limits returns an honest stopped outcome instead of fabricated success. Schema validity is not a guarantee of factual correctness, which is why evidence and later checks remain important.

<a id="section-18"></a>

## 18. Save the investigation report and return a typed result

The unit completes with validated findings. The executor maps them into a small typed output and saves the detailed material through ArtifactStore. The following is a method-body sketch inside the configured executor; findings comes from its injected investigation/unit capability, and context is its scoped ExecutionContext.

```typescript
const report = await context.artifacts.write(
  {
    name: "authentication-investigation.md",
    kind: "investigation-report",
    mediaType: "text/markdown",
    data: new TextEncoder().encode(findings.reportText),
    idempotencyKey: "investigation-report/main",
  },
  { signal: context.signal },
);

return {
  summary: findings.summary,
  sources: findings.sources,
  openQuestions: findings.openQuestions,
  report,
};
```

The store commits bounded bytes and metadata and returns ArtifactRef A-investigate-1 with computed digest/size/media type. It derives trusted producer/project/run/attempt provenance rather than accepting arbitrary caller ownership claims. Display names are not raw filesystem paths.

Idempotency keys are namespaced by the stable producer operation. Same operation/key and same content returns the existing reference; different content conflicts. New executions create distinct artifacts rather than overwriting ready material.

The executor returns a TypeScript value, not necessarily a JSON string. Durable workflows use serializable/versioned result contracts and references; functions, live clients and streams are not saved as ordinary step results. Raw model response text is normalized/validated before becoming the declared executor output.

<a id="section-19"></a>

## 19. Accept the result and prepare the next context

Three boundaries occur in order, with explicit recovery for gaps:

```text
Artifact A-investigate-1 ready
  → executor returns {summary, sources, questions, report reference}
  → coordinator accepts/persists the StepRun result through domain objects
  → next dependency can use the accepted result revision
```

RunRepository records run-101/sr-investigate-1/result-r1 and the ArtifactRef; the detailed bytes remain in ArtifactStore. This is a logical ownership contract, not a prescribed database table. Initial artifact leases/pins protect the material during the artifact-ready/parent-persistence gap.

If the artifact committed but the parent result write failed, reconcile the saved operation/outcome once rather than rerunning tools. Session completed and step result durably accepted are separate facts.

For specification, the engine constructs:

```typescript
const specificationContext = {
  request: savedRequest,
  results: { investigate: acceptedInvestigationResult },
};

const specificationInput = {
  goal: specificationContext.request.goal,
  summary: specificationContext.results.investigate.summary,
  sources: specificationContext.results.investigate.sources,
  report: specificationContext.results.investigate.report,
};
```

This illustrates the step's input policy; variables are engine-restored request/result values, not global mutable shared state. Context interfaces describe data shapes and do not fetch previous results themselves.

The state becomes: investigation session completed; sr-investigate-1 completed after its persistence boundary; run-101 still active; sr-specify-1 pending → active. Immutable definitions remain unchanged.

<a id="section-20"></a>

## 20. The planning step reads the report and produces the contract

Task-aware routing selects strong-planner because the specification must resolve authentication design assumptions and produce precise tasks. Decision assistance can recommend this among eligible profiles; deterministic routing policy validates and reserves the actual call capacity.

The specification executor reads the permitted upstream report:

```typescript
const document = await context.artifacts.read(input.report, {
  maxBytes: 128 * 1024,
  signal: context.signal,
});
if (document.ref.mediaType !== "text/markdown") {
  throw new Error("Expected investigation Markdown");
}
const reportText = new TextDecoder("utf-8", { fatal: true })
  .decode(document.data);
```

This is explanatory method-body code; real implementation normalizes typed errors. Size is illustrative. The store verifies scope/readiness/size/integrity; consumer validates expected format. A too-large full read needs an explicit bounded excerpt/summary path rather than silent truncation. Readonly context.artifacts does not grant write authority to every consumer: read-only helpers can receive ArtifactReader.

The planning session receives bounded report evidence, current source references, selected guard skills and acceptance criteria. It returns a validated structured contract:

```text
Preserve existing login behavior.
Add fixture Google-login entry/callback integration using agreed interfaces.
Use injected configuration/session capabilities.
Include normal/misconfiguration/error behavior in checks.
List expected files, dependencies, constraints and unresolved assumptions.
Verify callback configuration and existing-login regression behavior.
```

The plan cannot invent credentials, claim external setup was completed, or enlarge tools. A source contradiction remains an explicit assumption/issue. A long specification document can be A-specify-1 while small tasks/criteria stay directly in the typed step result.

Planning session completes, sr-specify-1 result is accepted and saved, and run-101 stays active as implementation begins.

<a id="section-21"></a>

## 21. Economical coding uses a bounded handoff in a new session

The coding step receives the saved specification, authorized workspace handle, relevant investigation references and selected guidance. It does not inherit the planner's writable notebook or full conversation.

Hierarchical routing resolves coding defaults plus this specific task's requirements. System 1 can choose economical-coder from a filtered pair of economical-coder/strong-coder because evidence shows an established pattern and bounded changes. That recommendation is recorded separately from the policy's final selected profile and budget reservation.

WorkspaceEditingExecutor starts session-code-1. It gets explicit read/write/check capabilities inside workspace-101 and no trusted publication capability. The active session's gateway remains fixed.

The session creates fixture route/configuration changes and test changes. It records operation IDs before side effects. Large diffs/change reports become immutable artifacts A-diff-1 and related outputs; the small result contains changed-file references, source fingerprint code-r1, summary and unresolved issues.

Session-code-1 completes and sr-implement-1 completes only when its mapped result is accepted/persisted. The original remains untouched. A model assertion that checks passed is not the next verification step's evidence.

<a id="section-22"></a>

## 22. Verification saves actual failures and review consumes them

VerificationExecutor invokes configured capabilities directly, with process timeout, allowed command/check scope, bounded output and cancellation. It obtains actual fixture check outcomes rather than asking an LLM whether tests probably pass.

The first callback check fails because the fixture callback URL is assembled incorrectly; the existing-login regression check passes. The executor saves a schema-versioned report:

```typescript
const report = await context.artifacts.write(
  {
    name: "google-login-checks.json",
    kind: "verification-report",
    mediaType: "application/json",
    schemaId: "verification-report",
    schemaVersion: 1,
    data: new TextEncoder().encode(JSON.stringify(checkReport)),
    idempotencyKey: "verification-report/main",
  },
  { signal: context.signal },
);
return { passed: checkReport.passed, summary: checkReport.summary, report };
```

The injected capability supplies bounded/sanitized checkReport; output limits apply before unlimited allocation. Artifact A-verify-1 checks code-r1. sr-verify-1 is completed with passed=false. A negative check result is different from failed execution because a process could not start or required evidence was unavailable.

The review input policy selects specification, implementation and verification.report references. The reviewer reads the authorized report, checks media/schema identity/version, parses bytes as unknown, and validates with an injected runtime contract. JSON.parse(text) as SomeType is not runtime validation.

Review returns fix-required with the failed criterion/evidence. sr-review-1 completes with that business outcome; run-101 remains active. No proposal is accepted as ready while blocking requirements remain unresolved.

<a id="section-23"></a>

## 23. The first fix fails and routing escalates with evidence

TransitionPolicy selects a bounded implementation correction. It creates sr-implement-2/session-code-2 with the exact diagnostic, source context, relevant skill rules and expected result. It does not reopen completed sr-implement-1 or overwrite its output.

This economical fix still fails the same fixture criterion. New verification sr-verify-2 saves A-verify-2 for code-r2; the old A-verify-1 remains unchanged. Review selects another permitted fix. Repeated equivalent failure fingerprints justify the configured escalation threshold.

EscalationPolicy requests stronger diagnosis/correction. ModelRouter filters candidates and can use System 1 to recommend strong-recovery, under remaining budget. The ModelHandoff includes:

```text
Original assignment and specification version
Current workspace/source code-r2 and diff references
Failed criteria plus A-verify-1/A-verify-2 evidence
Concise notebook summary and unresolved questions
Completed/pending/uncertain tool identities
Usage, deadline and decision/session lineage
```

sr-implement-3/session-code-3 starts with the stronger gateway. The model switch is explicit and creates isolated protocol state, not a hidden change to session-code-2. A completed old coding session later rejected by checks stays completed; it is not retroactively marked as a provider failure.

Workflow fixes, step technical attempts, model transport retries, output-validation corrections and session iterations are distinct counters. The underlying actual calls all consume the same ledger. SDK retry behavior must be disabled or coordinated/accounted for to avoid invisible retry multiplication.

<a id="section-24"></a>

## 24. The stronger coding session is interrupted and safely resumed

During session-code-3, a file write W-31 reaches the isolated workspace but the process crashes before recording the outcome. The last durable run/step/session status can still be active. A crash does not atomically write interrupted into every object.

Recovery checks worker ownership/versions and durable checkpoints. It records run-101 recovering, sr-implement-3 interrupted, and session-code-3 interrupted/recovering under valid domain commands. The checkpoint includes assignment/model versions, notebook revision, bounded conversation/tool-call pairing, counters/usage references, completed operations and pending W-31.

The recovery policy inspects workspace fingerprints or the tool's idempotency contract. It confirms W-31 already applied and records its matching observation instead of appending the same edit again. If it could not establish the effect, it would preserve uncertainty and stop/request reconciliation rather than invent success.

Recreate signals, scoped recorders and injected services; do not serialize live clients. Restore the same session only when protocol/version/model compatibility is validated. Otherwise use an explicit linked handoff and preserve the old outcome. Budget/deadline/unknown usage are reconciled against the current ledger, not overwritten from an old larger checkpoint balance.

The valid resume path is recovering → active for the run/session and interrupted → active for the step with documented attempt identity. The correction completes and new actual checks pass on code-r3. Durably saved earlier investigation/planning are not automatically rerun.

<a id="section-25"></a>

## 25. OOP and ESLint guards check the resulting artifact

Post-diff System 1 selection confirms OOP and ESLint relevance and can add any newly applicable configured guard. Effective guard versions and source code-r3 are frozen for this check pass.

GuardRunner resolves registered implementations such as EslintCheck, OopStructureCheck and ModelAssistedOopReview through GuardCheck. Actual lint passes, but the OOP review finds a module-level helper used only by one class and tied to its configuration.

```text
Guard oop-programming/v1
Rule oop.private-helpers
Outcome failed
Evidence checked file/location/source fingerprint
Correction move the class-owned helper into a private method
Coverage inspected changed classes; limitations recorded
```

Model-assisted review is an evidence-backed assessment, not proof that every architectural violation was detected. Required outcomes distinguish passed, failed, not-applicable with justification, and unable-to-evaluate. Missing lint/configuration/model capability cannot count as passed. Configured severity cannot be downgraded by generated report text.

Guard reports A-guard-oop-3 and A-guard-eslint-3 feed enforcement. Review requests a third bounded correction. sr-implement-4/session-code-4 performs it in the working copy. Verification and guards rerun on code-r4 and produce new report artifacts, not mutated previous reports. sr-review-4 accepts the matching result set.

Auto-fix, if configured, is an explicit edit with side-effect identity and fresh validation afterward; default lint/review is not secretly allowed to modify source.

<a id="section-26"></a>

## 26. Track every result and artifact without confusing the stores

At the accepted implementation snapshot, the stores have different jobs:

| Record | Where it lives | What later work uses |
| --- | --- | --- |
| Accepted small investigation output | RunRepository / StepRun result | Summary, sources, A-investigate-1 reference. |
| Detailed investigation report | ArtifactStore | Exact report bytes, digest and trusted metadata. |
| Current specification | Accepted specify result plus optional A-specify-1 | Tasks/criteria and detailed document reference. |
| Earlier failed verification | A-verify-1/A-verify-2 plus prior StepRun results | Historical evidence; not proof of code-r4. |
| Latest checks and guard reports | Current result/report records plus A-verify-4/A-guard-*-4 | Accepted current evidence tied to code-r4. |
| Session working notes and protocol | Session/checkpoint stores | Safe resume and bounded handoff. |
| Budget known/reserved/unknown usage | UsageLedger | Actual current remaining allowance. |
| Past facts/procedures | Scoped memory store | Evidence for current/future investigation. |
| Event timeline | DebugEventStore | Explanation, not authority for replaying effects. |

A ready artifact is immutable while retained, but not automatically permanent. Pins/retention protect active checkpoints and proposals. Metadata/blob commits, staging cleanup and idempotency need explicit adapter guarantees. Do not expose a staged object as ready or return a successful reference before required durability.

Reading checks authorized scope, readiness, full-read bound and integrity. Consumers validate the expected media/schema and decoded content. Returned buffers must not let callers mutate stored bytes. A digest proves byte identity, not truth of a model claim.

Required references cannot silently expire while approval/recovery depends on them. Authorized deletion/correction has explicit pin/conflict/derived-index handling. A known artifact ID or signed-looking model text is not access permission or approval.

<a id="section-27"></a>

## 27. A real budget ledger and what approaching exhaustion means

The run's accounting includes classification, guard selection, model routing assistance, investigation/planning/coding/review calls, optional summarization, provider retries and memory-proposal extraction. Categorizing one call as both coding and fix must not double-charge it.

For one illustrative output-token snapshot:

```text
Configured run output cap:          40,000
Known usage:                       31,000
Outstanding/pending reservations:    1,000
Available for new reservations:      8,000
Requested next call cap:             2,000 → can reserve if all other limits permit
```

Reservation is atomic across relevant scopes or rolls back undispatched partial reservations. Settle replaces reserved capacity with actual usage, not permanently adds both. A timeout keeps unknown/pending usage until reconciliation. Never clip unexpectedly higher provider usage to the cap; record the breach and prevent new work.

Soft warnings can encourage bounded summaries or planning a safe stop. They cannot authorize hard-cap overrun. Rate-limiter waiting/backoff counts against elapsed deadlines. Leases can release abandoned concurrency capacity, but lease expiry does not prove a remote charged request stopped.

The main story has enough allowance to finish. If required checks/publication cannot fit the remaining constraints, return a truthful stopped/unresolved outcome with saved progress. A cheaper model cannot be selected if it lacks mandatory capabilities merely to avoid stopping.

Bounded housekeeping capacity records terminal state, minimum recovery data and lease release; it cannot fund another hidden coding session. A trusted authorized limit change is versioned, with history retained. Models cannot top up their own balances.

<a id="section-28"></a>

## 28. Freeze a review bundle with exact proposed file bytes

With code-r4 accepted, ChangeSetBuilder compares workspace-101 to baseline-101 and creates proposal-101/v1. Managed inclusions determine the delta; excluded caches or absent secrets do not become deletes.

```text
Proposal proposal-101/v1
Target original shop workspace
Baseline baseline-101

Modify auth/login.ts          before fingerprint B1, afterContent A-source-41
Add auth/googleCallback.ts    expected absent, afterContent A-source-42
Add tests/auth/google.test.ts expected absent, afterContent A-source-43
Delete none in this fixture

Evidence source code-r4
  specification result + report reference
  A-verify-4, current OOP/ESLint reports
```

Artifact references carry exact digests/content and are pinned for review/recovery. The proposal digest binds operation kinds/paths, target/baseline, before/after fingerprints and the applicable reviewed content/evidence contract. The display label latest-diff is not an immutable approval identity.

ChangeSet operations support add, modify, explicit delete and rename (or visible linked add/delete) when the provider supports them. Binary bytes, modes and file types have explicit semantics. A symlink is not dereferenced and overwritten as if it were an ordinary source file. Unsupported operations are visible.

Only changed approved paths are candidates. Do not copy an entire clone over the original, delete everything absent, overwrite Git metadata, or remove unrelated user files. Existing user README work remains preserved.

<a id="section-29"></a>

## 29. Ask the user to approve the concrete proposal

WorkspaceReviewService presents the actual diff, affected paths, verification outcomes, guard coverage, unresolved issues and exact proposal target/version. This is reviewable work already performed, not a request for permission to start investigating.

```text
Run run-101: active → waiting_for_approval
Publication pub-101-v1: prepared → awaiting_approval
Coding/check StepRuns: remain completed
Agentic sessions: remain completed
Original files: not yet updated by publication
```

PublicationApprovalStore records the trusted user's decision. Its identity/scope is verified at the host boundary; the model cannot create trustworthy approval by filling an approved=true object or asking JEV to select yes.

The user approves proposal-101/v1 for the original shop target. Publication becomes approved, not published. Run can remain waiting until the coordinator schedules the publication operation, then active for preflight/application. Approval is for exact content/scope, not all future edits.

This meaning of publish is local approved file application. It does not authorize remote push, pull-request merge, deployment, or external messaging. Those require their own explicit capabilities and authorization scope.

<a id="section-30"></a>

## 30. The original changed: conflict and a new approval

Before preflight, the user edits auth/login.ts in the original. The publisher sees a different current fingerprint than proposal-101/v1 expects.

```text
Baseline target bytes B1
Approved proposed bytes P1
Current original bytes U1
U1 differs from B1 → conflict, not permission to replace U1
```

pub-101-v1 becomes conflicted; run-101 remains non-completed, using recovering while coordinating resolution. It does not apply a conflict-free-looking subset silently, report published, or erase user changes.

The workflow creates bounded sr-reconcile-target-1 with an explicit source/current/proposal handoff. A candidate three-way merge preserves U1 and the intended feature in a new isolated snapshot. It is a new reviewed result, not an automatic extension of the old approval. The fourth permitted correction budget and separate conflict-policy bounds still consume the same run ledger; no nested unlimited loop appears.

Reconciliation checks source/required dependencies, reruns affected verification/guards/review and stores new artifacts A-verify-5 and related reports. A changed target configuration can invalidate validation even if its paths were not in the original patch.

ChangeSetBuilder produces proposal-101/v2 against the validated new target baseline/context. pub-101-v1 remains historical. pub-101-v2 is prepared/awaiting_approval; the run returns to waiting_for_approval. The user approves v2 after inspecting its new diff/evidence. Approval for v1 does not cover v2.

<a id="section-31"></a>

## 31. Apply only approved changes and survive interrupted publication

WorkspacePublisher resolves the stored trusted v2 approval, validates digest/target/scope/expiry, confirms required reports and current target fingerprints, and acquires publication coordination under provider guarantees.

A framework lock coordinates cooperating writers only. External editors may ignore it. The adapter must use actual exclusive/conditional-write guarantees or detect/reject drift; it cannot promise race-free replacement merely because it once checked a hash.

PublicationJournal records intended path operations, before-state references, exact approved after-content, stable operation IDs and recovery information before effects. The publisher reads permitted immutable A-source-* artifacts, verifies digests/limits and stages application.

During this fixture, operation P-1 applies the approved login-file change. The process crashes before all remaining operations finish. State is not published or cancelled with “nothing changed.” Recovery records partial/uncertain → reconciling and inspects journal plus actual target bytes.

It confirms P-1's approved after-state and records that outcome once. Remaining paths still match their expected preconditions, so authorized idempotent continuation applies them under the same immutable proposal/approval and valid limits. If a user edit appeared in an affected path, reconciliation would stop instead of overwriting it.

Per-file atomic rename does not make multi-file application atomic. A directory adapter states partial-effect behavior honestly; a genuinely transactional/snapshot-swap provider may offer stronger semantics only where implemented. Rollback, if selected, restores before-state only when current bytes still match the publisher's recorded after-state, never over new user edits.

After all approved operations are verified and receipt-101-v2 is durably saved, pub-101-v2 becomes published. The engine accepts the receipt and checks all completion invariants before run-101 becomes completed. Duplicate publish requests find the journal/receipt rather than repeat the full proposal blindly.

<a id="section-32"></a>

## 32. The complete coordinated state timeline

| Moment | WorkflowRun | StepRun(s) | AgenticSession(s) | Publication |
| --- | --- | --- | --- | --- |
| Admission. | created → queued → active. | None active yet. | None. | None. |
| Investigation. | active. | sr-investigate-1 active. | Investigation active / model-tool phases. | None. |
| Investigation accepted. | active. | Investigation completed; specification starts. | Investigation completed; separate planning session starts. | None. |
| First coding output. | active. | sr-implement-1 completed after result persistence. | session-code-1 completed. | None. |
| Failed checks/review. | active. | Verification/review completed with negative business results. | Review session completed. | None. |
| Fix and escalation. | active. | New sr-implement-2/3; previous results immutable. | New sessions, explicitly selected model/handoff. | None. |
| Edit crash. | last durable active, then recovering after detection. | Current step interrupted/reconciled. | Session interrupted/recovering; pending operation retained. | None. |
| Valid resume and OOP correction. | active. | sr-implement-3 completes; sr-implement-4 and fresh checks complete. | Same validated resume, then a new fix session. | None. |
| First review proposal. | waiting_for_approval. | Required coding steps remain completed. | Completed history. | pub-101-v1 awaiting_approval. |
| v1 approval then conflict. | active for preflight → recovering. | Reconciliation work not yet accepted. | No session can waive conflict. | pub-101-v1 approved → conflicted. |
| New merged proposal. | active for reconciliation → waiting_for_approval. | sr-reconcile-target-1 and fresh checks accepted. | New scoped reconciliation session. | pub-101-v2 awaiting_approval. |
| v2 approved and applying. | active for publication. | Publication coordinator tracks operation identity. | Coding sessions unchanged. | approved → preflight → applying. |
| Publication crash/reconcile. | recovering until actual effects known. | Journal/outcome references retained. | No blind tool replay. | partial/uncertain → reconciling. |
| Confirmed receipt. | completed after domain/durability checks. | Required accepted history retained. | Immutable completed outcomes. | published with receipt-101-v2. |

WorkflowDefinition remains immutable throughout. A StepRun cannot be made completed merely because its session returned; parent outcome acceptance/persistence is a separate boundary. A verification step can complete with passed=false. Approval is distinct from application. These differences are the purpose of separate state machines.

Domain commands validate allowed changes. Simple tables and invariants can validate transitions; state classes/policies own genuinely different behavior. No UI/log subscriber or model invents authoritative lifecycle transitions.

<a id="section-33"></a>

## 33. What the agent stores during the task versus afterward

During the main task, exact execution state includes request/definition/version, current step/result selection, session protocol/notebook, operation uncertainty, workspace/baseline, selected model and routing lineage, guard/report versions, budget reservations/deadline, proposal/approval/journal/receipt.

Keep those records with their owners. A snapshot containing references is useful for inspection, but a second writable catch-all memory copy would create conflicting truth. On restart, reconcile execution state rather than asking a model to remember what it thinks occurred.

After confirmed publication, the coordinator can record an episodic task outcome with run/report/receipt references. It may propose:

```text
Semantic candidate: project used session cookies at checked revision R5.
Procedural candidate: include callback-configuration verification for relevant auth changes.
Evidence: actual failed checks, correction, passing checks and inspected sources.
```

Promotion is explicit: candidate → evidence/validation policy → confirmed, rejected, or unresolved. DecisionUnit can flag a potentially valuable observation but cannot turn it into a verified fact. A stronger model's confidence alone is not confirmation.

User-stated preferences can be scoped/provenance-bearing knowledge where the existing contract fits; inferred preferences must not become mandatory instructions. Task-specific approvals and permissions are never generic memory preferences transferable to another task.

Optional memory-write failure is reported/retried independently and does not retroactively unpublish the code or falsify the completed run. Do not store every draft observation, private reasoning trace, credential or raw log as long-term memory.

<a id="section-34"></a>

## 34. A later task benefits without inheriting old execution state

Later the user requests password reset. This is a short follow-on demonstrating the same agent's continuity, not another full workflow to replace the Google-login story.

The framework creates run-102 and a fresh workspace/session set. It can reuse implement-feature/v1 and the same executor capabilities. Scoped memory retrieval may select the episode, supported cookie fact and authentication-check procedure from run-101.

The new unit checks source freshness. If authentication changed, it marks/conflicts/corrects the old fact with evidence rather than blindly following it. Retrieved text is evidence, not authority over the new assignment or tools.

It does not inherit run-101's active state, old pending operation IDs, v2 publication approval, token balance or writable notebook. Those belonged to that execution. Bounded model context contains selected useful memory plus current request/source evidence, not an entire past conversation.

Memory entries have explicit provenance, versions/status, scope, verification/freshness times and applicable expiry. Episodes distinguish confirmed success from failure/interruption. Procedures are advisory methods, not automatically installed executable code or tool permissions.

<a id="section-35"></a>

## 35. One debug timeline explains every important decision

ScopedDebugRecorder attaches run, workflow/version, StepRun, attempt, session, decision, model/tool-operation and span/causation identities as applicable. Event schemas are typed/versioned; the store adds recorded time and per-run append sequence.

A readable projection of this story could show:

```text
run-101 admitted                 limits/policy versions and scope
workspace.created                baseline-101 → workspace-101
decision.policy.applied          classification=authentication
GuardSelection applied           provider=JEV, OOP+ESLint, required ESLint preserved
model.routing.selected           economical investigation, eligibility reason
operation.failed                 temporary file-search failure
retry.scheduled                  bounded safe-read retry and remaining allowance
artifact.ready                   A-investigate-1, digest/size
result.persisted                 sr-investigate-1 output reference
model.routing.selected           strong-planner
artifact.read.completed          planning reads A-investigate-1
verification.result              code-r1 failed, A-verify-1
verification.result              code-r2 failed, A-verify-2
model.escalation.decided          repeated equivalent evidence → strong recovery
recovery.decided                 W-31 already applied, restore protocol once
guard.enforcement.decided        OOP helper finding → bounded correction
verification.result              code-r4 accepted evidence
publication.review.ready         proposal-101/v1
approval.recorded                trusted exact-v1 approval
publication.conflict             original login file changed
publication.review.ready         proposal-101/v2 with fresh evidence
approval.recorded                trusted exact-v2 approval
publication.recovery             P-1 confirmed, remaining operations reconciled
publication.completed            receipt-101-v2
run.completed                    matching criteria and durable receipt
memory.validation.decided        supported candidate accepted/unresolved
```

One example stored routing event makes the correlation concrete:

```json
{
  "schemaVersion": 1,
  "eventId": "evt-routing-23",
  "type": "model.routing.selected",
  "occurredAt": "2026-10-17T08:00:00Z",
  "runId": "run-101",
  "workflowId": "implement-feature",
  "workflowVersion": "1",
  "producer": "ModelRouter",
  "level": "info",
  "traceId": "trace-101",
  "spanId": "span-route-recovery-1",
  "parentSpanId": "span-step-implement-3",
  "causationEventId": "evt-escalation-1",
  "stepId": "implement",
  "stepRunId": "sr-implement-3",
  "attemptId": "attempt-implement-3-1",
  "attemptNumber": 1,
  "payload": {
    "profileId": "strong-recovery",
    "decisionId": "decision-route-3",
    "policyVersion": "routing-policy/v1",
    "reason": "Two recorded equivalent verification failures",
    "evidenceRefs": ["A-verify-1", "A-verify-2"],
    "previousSessionId": "session-code-2"
  }
}
```

The timestamp and IDs are invented example data. The routing event precedes the new session, so session creation records its own new identity and causal link rather than attaching an already-active fictional session. Store-assigned recorded time/sequence is separate from this producer envelope.

Names are illustrative and must become validated event contracts. They capture policy reasons and evidence, not private reasoning. Model/provider actual identity, usage and unavailable metadata are explicit. Memory selection events link entry IDs to the model call they informed. Guard selection records recommendation versus applied set, and publications record intent versus actual confirmed effects.

Append sequence is storage order, not proof of cross-process causality. Use correlation/causation and operation identities. UTC timestamps aid inspection; process-local monotonic clocks measure elapsed durations, not cross-process elapsed time by subtraction.

<a id="section-36"></a>

## 36. Debug delivery, artifact retention and resource growth remain bounded

Required lifecycle/state-event durability uses an atomic boundary/outbox or equivalent guarantee; live subscribers can receive at-least-once delivery and deduplicate by event ID. A disconnected viewer does not corrupt task results.

Bound verbose payloads, event rates, subscriber queues and exports. Drops/truncation are visible. Required lifecycle records cannot silently disappear under pressure. A required store failure prevents reporting corresponding durable completion; an optional verbose sink failure is reported independently and must not replace the original task error or recursively log to itself.

Artifacts, checkpoints, notebooks, memory proposals/queries and retained histories each have their own size/count/time/retention controls. Summarization/compaction also consumes calls/usage; it is not a free emergency context expansion. Preserve authoritative assignment, unresolved work and side-effect uncertainty when compacting.

The approval proposal pins exact content/evidence while needed. Retention policy eventually releases obsolete producer leases/pins and bounded temporary material; it cannot delete necessary pending recovery evidence unnoticed. Authorized deletion includes metadata, bytes, derived indexes/links and tombstone behavior where applicable, with documented backup limitations.

Saving different versions does not imply retaining everything forever. If evidence expires or must be corrected/deleted, show unavailable/superseded status and invalidate affected claims/proposals under policy. Do not substitute new bytes under an old immutable approval.

<a id="section-37"></a>

## 37. Failure branches that stop the story instead of fabricating success

The main path above eventually completes. The same contracts define honest alternative outcomes:

| Condition | Correct behavior |
| --- | --- |
| No eligible model or exhausted allowance. | Explicit stopped/routing outcome with saved work; do not select an incompatible profile. |
| System 1 unavailable/invalid/abstains. | Required constraints preserved, purpose-specific fallback or unresolved state. |
| Required guard cannot run. | Unable-to-evaluate, never a fabricated passing report. |
| Invalid final output. | Bounded validation correction or typed stop/failure. |
| Required artifact/state write fails. | Visible durability/evidence failure with reconciliation identity, not invented success. |
| User rejects publication. | Original untouched by unpublished operations; record rejected/unpublished parent outcome. |
| Proposal changes after approval. | New proposal/checks/approval; old approval is not reused. |
| Cancellation during an external edit/publish. | Stop new work when possible, preserve/reconcile partial/unknown effects before terminal claims. |
| Missing/corrupt checkpoint/protocol. | Honest inability to resume or explicit safe handoff; no blind replay. |
| Optional memory/event delivery fails after success. | Track/retry independently without rewriting confirmed task/publication history. |

Cancellation is cooperative. A timeout or worker lease expiry does not guarantee an external tool/process/request stopped. Bounded housekeeping saves minimum recovery/terminal records without funding more task work. A deliberate continuation or authorized limit increase is a versioned operation, not silent resurrection of terminal state.

For ordinary filesystem publication, explicitly report partial/uncertain effects. For working-memory or context pressure, do not drop unresolved operations just to claim a small checkpoint. For conflict, do not make the model's confidence a substitute for user approval or target-state checks.

<a id="section-38"></a>

## 38. Concurrency, idempotency and durable coordination

Even a sequential first-version workflow runs in an asynchronous environment. A worker can crash, an approval can be delivered twice, or another run can consume a shared quota.

Use versioned aggregates and compare-and-set/equivalent concurrency control so two workers cannot independently advance the same run. Stable command/outcome/operation IDs deduplicate child completion, artifact writes, memory proposals, approval and publication.

Across stores/aggregates, save pending coordination durably, dispatch under stable identity, accept outcomes once, and recover gaps. Do not hold database transactions around model/tool calls or waiting for the user. Outbox/durable coordination is an implementation pattern, not a claim that all external effects can be atomically rolled back.

A stale checkpoint must not overwrite a newer usage ledger or accepted result revision. A stale worker/approval must not overwrite a new proposal. A namespace/guard check must happen at the actual storage/tool boundary, not only in the prompt.

Concurrent sessions share algorithm implementations but not mutable notebook/model state. Shared durable memory uses version/conflict policies. Shared quotas need a real shared adapter; local fakes must accurately state their narrower scope.

<a id="section-39"></a>

## 39. What the user sees and what can be inspected

The user need not see every internal type in the normal progress projection:

```text
Add Google login
✓ Investigate current authentication
✓ Prepare specification
✓ Implement and correct changes
✓ Run verification and engineering guards
✓ Review evidence
✓ Approve final proposal v2
✓ Apply approved files and confirm receipt

Published to the designated local workspace.
Evidence and receipt are available for inspection.
```

Before approval the projection instead says awaiting your approval, and original files remain unpublished. During conflicts/recovery it reports actual uncertainty and affected operations, not a generic completed checkmark.

An authorized diagnostic view/CLI can inspect current aggregate states, attempt/session history, selected result revisions, artifact reports, memory entry provenance, routing decisions, consumed/reserved usage, proposals, approvals and receipts. It obeys the same access policies; a debug reference does not bypass artifact permissions.

Human progress messages are a convenience into the same structured timeline, not a competing log system. No existing application UI needs to be changed to demonstrate this in the standalone framework.

<a id="section-40"></a>

## 40. A compact workflow class and the actual result handoffs

The following proposed sketch shows the core five-step segment as a class. Supporting imports, FeatureExecutors' typed dependencies and registered domain result types are omitted. WorkflowBuilder must implement inference for prior results; it is not an existing installed API.

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class InvestigationInputPolicy implements Policy<InvestigationWorkflowContext, InvestigationInput> {
  async apply(context: InvestigationWorkflowContext): Promise<InvestigationInput> {
    const { request } = context;
    return {
      goal: request.goal,
      workspace: request.workspace,
    };
  }
}

class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationInput> {
    const { request, results } = context;
    return {
      goal: request.goal,
      summary: results.investigate.summary,
      report: results.investigate.report,
    };
  }
}

class ImplementationInputPolicy implements Policy<ImplementationWorkflowContext, ImplementationInput> {
  async apply(context: ImplementationWorkflowContext): Promise<ImplementationInput> {
    const { request, results } = context;
    return {
      workspace: request.workspace,
      specification: results.specify,
    };
  }
}

class VerificationInputPolicy implements Policy<VerificationWorkflowContext, VerificationInput> {
  async apply(context: VerificationWorkflowContext): Promise<VerificationInput> {
    const { request, results } = context;
    return {
      workspace: request.workspace,
      changedFiles: results.implement.changedFiles,
    };
  }
}

class ReviewInputPolicy implements Policy<ReviewWorkflowContext, ReviewInput> {
  async apply(context: ReviewWorkflowContext): Promise<ReviewInput> {
    const { results } = context;
    return {
      specification: results.specify,
      changes: results.implement,
      verification: results.verify,
    };
  }
}

class FeatureWorkflow {
  constructor(private readonly executors: FeatureExecutors) {}

  define() {
    return WorkflowBuilder.forRequest<FeatureRequest>("implement-feature", {
      title: "Implement and verify a feature",
    })
      .step("investigate", {
        title: "Investigate authentication",
        executor: this.executors.investigate,
        inputPolicy: new InvestigationInputPolicy(),
      })
      .step("specify", {
        title: "Prepare specification",
        executor: this.executors.specify,
        inputPolicy: new SpecificationInputPolicy(),
      })
      .step("implement", {
        title: "Implement the bounded assignment",
        executor: this.executors.implement,
        inputPolicy: new ImplementationInputPolicy(),
      })
      .step("verify", {
        title: "Run actual checks",
        executor: this.executors.verify,
        inputPolicy: new VerificationInputPolicy(),
      })
      .step("review", {
        title: "Review source and evidence",
        executor: this.executors.review,
        inputPolicy: new ReviewInputPolicy(),
      })
      .build();
  }
}
```

The full publication-inclusive definition also declares the allowed fix, reconcile-target and proposal/publication transitions described earlier. The sketch intentionally does not invent an unimplemented branching API. TransitionPolicy chooses among declared transitions; the domain/engine validates them. Guard and publication coordinators can be explicit steps/collaborators without duplicating lifecycle authority.

Inside StepRunner, the fundamental call remains await step.inputPolicy.apply(workflowContext) followed by step.executor.execute(input, executionContext). The executor receives only the selected input and scoped capabilities. Later accepted result revisions—not arbitrary model conversation state—populate the next context.

Minimal implementation sketch does not relax the main story's persistence, runtime validation, limits, evidence, approval or recovery requirements.

<a id="section-41"></a>

## 41. Where every implementation responsibility belongs

The intended root is src/services/harness/workflow-framework/. All framework-owned source, tests, examples and documentation stay there. These planning notes remain separately under /Users/niki/Notes/harness-workflows-executors-framework/.

| Folder | Story responsibility |
| --- | --- |
| contracts/ | Executor, ExecutionContext and shared run/checkpoint/artifact boundaries. |
| domain/, builder/ | Immutable plan/step definitions and encapsulated run/StepRun objects/lifecycle. |
| engine/, policies/, recovery/ | Coordination, transition/retry decisions and reconciliation. |
| agentic/ | AgenticMindUnit contract/runner, AgenticSession, notebook, tools, model gateway/context composer and checkpoints. |
| decisions/ | DecisionUnit, provider registry/adapters, validated bounded-purpose questions and policies. |
| guards/ | Skill/rule definitions, System 1 selection, check registry/runner, reports and enforcement. |
| models/ | Profiles, hierarchical context resolution/eligibility/selection, gateway factory, escalation and handoff. |
| usage/, execution-control/ | Durable accounting/reservations, deadlines, admission/rates/concurrency/progress guards. |
| memory/ | Scoped working/episodic/semantic/procedural capabilities, retrieval/promotion/retention and storage. |
| workspaces/ | Isolated providers/boundaries, baseline/change sets, review, trusted approval/publication lifecycle/journal. |
| persistence/, events/ | Shared standalone stores, artifact adapters and typed debug/event delivery/query/formatting. |
| executors/, workflows/ | Reusable concrete task capabilities and this example's definitions. |
| composition/, examples/, tests/, docs/ | Explicit assembly, runnable scenario, deterministic fakes/behavior tests and public API explanation. |

Use one principal class/interface per file where useful. Keep one owner for each contract: agentic ModelGateway is not duplicated by model routing; DraftNotebook is not duplicated by WorkingMemory; shared usage is not duplicated per executor; ArtifactStore is not recreated inside memory/guards. Simple supporting value types can remain cohesive without unnecessary tiny files.

No implementation change to existing application-wide schemas/routes/UI/Harness factories is needed to build the standalone feature. Durable file/local adapters demonstrate restart behavior; in-memory fakes alone do not prove persistence.

<a id="section-42"></a>

## 42. How providers and capabilities are replaced without rewriting the agent

The story intentionally uses interchangeable boundaries:

| Change | What changes | What remains stable |
| --- | --- | --- |
| JEV to another compatible decision service. | Provider configuration; a new service needs adapter/registration and contract/quality evaluation. | DecisionUnit requests, guard selection, agent/workflow algorithms. |
| One execution model/provider to another. | Eligible profile and gateway adapter; explicit session-boundary handoff when active work changes model. | Executor contract, unit coordination, validation/permissions. |
| Filesystem artifacts to object storage. | Storage adapter/configuration and declared durability/access semantics. | ArtifactReader/Writer/Ref and typed result consumers. |
| Directory snapshot to Git clone/worktree. | Workspace provider and source-state policy/capabilities. | WorkspaceHandle-based task inputs and approval/change-set contracts. |
| New OOP checking capability. | GuardCheck implementation/registration and definition version. | GuardRunner interface-driven orchestration. |
| New task executor/workflow. | New capability/definition and composition. | Existing engine contract and state/usage/debug boundaries. |

Matching a method signature alone is insufficient. Adapters must preserve cancellation, abstention/errors, usage, scope, output validation, immutable identity and actual guarantees. Unsupported capabilities reject visibly rather than pretending equivalence.

Run shared adapter contract tests and representative quality/performance checks. A provider alias is not a claim that every model produces equally correct answers. Keep prior model/provider and policy versions in traces so changes are inspectable.

<a id="section-43"></a>

## 43. How to build this exact example as an offline acceptance scenario

Use a fixture repository and framework-owned temporary roots. Script fake model responses for bounded tool calls/final outputs, fake System 1 responses for classifications/routing/guard relevance, and controlled command outputs for check cases. The same interfaces allow real providers later, without requiring them for offline tests.

The scenario should prove these observable outcomes:

1. Admission validates scope/configuration and starts only permitted work; source capture preserves included dirty/untracked files and excludes non-managed content.
2. System 1 selection is validated, required guards survive abstention/failure, and the routing selector's bootstrap configuration cannot recurse.
3. Workflow dependencies/types map only accepted results into the next input; runtime dependency checks prevent using unfinished results.
4. Agentic sessions isolate notebook/protocol/model state; allowlists reject unknown tools and invalid arguments; malformed final output follows bounded policy.
5. Transient safe-read retry is distinct from fix cycles; actual underlying calls and counters consume the ledger.
6. Artifacts survive restart with immutable digests, runtime read/schema validation, idempotency, quotas and authorized upstream access.
7. Verification returns actual failed evidence as a completed business result; model claims alone do not satisfy check/guard acceptance.
8. Repeated failures create new StepRuns and explicit model escalation, without rewriting completed history or resetting budget.
9. Crash after W-31 is reconciled from checkpoint/workspace identity exactly once; uncertain effects are not blindly repeated.
10. OOP correction runs through a bounded new assignment, source-versioned reports and fresh checks.
11. Proposal content is frozen/pinned; user approval binds target/version/digest; generated/duplicate/wrong-target/stale approval cannot authorize new bytes.
12. Target conflict preserves user changes and creates a new checked proposal/approval; partial publication is journaled/reconciled before a receipt is confirmed.
13. Run completion requires the matching publication receipt and accepted criteria; optional memory/event failures do not falsify already-confirmed effects.
14. Durable knowledge has supported provenance and scoped retrieval; a later task does not inherit old execution approval/state.
15. Debug traces explain decisions and actual effects while redacting content and handling sink/queue failure under the stated policies.

Inject clocks/ID generators so timing, sequence/causation and restart tests are deterministic. Add concurrency tests for stale workers/reservations and boundary tests for exact caps, deletion/pins, cancellation and corrupt/missing state. Avoid tests that merely repeat private method structure; assert public outcomes, stored identities and actual fixture files.

Scripted fakes prove orchestration and contract behavior, not real LLM coding quality or complete OAuth correctness. Evaluate real profiles on representative assignments separately before claiming lower total cost, faster completion or architectural accuracy.

<a id="section-44"></a>

## 44. Feature coverage and links to every current topic

The following matrix maps this concrete story to all existing framework topic pages. The master example is self-contained about how the pieces cooperate; these links provide the deeper individual contracts.

| Existing topic | Features exercised here | Sections in this example |
| --- | --- | --- |
| [Core Concepts](01-core-concepts.md) | Core objects and their connections | [2](#section-02), [4](#section-04), [5](#section-05), [12](#section-12) |
| [Framework Location and File Organization](02-location-and-file-organization.md) | File ownership, public API and dependency boundaries | [4](#section-04), [41](#section-41) |
| [Executors and Contracts](03-executors-and-contracts.md) | Four defaults, typed return values, recording and consumption | [5](#section-05), [18](#section-18), [19](#section-19), [22](#section-22), [40](#section-40) |
| [Workflow Definition and Engine](04-workflow-definition-and-engine.md) | Workflow class, builder, graph and coordinator | [11](#section-11), [12](#section-12), [40](#section-40) |
| [Recovery, Memory, and Context Handoff](05-recovery-and-memory.md) | Retries, explicit handoffs, restoration and ownership | [17](#section-17), [23](#section-23), [24](#section-24), [33](#section-33), [38](#section-38) |
| [Scope of the First Version](07-first-version-scope.md) | Standalone deliverables and bounded optional scope | [1](#section-01), [41](#section-41), [43](#section-43) |
| [OOP Architecture and Design Rules](08-oop-architecture-and-design-rules.md) | Encapsulation, composition, polymorphism and injected adapters | [4](#section-04), [12](#section-12), [26](#section-26), [41](#section-41), [42](#section-42) |
| [Core Concepts Explained: Adding Google Login](09-core-concepts-explained-with-example.md) | Plain-language explanation and connected Google-login data flow | [2](#section-02), [5](#section-05), [13](#section-13), [18](#section-18), [19](#section-19) |
| [StepRunner and Contexts Explained](10-step-runner-and-contexts.md) | Context versus mapped input versus execution/model capabilities | [13](#section-13), [19](#section-19), [40](#section-40) |
| [Debug Events and Run Tracing](11-debug-events-and-run-tracing.md) | Correlated events, decision reasons, delivery and inspection | [35](#section-35), [36](#section-36), [38](#section-38) |
| [AgenticMindUnit: A Reusable Agentic Work Unit](12-agentic-mind-unit.md) | Goal/tool loop, session, notebook, permissions and outcomes | [16](#section-16), [17](#section-17), [18](#section-18), [24](#section-24) |
| [Agent Memory Across Tasks and Sessions](13-agent-memory.md) | Scoped working/episodic/semantic/procedural capabilities | [14](#section-14), [33](#section-33), [34](#section-34) |
| [Model Routing: Strong Planning, Economical Coding](14-model-routing-and-escalation.md) | Planning/coding profiles, evidence and bounded escalation | [15](#section-15), [20](#section-20), [21](#section-21), [23](#section-23) |
| [DecisionUnit: A System 1 Decision Layer](15-system-one-decision-unit.md) | JEV/alternative provider contracts, relevance and fallback | [9](#section-09), [10](#section-10), [15](#section-15), [42](#section-42) |
| [Why Have a Step When We Already Have an Executor?](16-why-steps-and-executors-are-separate.md) | Named plan position versus reusable task capability | [5](#section-05), [11](#section-11), [12](#section-12), [40](#section-40) |
| [Complete Framework Walkthrough: Add Google Login](17-google-login-complete-walkthrough.md) | Companion stage-by-stage walkthrough and state/artifact examples | [1](#section-01), [32](#section-32), [43](#section-43) |
| [Limits, Budgets, and Execution Control](18-limits-budgets-and-execution-control.md) | Resource scopes, reservations, unknown usage and stop rules | [6](#section-06), [7](#section-07), [27](#section-27), [36](#section-36), [37](#section-37), [38](#section-38) |
| [Hierarchical, Task-Aware Model Routing with System 1](19-hierarchical-task-aware-model-routing.md) | Selection at multiple scopes, bootstrap and session stability | [9](#section-09), [15](#section-15), [20](#section-20), [23](#section-23), [42](#section-42) |
| [Guards: Skills, Verifiable Rules, and System 1 Selection](20-guards-skills-rules-and-system-one-selection.md) | Skills/rules, System 1 selection, actual checks and coverage | [9](#section-09), [10](#section-10), [25](#section-25) |
| [Isolated Workspaces, Review, and Approved Publication](21-isolated-workspaces-review-and-publication.md) | Baselines, proposal/approval, conflicts and journaled application | [8](#section-08), [28](#section-28), [29](#section-29), [30](#section-30), [31](#section-31) |
| [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md) | Run, StepRun, session and publication state ownership | [12](#section-12), [19](#section-19), [24](#section-24), [29](#section-29), [31](#section-31), [32](#section-32) |
| [ArtifactStore: Produced Materials, References, and Evidence](23-artifact-store-and-produced-materials.md) | Immutable save/read, references, retention and content approval | [18](#section-18), [19](#section-19), [20](#section-20), [22](#section-22), [26](#section-26), [28](#section-28), [31](#section-31) |
| [Execution State Versus Reusable Knowledge](24-execution-state-versus-reusable-knowledge.md) | Safe continuation versus useful supported future knowledge | [14](#section-14), [24](#section-24), [33](#section-33), [34](#section-34) |

This covers the current documented design. Additional production adapters, parallel/nested workflows, automatic model benchmarking and advanced learned routing can be added when a real need justifies them. They do not require pretending those optional features already exist in the first implementation.

The separation to remember is: immutable definitions describe work; execution objects own its current truth; model/tool capabilities perform it; evidence and policies decide what follows; user approval authorizes exact publication; supported knowledge may help another task later.

## One Policy Contract Across This Complete Example

All configurable selections and transformations use Policy<TInput, TOutput> and apply(). The step input policies below prepare assignments from accepted workflow views. Context, completion, routing, guard, provider prompt-cache configuration, sub-agent admission, retry, transition, and memory policies use the same contract with purpose-specific data and explicit outcomes. Names such as CompletionPolicy or TransitionPolicy identify implementations/roles, not competing base interfaces. The engine/unit/tool/store coordinators still perform actual work and enforce trusted runtime invariants.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to framework table of contents](harness-workflows-executors-framework-idea.md)

## Construction Requirement: Enable Provider Prompt Caching

For the Google-login workflow, assemble AgentContextComposer and provider adapters so repeated model requests preserve unchanged role instructions, required rules, tool definitions, and output requirements in stable order and representation. Updated code and evidence remain current. Verify the final provider payloads from successive calls: shared material stays stable where the protocol permits, and each call includes its current assignment. Adapters apply supported cache controls and report cached-input usage. The provider owns cache hits; the framework owns preserving the opportunity for reuse. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

