# Complete Framework Walkthrough: Add Google Login

For a new consolidated story covering every current topic, including hierarchical routing, execution state versus reusable knowledge, and a full feature-coverage map, read [Complete Agent Example: Every Framework Feature Together](25-complete-agent-example-all-framework-features.md).

## 1. What This Example Demonstrates

A user asks an agent: **“Add Google login to my application.”** This walkthrough follows that request from configuration to completion and a later task, explaining every major framework concept in context.

The example describes proposed standalone framework behavior. Use a fixture workspace, deterministic fake model/decision providers, fake tools where appropriate, and isolated durable stores to demonstrate it without paid model calls or changes to the current AI Harness. The same interfaces can later be configured with real providers. Names, paths, outputs, limits, and decisions below are illustrative rather than existing implementation or prescribed Google OAuth configuration.

The walkthrough now includes state snapshots for the run, step executions, agentic sessions, and publication. The vocabulary follows [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md); it is proposed domain behavior rather than already implemented status enums.

The purpose is to explain how objects cooperate. This is not a Google OAuth security implementation guide. A real authentication change needs its own concrete requirements and verification.

## 2. The Main Participants

| Participant | Job in this example |
| --- | --- |
| Agent `developer-agent` | Stable identity performing this and later tasks under configured permissions and memory scope. |
| `FeatureWorkflow` / `WorkflowDefinition` | Reusable plan: investigate, specify, implement, verify, review, with configured fix transitions. |
| `WorkflowBuilder` | Constructs validated typed step definitions and dependencies. |
| `StepDefinition` | One assignment in that plan, with identity, input policy, executor, and configuration. |
| `WorkflowEngine` | Selects and coordinates steps, domain-state changes, and persistence. |
| `StepRunner` | Prepares and invokes one selected step under execution policies. |
| Executors | Task-specific capabilities: investigation, structured specification/review, editing, and deterministic verification. |
| `WorkflowRun` / `StepRun` | Authoritative state and results for this request and each executed step. |
| `AgenticMindUnit` / `AgenticMindUnitRunner` | Reusable goal-directed model/tool execution contract and its coordinating implementation. |
| `AgenticSession` | Isolated notebook, protocol state, counters, and pending operations for one unit invocation. |
| `Publication` | Approval/application lifecycle for one frozen proposal and target, with journal and receipt references. |
| `DecisionUnit` | Bounded System 1 judgments, such as classification and optional review relevance. |
| `AgentMemory` | Scoped working, episodic, semantic, and procedural capabilities. |
| Model routing and usage collaborators | Choose eligible models, account for usage, and support bounded escalation. |
| `ArtifactStore` / `ArtifactRef` | Save produced reports/content and pass immutable references between steps without duplicating large material. |
| Stores, artifacts, and debug collaborators | Save state, support recovery, and explain execution through correlated events. |

These are separate responsibilities, not a requirement to build one enormous agent class. Cohesive classes and small interfaces are assembled through dependency injection.

### State Ownership Used Throughout This Example

| Object | What can change | Who requests/protects the transition |
| --- | --- | --- |
| WorkflowDefinition / StepDefinition | No per-run lifecycle; reusable immutable plan/assignments. | Builder validates the graph; a changed plan gets a version. |
| WorkflowRun run-42 | created, queued, active, waiting_for_approval, recovering, and an applicable terminal outcome. | Engine coordinates; WorkflowRun validates domain commands. |
| Each StepRun | pending, active, retry_wait/interrupted where applicable, then an outcome. | StepRunner executes; the coordinator records outcomes through domain methods. |
| Each AgenticSession | created, active with internal phases, then completed/stopped/failed/etc. | AgenticMindUnitRunner coordinates; AgenticSession owns its invariants. |
| Publication pub-42-v1 | prepared, awaiting_approval, approved, preflight, applying, published or a conflict/failure/recovery outcome. | Trusted approval boundary and WorkspacePublisher through Publication domain rules. |

An arrow below means a validated state change whose required persistence boundary is respected. Not every arrow is instantaneous or part of one database transaction. A child can complete before its parent records/persists the result. Pending coordination is durable so recovery can reconcile that gap.

Do not multiply all combinations into one huge workflow state enum. The plan's current position, the run lifecycle, and child lifecycles remain separate fields/objects.

## 3. Configure the Agent Before Work Starts

The composition root supplies the framework's collaborators through its public `index.ts` API. It does not let the model construct database clients, choose arbitrary services, or discover hidden global dependencies.

Illustrative configuration:

```text
Agent ID: developer-agent
Project scope: shop
Workspace: /fixtures/shop

Model profiles:
  planning → strong-profile
  coding   → economical-profile
  review   → strong-profile
  recovery → strong-profile

Decision provider:
  selected alias → alternative
  registered adapters → jev, alternative, fake

Policy examples:
  maximum workflow fix cycles → 3
  escalation evidence → two repeated equivalent coding failures
  run-wide calls/tokens/deadline → explicitly configured

Stores:
  isolated durable run/checkpoint, artifact, event, and memory adapters
```

Profile aliases are configuration names, not claims about actual model capability, price, or provider. Eligibility checks must confirm that each selected profile can handle the required tools, output contract, and context size.

The `DecisionProviderRegistry` resolves the selected decision adapter. Choosing `jev` instead of `alternative` changes composition/configuration, not the agent's workflow or decision algorithm. Provider-specific confidence metadata and response formats are normalized and validated; changing providers does not imply identical decision quality.

The first standalone demonstration can select fake providers throughout. Real adapters are optional for offline tests.

### Configure the Artifact Capability

Composition creates a durable scoped ArtifactStore adapter and injects it through each producer's ExecutionContext. Its storage root/bucket is configured independently of source paths. In a standalone example, it can use a framework-owned data directory such as example-data/artifacts/, excluded from proposed source-file publication.

Report names such as authentication-investigation.md are display labels. They are not permission for an executor to choose arbitrary disk paths. The adapter maps opaque IDs to its own controlled byte/metadata storage.

The reference returned by write() includes artifactId, exact-content digest, byteLength, mediaType, and optional schema identity/version. Trusted metadata records project/run/StepRun/attempt/session ownership and provenance. Later steps receive scoped readers that can access permitted upstream artifacts; a reference alone does not grant access.

These examples follow the proposed [ArtifactStore API](23-artifact-store-and-produced-materials.md). The readonly context property fixes the capability reference in TypeScript; authorized write() calls are still allowed.

## 4. Receive the Request and Identify Its Scope

The trusted caller supplies the request and authorized agent/project identity:

```text
Goal: Add Google login while keeping existing email/password login.
Workspace: /fixtures/shop
Agent: developer-agent
Project: shop
```

The agent's project scope and tool permissions come from trusted configuration, not from a guessed model answer. The request becomes serializable input for the workflow run.

A bounded `DecisionUnit` may classify the request:

```text
Purpose: classify-task
Question: Which category best describes this request?
Options: authentication, billing, documentation, other
Evidence: bounded request summary
Answer: authentication
```

The decision provider supplies an answer, abstention, or failure. `DecisionPolicy` checks the response and decides what to apply. Classification can help select relevant guidance; it cannot disable mandatory checks or grant write tools.

If the provider is unavailable, the configured policy may use a deterministic category fallback or preserve ambiguity. It must not disguise a failed call as a successful classification. This is a small decision call, not an AgenticMindUnit investigating the whole workspace.

### Isolated Working Copy

For code-editing work, capture the fixture source baseline and create a separate working workspace through WorkspaceProvider. All file/search/command/guard capabilities in the following steps target that working copy. /fixtures/shop in the example inputs denotes that scoped working location; the designated original target is recorded separately. The task does not directly edit the original. See [Isolated Workspaces and Approved Publication](21-isolated-workspaces-review-and-publication.md).

## 5. Build the Plan and Create a Run

`FeatureWorkflow.define()` uses `WorkflowBuilder` to produce an immutable `WorkflowDefinition`:

```text
investigate → specify → implement → verify → review
                           ↑                   │
                           └── bounded fix ────┤
                                               ├── unresolved/limit → stop
                                               └── accepted
                                                    ↓
                                    prepare proposal → await approval
                                                    ↓ approved
                                          preflight → publish
                                                    ↓ confirmed receipt
                                                 complete
```

A fix transition can revisit implementation, checks, and review up to the configured limit. Transition policies express these rules; the email/login/provider-specific implementation does not belong inside the engine.

The definition is reusable. The engine creates `WorkflowRun run-42` specifically for the Google-login request. A later password-reset request creates a different run using the same definition.

Before any result exists:

```text
Run: run-42
Workflow: implement-feature, definition version 1
Request: Add Google login...
Status: active
Completed results: none
```

The engine uses domain methods to start work and a `RunRepository` to persist state. Callers cannot simply assign `run.status` or inject a fake completed result into mutable public collections.

### State Snapshot: Admission

```text
Workflow definition: implement-feature/v1 — unchanged, no running status
Run run-42: created → queued → active
Current workflow position: investigate selected
StepRun: not started yet
AgenticSession: none yet
Publication: none yet
```

Queued can be brief or unused when capacity is immediately available. Admission and domain policy determine the actual path. Starting the run does not start every step or create every session at once.

## 6. Understand the Investigation Step Before Executing It

The investigation `StepDefinition` contains:

```text
ID: investigate
Title: Investigate the existing code
Executor: injected WorkspaceInvestigationExecutor
Input policy: request.goal + request.workspace
Output contract: summary + sources + open questions + detailed report ArtifactRef
```

It does not search files. It identifies a position in the plan and describes how that position uses a reusable capability.

The same executor could also serve “Investigate billing” with a different step identity and input. A new investigation algorithm is not required for every subject.

The engine creates `StepRun sr-investigate-1` and its first technical attempt `attempt-investigate-1`. The reusable definition contains no result or attempt counter.

### State Snapshot: Starting One Assignment

```text
Run run-42: active → active
Step definition investigate: unchanged
StepRun sr-investigate-1: pending → active
Attempt attempt-investigate-1: started
AgenticSession: not created until the executor invokes the unit
Publication: none
```

The run remains active as the engine advances through workflow positions; it does not need a status named investigating. Current StepRun references identify the assignment in progress.

## 7. Supply the Two Contexts to StepRunner

The engine prepares a readonly workflow-context view:

```text
Workflow context:
  request.goal = Add Google login...
  request.workspace = /fixtures/shop
  selected completed results = none yet
```

It also supplies execution capabilities:

```text
ExecutionContext:
  runId = run-42
  stepId = investigate
  signal = cooperative cancellation signal
  progress = scoped progress reporting
  debug = scoped structured recorder
  artifacts = permitted artifact capability
```

Workflow context tells the input policy what task data is available. Execution context supplies live identity and capabilities. Neither is the model's token context.

`StepRunner` performs the equivalent of:

```typescript
const input = await step.inputPolicy.apply(workflowContext);
const result = await step.executor.execute(input, executionContext);
```

The complete runner applies injected execution policies and cancellation. It does not decide the next workflow step or embed the investigation implementation. State persistence remains explicitly coordinated through the run objects and repositories.

## 8. Retrieve the Agent's Relevant Memory

The investigation unit receives a scoped `AgentMemory` view for the authorized agent, project, and session. It does not receive unrestricted access to every agent's memories.

Potential retrieved entries:

| Memory category | Example |
| --- | --- |
| Semantic | This project uses session cookies, with a source revision and verification timestamp. |
| Episodic | A previous authentication change failed because the callback URL configuration did not match. |
| Procedural | The project's authentication verification checklist. |

These are evidence, not authoritative instructions. The unit checks current source files before trusting an old project fact. Conflicting or expired entries remain visibly uncertain.

`AgentContextComposer` includes only relevant bounded summaries and references in model input. The entire memory store is not sent to every call. Retrieval emits events showing selected entry IDs, reasons, freshness, and safe summaries.

Working memory is different: the current session's notebook holds observations and pending actions for this task. Workflow results remain authoritative records of the current run, not a replacement for durable agent knowledge.

## 9. Investigation Invokes AgenticMindUnit

`WorkspaceInvestigationExecutor` turns its input into a unit definition:

```text
Unit: investigate-authentication
Assignment:
  Goal: Explain current login and identify relevant extension points.
  Constraints: Do not edit the workspace.
  Completion: Findings supported by file references; unresolved questions explicit.

Tools:
  searchFiles, readFile, recordFinding, setNextActions

Limits:
  bounded iterations, tool calls, model output, usage, and deadline

Result contract:
  structured findings, source references, open questions
```

The executor delegates to the injected `AgenticMindUnit`; it does not implement another while-loop.

Composition supplies a selected model gateway to `AgenticMindUnitRunner`. The runner creates `AgenticSession session-investigate-1` with its own notebook, protocol state, counters, and pending-operation records. Reusing the runner's algorithms never shares mutable notebook state across sessions.

The assignment remains authoritative. Notebook updates cannot change permissions, goals, budgets, or completion criteria.

### State Snapshot: Starting the Investigation Session

```text
Run run-42: active
StepRun sr-investigate-1: active
AgenticSession session-investigate-1: created → active
  Phase: composing input → awaiting model
Publication: none
```

The session's model phase is local to that loop. The run and StepRun do not transition to awaiting_model just because a model request is in flight. A DecisionUnit classification call is also not automatically an AgenticSession.

## 10. Follow the Inner Model/Tool Cycle

A possible sequence is:

1. The runner checks cancellation and budgets and composes bounded model input.
2. The model asks to search for authentication code.
3. `ToolDispatcher` validates that `searchFiles` is in the session's registry and that its arguments match the contract.
4. The tool returns bounded path matches, which become observations in the session.
5. The next model call requests reading the login route.
6. A notebook capability records a concise finding with its source reference and identifies the next open question.
7. Further permitted reads resolve how sessions are created.
8. The model proposes a structured investigation result.
9. `ResultContract` validates the output and completion policy checks the available criteria/evidence.
10. The unit returns a completed outcome or a distinct stopped/failed/interrupted outcome.

Example notebook revision:

```text
Goal reference: investigate-authentication assignment v1
Finding: The inspected login route creates a session cookie.
Evidence: auth/login.ts, current workspace revision
Open question: Which module builds callback URLs?
Next action: Inspect the configuration module.
```

The notebook is concise task memory, not a hidden reasoning transcript. A tool response cannot redefine the session's rules. An unregistered edit request from a read-only investigation session is rejected without invocation.

Multiple model/tool interactions still produce one logical investigation-step result. A shape-valid result is not proof that its factual claims are correct; evidence and later verification remain necessary.

### State Snapshot: Loop Phases Versus Session Completion

| Event | Session lifecycle / phase | Parent state |
| --- | --- | --- |
| Input composed and call dispatched. | active / awaiting model. | Run active; investigation StepRun active. |
| Model requests a file search. | active / processing response → invoking tools. | Parents stay active. |
| Search result accepted. | active / recording observations → composing input. | Parents stay active. |
| Notebook finding recorded. | active / updating notebook; revision increments. | No step/run completion implied. |
| Proposed final output fails validation. | active / validation feedback and another bounded iteration, or stopped when limits disallow more work. | No successful step result yet. |
| Valid result and completion policy accepted. | active → completed, with saved outcome reference. | StepRun remains active until its mapped result is accepted/persisted. |

A notebook edit is not a new workflow step. A completed session does not by itself mean the investigation result is durable at the parent boundary.

## 11. Persist Investigation and Prepare the Specification

The executor maps the unit's completed outcome to its typed investigation result. A detailed report is saved first; its summary and ArtifactRef then become part of the accepted step result.

### Investigation Executor Saves the Detailed Report

This proposed OOP example uses shared Executor, ExecutionContext, ArtifactRef, and InvestigationInput contracts; their imports are omitted. The injected capability uses AgenticMindUnit and returns validated, bounded findings from the inspected workspace.

```typescript
interface InvestigationEvidence {
  readonly summary: string;
  readonly sources: readonly string[];
  readonly openQuestions: readonly string[];
  readonly reportText: string;
}

interface InvestigationCapability {
  inspect(
    input: InvestigationInput,
    context: ExecutionContext,
  ): Promise<InvestigationEvidence>;
}

interface GoogleLoginInvestigationResult {
  readonly summary: string;
  readonly sources: readonly string[];
  readonly openQuestions: readonly string[];
  readonly report: ArtifactRef;
}

class ReportSavingInvestigationExecutor
  implements Executor<InvestigationInput, GoogleLoginInvestigationResult>
{
  constructor(private readonly investigation: InvestigationCapability) {}

  async execute(
    input: InvestigationInput,
    context: ExecutionContext,
  ): Promise<GoogleLoginInvestigationResult> {
    const findings = await this.investigation.inspect(input, context);
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
  }
}
```

This illustrates report-producing behavior of the default investigation capability rather than another mandatory default executor. Capture validation, content sanitization, limits, and cancellation apply inside the injected capability/store. The store scopes the idempotency key by trusted producer-operation identity. Repeating that operation with the same bytes returns the existing reference; new content/execution has distinct identity rather than overwriting it.

### What Is Saved Where?

```text
ArtifactStore bytes/metadata:
  artifact-investigation-17
    label: authentication-investigation.md
    content: detailed inspected-source findings with evidence references
    metadata: source revision + trusted run/step/attempt provenance

RunRepository logical step result:
  runId: run-42
  stepRunId: sr-investigate-1
  outputContract: google-login-investigation/v1
  result:
    summary: Authentication uses session cookies.
    sources: [auth/login.ts, auth/session.ts]
    openQuestions: []
    report:
      artifactId: artifact-investigation-17
      digest: <exact-content digest computed by the store>
      byteLength: <actual stored byte count>
      mediaType: text/markdown
```

The IDs are illustrative aliases for opaque references, not hard-coded write arguments or required physical storage names. The repository may serialize the small typed object to JSON or use another validated storage layout. The detailed report bytes are not copied into every result row.

Artifact ready means its bytes/metadata were committed under the adapter contract. It does not automatically mark the session, StepRun, or WorkflowRun completed. The engine still accepts the mapped result through domain methods and durably records it before dependent work proceeds.

Only after persistence confirmation does the trace claim `result.persisted`. An executor returning successfully does not by itself mean a durable result exists.

The engine selects `specify`. Its input policy selects the original goal and the saved investigation findings. It does not require the investigation unit's entire conversation or writable notebook.

The specification task receives a fresh session with the required context. This handoff makes dependencies explicit and limits accidental shared state.

### Next-Step Input Selects the Saved Reference

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationInput> {
    const { request, results } = context;
    return {
      goal: request.goal,
      summary: results.investigate.summary,
      sources: results.investigate.sources,
      report: results.investigate.report,
    };
  }
}

// WorkflowBuilder excerpt using the report-producing investigation result.
.step("specify", {
  title: "Prepare a specification",
  executor: specificationExecutor,
  inputPolicy: new SpecificationInputPolicy(),
})
```

This input policy passes the accepted result's reference, not an unrestricted store path or the previous agentic conversation. If the next step needs only the summary, it need not read the full report.

### State Snapshot: Recording a Child Outcome and Moving On

```text
Session session-investigate-1: completed (immutable history)
StepRun sr-investigate-1: active → completed after mapped result acceptance
Run run-42: active; investigation result durably recorded
Transition decision: investigate → specify
StepRun sr-specify-1: pending → active
Session session-specify-1: created → active when the unit starts
Publication: none
```

If the session outcome is stored but the parent result write fails, record/recover the pending coordination. The engine must not announce a durable completed step or rerun investigation tools blindly. Reconcile the saved outcome and accept it once.

## 12. Use a Strong Planning Profile to Produce a Contract

`ModelRoutingPolicy` receives the planning role, required capabilities, evidence, and remaining budget. It selects an eligible configured profile and returns a recorded reason. `ModelGatewayFactory` supplies the adapter; no provider-specific branch is needed in the workflow engine.

A configured `StructuredTaskExecutor` can use AgenticMindUnit to prepare a specification containing:

```text
Goal and constraints:
  Add Google login; preserve existing email/password behavior.

Relevant source:
  Authentication routes, session service, configuration module.

Bounded tasks:
  Add required configuration handling.
  Implement the agreed callback integration.
  Connect the agreed login entry point.
  Add/update verification coverage.

Acceptance criteria:
  New behavior matches the agreed requirements.
  Existing login checks remain passing.
  Misconfiguration and failure paths are handled as specified.

Verification:
  Named project checks with expected evidence.

Assumptions:
  Explicit unresolved external configuration or source questions.
```

The plan cannot create secrets, expand tool permissions, or assert that an external service has been configured when it has not. Workspace contradictions become explicit issues to resolve.

The specification is saved as the `specify` step result. Its model usage, selected profile, and evidence references are traced.

### Planning Reads Authorized Investigation Evidence

Inside the specification executor, the input above is consumed before composing bounded model context:

```typescript
// Method-body excerpt: input/context are this executor's typed arguments.
const document = await context.artifacts.read(input.report, {
  maxBytes: 128 * 1024,
  signal: context.signal,
});

if (document.ref.mediaType !== "text/markdown") {
  throw new Error("Expected a Markdown investigation report");
}

const reportText = new TextDecoder("utf-8", { fatal: true })
  .decode(document.data);

const specification = await this.planning.create(
  {
    goal: input.goal,
    investigationSummary: input.summary,
    sources: input.sources,
    reportText,
  },
  context,
);
```

This is a method-body sketch with an injected planning capability, not standalone top-level implementation code. The size is illustrative. The store validates authorized scope, readiness, full-read size, and integrity; the consumer validates expected format. Implementation uses documented typed errors rather than the plain Error shorthand above. A report too large for a full read needs an explicit bounded/summary path, not silent truncation.

The context composer still limits what enters the planning model. Stored text is evidence, not instructions that override rules. A read-only planning/evidence helper can receive ArtifactReader instead of the broader producer capability.

The specification result can remain a small structured object. If it also generates a long specification document, save that as a separate immutable artifact and return its reference alongside the structured acceptance criteria/tasks. It is not required to put every small value in ArtifactStore.

### State Snapshot: Planning Finishes

```text
Session session-specify-1: active → completed with the validated specification
StepRun sr-specify-1: active → completed at its result persistence boundary
Run run-42: active; accepted specification result reference recorded
Transition decision: specify → implement
StepRun sr-implement-1: pending → active
Session session-implement-1: created → active, economical profile
Publication: none
```

Planning and coding use different session identities. The shared workflow definition and the completed planning session are not mutated to become the coding session.

## 13. Give an Economical Coding Model a Bounded Assignment

The implementation input selects the saved specification, workspace identity, and relevant results. Routing selects an eligible economical coding profile if it meets capability and budget requirements.

`WorkspaceEditingExecutor` starts a new AgenticMindUnit session with explicit read/write/check capabilities. It receives the relevant implementation contract, not an instruction merely saying “do the feature.”

Its notebook is initialized from the handoff and current source context. It does not become the owner of the planner's notebook. Available operations may include bounded file edits and configured checks; tool permissions come from trusted composition.

The coding session records operation IDs before side-effecting actions. It produces changed-file references, a summary, and uncertainty. Large diffs or reports live in `ArtifactStore`; typed results and events reference them.

The engine records the implementation result. A model's statement that tests passed is not accepted as actual verification evidence.

### State Snapshot: Code Produced, Not Yet Accepted

```text
Session session-implement-1: active → completed with changes/artifact references
StepRun sr-implement-1: active → completed when the mapped outcome is saved
Run run-42: active
Transition decision: implement → verify
StepRun sr-verify-1: pending → active
AgenticSession for deterministic verification: none required
Publication: none; original target still unchanged
```

Completed here means the implementation assignment produced its result. It is not a claim that checks passed or that original files were published.

## 14. Run Deterministic Verification

A `VerificationExecutor` invokes injected verification capabilities, often without any LLM loop. It runs the configured fixture/project checks and returns structured outcomes:

```text
Check: callback-configuration behavior
Outcome: failed
Evidence: recorded check output reference
Diagnostic summary: callback URL mismatch in the fixture scenario

Check: existing email/password regression
Outcome: passed
```

A failed check is a legitimate verification result, not necessarily an exception in the executor. A process-launch failure or unavailable verification environment is a different outcome and must remain distinguishable.

Save the actual evidence. The workflow does not report a verified success simply because the coding unit claims completion.

### Verification Saves Actual Diagnostics as an Artifact

In the verification executor, save the bounded/sanitized report from the actual check capability and return a small result:

```typescript
// Method-body excerpt of a configured verification executor.
const checkReport = await this.verification.check(input, context.signal);
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

return {
  passed: checkReport.passed,
  summary: checkReport.summary,
  report,
};
```

The injected verification capability supplies the report, including normalized check identities, outcomes, diagnostics, and source revision. Its runtime contract is registered as verification-report/v1. Bound command capture before constructing/encoding it so a store size cap is not the first protection against unlimited output allocation.

For the first failed callback check:

```text
ArtifactStore:
  artifact-checks-18 → JSON verification report for workspace revision code-v1

RunRepository accepted result:
  stepRunId: sr-verify-1
  lifecycle: completed
  result:
    passed: false
    summary: Callback configuration check failed.
    report: ArtifactRef(artifact-checks-18)
```

The full JSON bytes live in ArtifactStore; the typed return object lives in the recorded step result. Saving a failed-check report succeeds independently of the business result being negative. A report-write failure is a separate storage/evidence outcome and must not produce a fabricated reference.

### State Snapshot: A Completed Check Can Report a Failed Check

```text
StepRun sr-verify-1: active → completed
Verification result: checksPassed=false, callback mismatch evidence saved
Run run-42: active
Coding session session-implement-1: remains completed
Publication: none
```

The verification executor ran and returned a valid negative result. If the process could not start or a required outcome could not be evaluated, that would be a technical/unable-to-evaluate outcome handled separately.

For this illustrative plan, review gathers the check/guard evidence before selecting the bounded fix. Another permitted graph could route directly from verification to a fix. Either way, false check results do not become proof of accepted implementation.

## 15. Select Guards, Run Rule Checks, and Perform Review

The [guard subsystem](20-guards-skills-rules-and-system-one-selection.md) selects applicable versioned skill/rule packages through System 1 DecisionUnit before planning and coding. The configured JEV or compatible provider recommends relevant guard IDs; policy preserves required guards. OOP and ESLint instructions become assignment guidance without changing tool permissions.

Once changes and verification evidence exist, guard selection runs again against the diff. GuardRunner invokes registered GuardCheck implementations: actual lint capability for ESLint, and structural/model-assisted assessment for OOP. Reports distinguish passed, failed, not applicable, and unable-to-evaluate outcomes, with rule IDs, coverage, evidence, and source/configuration fingerprints. GuardEnforcementPolicy turns blocking findings into bounded fix assignments; stale reports require rechecks and unavailable required checks cannot count as passed.

Alongside guard selection, the engine/coordinator can request another bounded decision for additional review:

```text
Purpose: select-review
Evidence: safe diff summary and changed-file references
Options: authentication, database, none
Recommendation: authentication
```

`DecisionUnit` invokes the configured `DecisionProvider`. `DecisionPolicy` validates and applies the recommendation while retaining required reviews. Provider failure or abstention follows a purpose-specific fallback rather than silently selecting `none`.

A review executor uses its configured review profile to compare the specification, actual changes, and verification evidence. It returns acceptance or concrete issues tied to criteria and sources. It does not silently rewrite the original goal.

System 1 review selection is a bounded recommendation. The review unit's deeper examination and deterministic checks are separate capabilities.

### Review Reads the Report Referred to by Verification

The review step maps selected result references into its input:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class ReviewInputPolicy implements Policy<ReviewWorkflowContext, ReviewInput> {
  async apply(context: ReviewWorkflowContext): Promise<ReviewInput> {
    const { results } = context;
    return {
      specification: results.specify,
      changes: results.implement,
      verificationSummary: results.verify.summary,
      verificationReport: results.verify.report,
    };
  }
}

// Builder excerpt; this is the initial check/review pass.
.step("review", {
  title: "Review implementation and evidence",
  executor: reviewExecutor,
  inputPolicy: new ReviewInputPolicy(),
})
```

A review evidence helper can use the scoped reader as follows:

```typescript
// Method-body excerpt of the review executor/helper.
const document = await context.artifacts.read(input.verificationReport, {
  maxBytes: 256 * 1024,
  signal: context.signal,
});

if (
  document.ref.mediaType !== "application/json" ||
  document.ref.schemaId !== "verification-report" ||
  document.ref.schemaVersion !== 1
) {
  throw new Error("Unsupported verification-report contract");
}

const raw: unknown = JSON.parse(
  new TextDecoder("utf-8", { fatal: true }).decode(document.data),
);
const verificationEvidence = this.verificationReportContract.parse(raw);
```

The injected verificationReportContract performs actual runtime schema validation. A TypeScript cast after JSON.parse would not validate the report. The reviewer can now inspect failed criteria with source/check references and select bounded evidence for its configured model. Digest validity proves stored-byte integrity, not correctness of the checks or model conclusions.

GuardRunner can likewise store immutable OOP/ESLint GuardReport artifacts. A fix assignment receives finding summaries and authorized references to the exact rule/source-versioned reports; guard evidence is not replaced by a generic successful model message.

### State Snapshot: Review Finds Blocking Issues

```text
Run run-42: active
StepRun sr-review-1: pending → active → completed with decision=fix-required
Review session session-review-1: created → active → completed
Guard reports: blocking findings and/or unresolved required coverage recorded
Transition selected: review → implement with explicit fix assignment
Publication: not prepared for approval while blocking criteria remain unresolved
```

A model-assisted guard may create its own read-only session; a lint check may run without one. Their outcomes belong to GuardReports and feed enforcement policy. Do not falsely promote guard statuses into workflow-run statuses.

## 16. Fix, Escalate, or Stop with Evidence

If verification/review finds issues, a transition policy can start a bounded fix cycle. Its assignment includes the failed criterion, diagnostic evidence, current diff, and expected correction.

Revisiting implementation creates a new StepRun such as `sr-implement-2`. A technical retry inside that step execution has a separate attempt identity. The earlier implementation result remains distinguishable from the corrected version.

An escalation policy may respond to two repeated equivalent coding failures in this illustrative configuration. It can select stronger assistance for diagnosis or correction, subject to eligibility and remaining budget.

The new model receives a `ModelHandoff` with:

- Assignment and specification version.
- Current workspace revision and changed-file/artifact references.
- Safe notebook summary and unresolved questions.
- Verification/review failures with evidence references.
- Usage, completed actions, and uncertain side effects.

A model change starts a new isolated session with an explicit relationship to the previous one. It does not mutate a shared runner's gateway or transplant provider-specific conversation state blindly.

Further edits are followed by checks and review. At the configured fix limit, insufficient budget, or unresolved blocker, the run stops with an honest outcome and remaining issues. A limit must not be disguised as success.

### Corrected Code Gets New Report References

```text
Initial pass:
  sr-verify-1.result.report → artifact-checks-18, source code-v1, failed checks

After correction:
  sr-verify-2.result.report → artifact-checks-19, source code-v2, new check outcomes
```

Never overwrite artifact-checks-18 or relabel it as evidence for code-v2. The run's selected-result mapping explicitly points downstream review to sr-verify-2 when that is the accepted current check result. Prior reports remain historical under retention policy. A new check operation has a distinct idempotency scope even if the display label stays google-login-checks.json.

### State Snapshot: Fixes Preserve Earlier History

```text
Run run-42: active throughout permitted fixes
Old StepRun sr-implement-1: completed, unchanged
Old verification/review results: retained with original source references
New StepRun sr-implement-2: pending → active
New session session-implement-2: created → active → completed
New StepRun sr-verify-2: pending → active → completed with new evidence
New StepRun sr-review-2: pending → active → completed with accepted/fix-required result
```

The new checks reference the corrected artifact version. A technical retry, by contrast, can keep the same StepRun and move active → retry_wait → active with a new attempt ID under the configured retry ownership. It does not create an untracked workflow fix or erase the first attempt's usage.

If two repeated equivalent failures trigger escalation, a subsequent allowed fix execution can create a stronger-model session linked by ModelHandoff. Preserve its predecessor's actual completed/stopped/failed outcome; a completed result that later failed verification is not rewritten as a failed session. The active session's gateway is never mutated in place.

If limits prevent further work, reconcile active child effects, return an explicit stopped outcome, and leave run-42 non-completed (terminal stopped once its conditions hold). A cancelled intent is similarly not terminal cancelled until pending effects are handled according to policy.

## 17. Account for Usage Across the Whole Run

`RunUsageBudget` tracks planning, coding, review, decision calls, transport retries, and escalation in one ledger. Per-session limits constrain individual units but do not reset total consumption.

Reserve capacity before calls where possible and reconcile with measured usage. Concurrent reservations must not independently spend the same remaining budget. Configured monetary estimates carry their price source/version and are not presented as exact bills.

An interrupted provider call may have unknown usage. Record that uncertainty and reconcile conservatively rather than treating it as free. Hard call/output/iteration limits remain useful even when cost data is unavailable.

The trace explains why a profile was selected, how much each session consumed, and why the workflow stopped or escalated. Economical coding is useful only if the total quality/cost outcome actually supports it.

Run limits also cover active/queued work, call deadlines, attempts, tool/process output, context/notebook growth, memory query/write volume, artifacts/checkpoints, and debug queues. They are enforced at the owning boundaries with explicit outcomes. See [Limits, Budgets, and Execution Control](18-limits-budgets-and-execution-control.md) for configuration, reservations, and detailed failure/recovery semantics.

## 18. Interrupt and Resume Safely

Suppose the process stops after investigation completed but during implementation.

The stores have separate roles:

| Store/state | Contents |
| --- | --- |
| Run repository | Request, definition version, step outcomes, lifecycle state. |
| Session checkpoint | Notebook snapshot/revision, conversation/protocol references, counters, pending tool calls, completed operation IDs. |
| Artifact store | Reports, diffs, bounded large outputs. |
| Durable agent memory | Authorized facts, procedures, episodes, proposals. |
| Debug event store | Correlated history of attempts, decisions, operations, and persistence. |

On resume, recovery validates versions and restores authoritative run/session state. It rebuilds context views, live services, cancellation signals, and scoped recorders. Already-persisted investigation is not automatically rerun.

If an edit may have completed externally before its outcome was saved, recovery reconciles the operation with workspace evidence or an idempotency contract. It does not blindly repeat the side effect. Tool-call/result protocol pairing must also be restored correctly.

An event span left open by a crash is shown as interrupted or uncertain after recovery, not given an invented successful end event. Replaying debug events is inspection, not permission to replay tool actions.

### Artifact Recovery Has Its Own Boundaries

If an artifact committed but the parent result did not, recover by stable operation identity and attach the validated existing reference once; do not rerun external checks/edits just to recreate the same report. Producer leases/pins protect ready artifacts during the parent-persistence gap.

Checkpoints and review proposals retain required references under explicit retention policy. Missing/corrupt/expired evidence is visible and may require new checks/proposal approval. A notebook summary or a debug line cannot stand in for unavailable exact report/proposal bytes.

### State Snapshot: Recovery Is a Separate Path, Not a Normal Completion

This is an alternative interruption during a coding execution, not a claim that the already-completed steps above crashed afterward.

| Moment | Run | Coding StepRun | AgenticSession | Publication |
| --- | --- | --- | --- | --- |
| Before interruption. | active. | active. | active / invoking write tool; operation ID recorded. | None. |
| Process disappears. | Last durable state may still say active. | Last durable state may still say active. | Outcome of pending tool may be unknown. | None. |
| Recovery detects interrupted ownership. | active → recovering through a validated recovery command. | active → interrupted as reconciled from evidence. | active → interrupted → recovering under recovery policy. | None. |
| Write/protocol state reconciled and resume permitted. | recovering → active. | interrupted → active with documented attempt identity. | recovering → active, same session when validated resume is possible. | None. |
| Resume cannot be made safe. | stopped/failed under explicit policy once unresolved work is represented. | Honest stopped/failed outcome and checkpoint references. | Honest stopped/failed outcome, uncertainty retained. | None. |

A crash itself does not atomically persist interrupted everywhere. The recovery coordinator validates actual durable state, worker leases/versions, checkpoints, and external effects before recording transitions. Budget/deadline history remains intact. A deliberate new-session handoff is recorded separately from a same-session resume.

## 19. Inspect the Debug Timeline

A developer can inspect a standalone readable timeline or JSONL export without an application UI:

```text
run-42  run.started                         definition=implement-feature/v1
        decision.policy.applied             category=authentication
        step.started                        investigate, stepRun=sr-investigate-1
        input.prepared                      safe fields + dependency references
        model.routing.selected              profile=investigation-profile, reason=...
        session.started                     session-investigate-1
        operation.started                   searchFiles, operation=op-1
        operation.completed                 bounded result summary, duration=...
        notebook.revised                    revision=2, evidence references
        session.completed                   validated outcome + usage
        artifact.ready                      artifact-investigation-17, kind/size/digest
        result.persisted                    investigate/result-1, report reference
        transition.selected                 investigate → specify, reason=...
        model.routing.selected              role=planning, profile=strong-profile
        ...
        model.routing.selected              role=coding, profile=economical-profile
        ...
        artifact.ready                      artifact-checks-18, code-v1
        verification.result                 failed check + report reference
        transition.selected                 bounded fix, reason=...
        model.escalation.decided            repeated failure evidence, new session
        ...
        artifact.ready                      artifact-checks-19, corrected source
        artifact.read.completed             review reads current report
        verification.result                 checks passed
        result.persisted                    accepted final review/result reference
        publication.prepared                pub-42-v1, proposal digest and target
        run.waiting_for_approval             exact reviewed proposal
        publication.approval.recorded        trusted approval for this version
        publication.preflight               target and approval revalidated
        publication.operation.completed     approved path operation + journal ID
        publication.completed               confirmed receipt-42-v1
        run.completed                       publication-inclusive durable outcome
```

These event names illustrate domain-level events; concrete schemas must be defined and validated. Every event includes its applicable run, step execution, attempt, session, operation, and span identities. The event store adds per-run append sequence; correlation/causation establishes relationships beyond timestamps.

Record the selected decision provider, its recommendation, and the policy's actual applied outcome separately. Record memory entry IDs selected for model input. Keep input/output summaries bounded and sanitized; credentials, unrestricted source content, and private reasoning do not enter the timeline by default.

Required lifecycle records have explicit durability semantics. Optional live-view delivery failure does not corrupt a successful task; required state/event persistence failure cannot be silently reported as a durable completion. Preserve original task errors alongside any delivery/persistence failures.

## 20. Review Publication, Complete the Run, and Retain Useful Memory

When implementation checks/review are satisfied, freeze an immutable ChangeSet with exact file operations and report references. Present it for trusted user review; this is ready for publication, not proof that original files changed. Record approval against its exact proposal/target identity. WorkspacePublisher preflights target/context conflicts, applies only the approved operations with a journal, verifies final fingerprints, and persists a PublicationReceipt. Changed proposals or conflict resolutions require renewed checks and approval.

For this example's publication-inclusive workflow, completion requires a confirmed publication receipt as well as the implementation criteria. Rejection, conflict, expired approval scope, or partial/uncertain application has an explicit outcome; it is not reported as published. A separate build-only workflow can instead finish with an explicitly unpublished proposal. The engine persists the applicable terminal state and emits the corresponding event.

The trusted coordinator records an episode from the actual outcome:

```text
Episode:
  Task: Add Google login.
  Outcome: completed with recorded verification and review evidence.
  References: run-42, relevant artifacts, source revision.
```

A reusable discovery can be proposed separately:

```text
Semantic proposal:
  The inspected project authentication uses session cookies.
  Evidence: verified source revision and task references.

Procedural proposal:
  Check callback configuration in the authentication verification procedure.
  Evidence: failed fixture check, correction, and passing verification.
```

A validation/promotion policy decides whether each proposal becomes confirmed memory, remains unresolved, or is rejected. Neither a stronger model's assertion nor a notebook sentence automatically becomes a durable fact.

Memory writes are scoped and idempotent. An optional episode-write failure is tracked and retried independently; it does not retroactively undo the completed code task. Correction, expiry, supersession, and deletion preserve explicit lifecycle rules.

### Publication Uses Exact Reviewed Content Artifacts

Reports describe work. A publication proposal additionally needs the exact new bytes for each approved add/modify operation. ChangeSetBuilder can freeze those bytes as separate immutable artifacts:

```text
changes-42/v1:
  operation: modify auth/login.ts
    expectedBefore: baseline fingerprint for this target path
    afterContent: ArtifactRef(artifact-source-31)
  operation: add tests/auth/googleCallback.test.ts
    expectedBefore: path absent
    afterContent: ArtifactRef(artifact-source-32)
  evidence:
    verification: ArtifactRef(artifact-checks-19)
    guardReports: authorized references to current OOP/ESLint reports
```

The proposal pins required content/evidence for its review and recovery lifetime. A display name or mutable latest-report alias cannot substitute for immutable references in the approved digest.

After trusted approval and conflict preflight, the publisher reads the authorized afterContent artifacts, verifies expected digests/contracts and bounds, applies only the approved path operations, and records its journal/receipt. ArtifactStore never writes those bytes into the original workspace by itself. A deleted operation has explicit before-state/deletion semantics rather than a fake empty-content artifact.

If content/evidence changed or is unavailable, do not fetch replacement bytes under the old approval. Prepare the applicable new proposal/check/approval path. Credentials or disallowed paths must be excluded by proposal policy rather than silently redacted during application.

### Artifact Reference Map for This Example

| Produced material | Saved in | Referenced from | Later reader |
| --- | --- | --- | --- |
| Investigation report. | ArtifactStore, artifact-investigation-17. | sr-investigate-1 accepted output. | Specification executor. |
| Optional long specification document. | Separate immutable artifact if needed. | Structured specify result. | Coding/review capabilities. |
| Initial failed-check report. | ArtifactStore, artifact-checks-18. | sr-verify-1 result, tied to code-v1. | First review/fix evidence reader. |
| Corrected-source check report. | ArtifactStore, artifact-checks-19. | sr-verify-2 selected result, tied to code-v2. | Final review and proposal evidence checks. |
| OOP/ESLint reports. | Versioned guard-report artifacts. | GuardReport/guard-enforcement references. | Fix executor, review, publication preflight. |
| Frozen after-content bytes. | Pinned content artifacts such as artifact-source-31. | Immutable ChangeSet operations and approved digest. | WorkspacePublisher, after authorization/preflight. |

IDs are readable examples. Actual opaque IDs, digests, byte counts, access scope, and durability come from the adapter. The run repository stores result/metadata references, not an assumed duplicate copy of every artifact's bytes.

### State Snapshot: Approval Is Not Publication

The successful branch below assumes the latest corrected source passed the configured checks/review. changes-42/v1 is the first frozen publication proposal; earlier coding revisions were not published proposals.

| Event | WorkflowRun run-42 | StepRun / session history | Publication pub-42-v1 |
| --- | --- | --- | --- |
| Accepted corrected implementation and review saved. | active. | Latest required steps completed; prior attempts/results retained. | None yet. |
| Freeze ChangeSet changes-42/v1 with evidence references. | active. | No old step/session is reopened. | prepared. |
| Present durable proposal for user decision. | active → waiting_for_approval. | Completed coding children remain completed. | prepared → awaiting_approval. |
| Trusted user approves this digest/target. | waiting_for_approval until the coordinator schedules publication. | No model session creates or impersonates approval. | awaiting_approval → approved. |
| Publication execution starts. | waiting_for_approval → active. | Publication operation identity recorded; a workflow may model it as its own step. | approved → preflight. |
| Target, check context, and approval still valid. | active. | Journal captures intended operations. | preflight → applying. |
| Exact approved files verified and receipt durably saved. | active until parent acceptance. | Receipt is the child outcome, not model text. | applying → published. |
| Engine accepts receipt and validates plan completion. | active → completed. | All required evidence references match the approved proposal. | published, unchanged. |

This example keeps Publication as its own aggregate coordinated by the engine. An explicit publish StepDefinition can wrap that operation in a StepRun if desired; do not create a duplicate approval/state authority or leave publication out of the run's completion invariant.

### Alternative: User Requests Changes or Rejects

If the user requests changes before approval, mark the old proposal/publication superseded when a replacement is created, return the run to active for an allowed correction, and create new step/session identities for new work. After fresh checks, changes-42/v2 gets a separate publication awaiting its own approval. The old proposal is immutable.

A final rejection records publication rejected and ends or pauses the parent under the configured plan; it does not report published/completed. In this example's rejection-as-stop policy, run-42 becomes stopped with an unpublished outcome and the original remains unchanged by publication.

### Alternative: Original Files Changed After Approval

```text
Run: waiting_for_approval → active for publication → recovering
Publication pub-42-v1: awaiting_approval → approved → preflight → conflicted
Original target: conflicting user changes preserved; no blind overwrite
```

For this example, the engine uses recovering while resolving the publication conflict; this is a valid policy choice, not a mandatory universal status for every conflict. Resolution produces changes-42/v2 with fresh applicable checks. pub-42-v1 remains historical, pub-42-v2 is prepared/awaiting_approval, and run-42 returns to waiting_for_approval after the new review bundle is ready. Approval for v1 does not cover v2.

### Alternative: Partial Application or Cancellation During Publish

```text
Publication: applying → partial/uncertain → reconciling
Run: active → recovering; never completed from the approval alone
Journal: applied, unapplied, and unknown operations retained by stable ID
```

Only after the receipt/journal and target fingerprints establish actual effects can recovery record a confirmed published outcome or an honest unresolved/failed/rolled-back result under the provider's lifecycle. Never restore a before-state over later user edits. A cancellation request stops new operations where possible; it does not prove applied writes were undone.

### Combined State Timeline for the Accepted Path

```text
Workflow definition: immutable implement-feature/v1 throughout

Run run-42:
  created → queued → active
                    [investigate, specify, implement, verify, review, bounded fixes]
          → waiting_for_approval → active (publication) → completed

Each successful StepRun:
  pending → active → completed
  Verification's completed result can still say checksPassed=false.
  Fixes create new StepRun IDs rather than reopening completed ones.

Each agentic session:
  created → active [model/tool/notebook phases] → completed
  Escalation creates a new linked session with the selected model.

Publication pub-42-v1:
  prepared → awaiting_approval → approved → preflight → applying → published
```

The definitions remain reusable, while every run, step execution, session, and publication retains its own identities, lifecycle, and durability requirements. Optional memory-recording work after confirmed publication does not retroactively make the published task incomplete.

## 21. A Later Task Uses the Same Agent's Experience

The user later requests “Add password reset.”

The agent identity and authorized memory scope can remain the same. The framework creates a new WorkflowRun and fresh sessions. It may reuse the immutable FeatureWorkflow and executor capabilities, while isolating all new working state.

The new task can retrieve relevant project facts and procedures plus prior episodes. It does not inherit run-42's entire conversation or writable notebooks. Source evidence is checked for freshness; changed authentication architecture can supersede stale memory.

This is how agent continuity works across tasks without mixing workflow results, model context, or session state.

## 22. What a User Sees Versus What the Framework Records

A human-facing progress projection can stay simple:

```text
Add Google login

✓ Investigate the existing code
✓ Prepare a specification
✓ Implement the change
✓ Run the checks
✓ Evaluate the result against the specification

✓ Review and approve the exact proposal
✓ Publish approved file changes

Completed with verification evidence and a confirmed publication receipt.
```

During execution it can show the original intermediate state:

```text
✓ Investigate the existing code
✓ Prepare a specification
● Implement the change
○ Run the checks
○ Evaluate the result against the specification
```

The framework retains richer state behind that projection: step executions, attempts, sessions, selected models, memory references, decisions, artifacts, checks, usage, and events. A standalone CLI/formatter can produce this output; no existing application UI change is required.

### Show Waiting and Recovery Honestly

After coding/checks but before approval, the user projection can show:

```text
✓ Investigate / specify / implement / verify / review
● Awaiting your approval for changes-42/v1
○ Publish approved file changes

Run: waiting_for_approval
Publication: awaiting_approval
Original target: not yet updated by publication
```

During conflict/partial recovery, show the relevant recovering/conflicted/uncertain outcome and what is known about applied operations. Do not display a generic completed message merely because all coding step names have checkmarks.

## 23. How to Build and Verify This Standalone Example

1. Construct a fixture workspace and isolated durable stores inside the example's own data location.
2. Register scripted fake model responses, fake decision providers, and controlled tools through the same interfaces real adapters implement.
3. Assemble definitions, executors, model routing, unit/session factories, memory, budgets, and recorders through composition.
4. Execute a success path and assert actual saved step results, checks, final state, memory proposals, and correlated events.
5. Exercise a failed verification followed by a fix and a model escalation, preserving earlier outcomes and total usage.
6. Interrupt after a checkpoint and restart from durable state, including a test of an uncertain side-effect outcome.
7. Run a second task to demonstrate permitted durable-memory retrieval with isolated notebooks.
8. Swap the configured decision adapter between compatible fakes and verify that workflow code does not change.
9. Verify rejection of invalid tools/output, budget exhaustion, cancellation, stale memory, concurrent session isolation, and debug sanitization.
10. Export a readable timeline and JSONL with stable correlation and decision reasons.
11. Assert the parent/child state snapshots: completed session before parent persistence, completed verification with failed checks, separate fix StepRuns, and non-completed run while approval is pending.
12. Exercise rejection, proposal-version changes, original-target conflicts, duplicate approval, and partial-publication recovery; require a confirmed matching receipt before publication-inclusive completion.
13. Assert the artifact chain: investigation write → saved step reference → specification read, and verification write → selected-result reference → runtime-validated review read.
14. Test immutable new reports after fixes, scoped upstream access, bounded reads, byte/schema integrity, idempotency conflicts, orphan/pinned artifact recovery, and publication using exact approved content rather than mutable files.

Fake models make orchestration deterministic; passing those tests is not proof that a real model produces correct authentication code. Quality evaluation with actual adapters and representative tasks is a separate concern from contract/orchestration verification.

## 24. Reading Map

| Question | Detailed document |
| --- | --- |
| What are the objects? | [Core Concepts](01-core-concepts.md) |
| Where do state machines live and coordinate? | [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md) |
| Where do implementation files belong? | [File Organization](02-location-and-file-organization.md) |
| What does an executor look like? | [Executors and Contracts](03-executors-and-contracts.md) |
| How is the plan defined? | [Workflow Definition and Engine](04-workflow-definition-and-engine.md) |
| How do retries and restoration work? | [Recovery, Memory, and Context Handoff](05-recovery-and-memory.md) |
| What must the first implementation deliver? | [First-Version Scope](07-first-version-scope.md) |
| Which OOP rules apply? | [OOP Architecture](08-oop-architecture-and-design-rules.md) |
| What is the step class in code? | [Concepts Explained with Examples](09-core-concepts-explained-with-example.md) |
| What are StepRunner and contexts? | [StepRunner and Contexts](10-step-runner-and-contexts.md) |
| Where are reports saved and how are they read? | [ArtifactStore](23-artifact-store-and-produced-materials.md) |
| How do we debug a run? | [Debug Events and Run Tracing](11-debug-events-and-run-tracing.md) |
| Where is the model/tool loop? | [AgenticMindUnit](12-agentic-mind-unit.md) |
| What does the agent remember? | [Agent Memory](13-agent-memory.md) |
| Where are run/token/tool/storage limits enforced? | [Limits and Budgets](18-limits-budgets-and-execution-control.md) |
| How do models cooperate and escalate? | [Model Routing](14-model-routing-and-escalation.md) |
| How are changes isolated and published after approval? | [Workspaces and Approved Publication](21-isolated-workspaces-review-and-publication.md) |
| How are guard skills and rule checks selected? | [Guards and System 1 Selection](20-guards-skills-rules-and-system-one-selection.md) |
| How does System 1 stay provider-neutral? | [DecisionUnit](15-system-one-decision-unit.md) |
| Why separate steps from executors? | [Why Steps and Executors Are Separate](16-why-steps-and-executors-are-separate.md) |

## One Policy Convention Throughout the Walkthrough

Every configurable selection in this story implements Policy<TInput, TOutput> and uses await apply(input). The workflow's input policies prepare executor assignments. The unit's context/completion policies prepare model views and evaluate proposed completion. Routing, guard, retry, recovery, and transition policies return typed choices to their owning coordinators. No separate mapper interface or input callback is needed. The runtime still validates actual evidence, limits, accepted dependencies, lifecycle transitions, and exact trusted publication approval.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
