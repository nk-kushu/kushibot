# Sub-Agents: A Model Can Spawn Another AgenticMindUnit

Imagine the planning model is preparing Google login. Before it can finish the specification, it needs to understand session handling and existing authentication tests. It can request a focused investigation instead of doing every action inside its own conversation.

**Kushibot must support sub-agents as a framework capability.** Individual parents receive the spawnSubAgent tool only when enabled by trusted configuration. A supervising model describes a child's purpose and expected result. The framework validates the assignment and constructs a configured AgenticMindUnit using registered models, tools, and contracts.

This is proposed framework behavior. The class names and API sketches are not implemented exports. The model requests a sub-agent; it does not generate executable class code or install new capabilities.

## Describe the Sub-Agent Assignment

The supervising session can receive a tool named spawnSubAgent. It might call that tool with:

```json
{
  "purpose": "Investigate existing session handling",
  "goal": "Explain how sessions are created and validated",
  "completionCriteria": [
    "Identify the relevant files",
    "Support findings with source references",
    "List unresolved questions explicitly"
  ],
  "toolSet": "workspace-read-only",
  "modelRole": "investigation",
  "resultContract": "investigation-findings/v1",
  "maxIterations": 6
}
```

The names workspace-read-only and investigation-findings/v1 refer to trusted registrations. They are not instructions to create arbitrary tools or execute a model-written schema implementation. The framework supplies the parent's authorized workspace, agent/project identity, applicable guard instructions, evidence references, and remaining limits.

The child assignment must stay within the parent's permitted scope. A planning model cannot grant write access merely by choosing another tool-set name, change the user goal, or authorize publication. Requested limits can narrow the remaining allowance, not enlarge it.

## Let the Framework Construct the Unit

A SubAgentCoordinator receives the tool request and applies SubAgentPolicy. It validates input, allowed capabilities, depth, remaining budget, and the expected result contract. It records a stable sub-agent identity before starting child work.

AgenticUnitFactory then resolves the requested capabilities. ModelRouter selects an eligible model for investigation, ToolRegistry supplies the allowed read/search tools, and the registered ResultContract defines valid output. The factory assembles the existing AgenticMindUnit implementation with these collaborators.

```text
Supervisor requests spawnSubAgent
               ↓
SubAgentCoordinator validates and records the request
               ↓
AgenticUnitFactory resolves permitted models, tools and result contract
               ↓
Child AgenticMindUnit starts an isolated AgenticSession
               ↓
Validated child outcome returns as the parent's tool observation
```

Dynamic creation means assembling a new assignment and session from existing implementations. It does not mean inventing a new class implementation at runtime. AgenticMindUnitRunner still owns the same reusable model/tool loop.

## Give the Child Its Own Working State

The child gets a new session ID, notebook, conversation protocol, counters, and operation records. Its assignment includes the task-specific goal and completion criteria. It receives selected context references, rather than unrestricted writable access to the parent's full conversation or run.

For session handling, its tools search the working workspace, read relevant files, and record concise findings. The original user workspace stays outside those editing capabilities. A read-only child can inspect a fixed source snapshot while the parent awaits its answer.

The child may retrieve permitted agent memory through a scoped view. It does not mutate another session's notebook or automatically promote its observations into long-term facts. Memory proposals continue through the framework's normal validation policy.

Editing children are possible only when explicitly enabled. Their assignments must define permitted paths and source expectations. The first version can execute them sequentially in the run's working workspace; concurrent edits require separate isolation or explicit coordination. Using sub-agents does not itself solve file conflicts.

## Return a Result the Parent Can Use

The investigation child may return:

```text
Outcome completed
Summary login creates a session cookie through the session service
Sources inspected authentication and session files at revision code-r0
Open questions none for the bounded assignment
Report ArtifactRef(child-session-report-1)
```

The coordinator validates the completed output against the registered runtime contract, saves its outcome/reference, and delivers a bounded observation to the parent. ArtifactStore holds the full report; the parent reads it through authorized access if more detail is needed.

Because the result contract was chosen dynamically by ID, the dispatcher must validate it at runtime. A model-provided name does not magically provide a compile-time TypeScript type for arbitrary data.

A failed, cancelled, stopped, or interrupted child returns an explicit outcome with reason and available evidence. It does not become an empty successful report. The parent can continue with known uncertainty, request another bounded assignment if permitted, or stop under policy. Child success does not prove that the parent workflow step or user task is complete.

## Keep Sub-Agents Inside the Existing Architecture

A workflow step still selects an executor. That executor can start a supervising AgenticMindUnit whose tool registry includes spawnSubAgent. The supervisor can ask for focused child units while pursuing its assignment, then produce the executor's declared final result.

```text
WorkflowRun → StepRun → executor
                         ↓
                Supervising AgenticSession
                         ↓ spawnSubAgent
                Child AgenticSession
                         ↓ outcome and evidence
                Supervisor continues
                         ↓ final validated result
                Executor returns its typed step output
```

The child is not automatically a new workflow step, a new agent identity, or a nested workflow. It is a sub-agent unit/session linked to the parent. WorkflowEngine still accepts and persists the step result before selecting the next declared transition.

The parent session remains active while awaiting a sub-agent observation; its current phase/pending-operation state records that wait. Child lifecycle and outcomes are separate. Parent completion requires its own result/criteria, not merely the existence of a completed child.

## Bound Sub-Agents and Recover Them Safely

The parent and all children consume the same applicable run/agent usage ledger. Model calls, tools, retries, and routing decisions remain charged. Child iterations are locally bounded, and each descendant inherits the stricter applicable deadline and permissions.

Limit child count, sub-agent nesting depth, concurrent children, request/context size, returned report size, and repeated sub-agent requests without progress. The initial demonstration can run one child at a time and deny spawning nested sub-agents unless explicitly granted. Creating more children must not be a route around a session cap or workflow fix limit.

Do not hold a model-call execution slot while waiting for a child that needs that same capacity. The scheduler handles parent waiting and child admission explicitly, with bounded waits and no database transaction held across the child execution. Parallel sub-agent execution is a separate extension rather than an assumption of this sequential design.

Persist sub-agent ID, parent/child session IDs, assignment/contract versions, selected model/tools, pending/completed outcome, source references, and budget state. A duplicate spawnSubAgent delivery uses the same operation identity instead of starting a second child.

After a crash, reconcile the existing child and deliver its stored outcome once. Do not blindly recreate it, especially if tools may have written files. Parent cancellation propagates to active children, but terminal reporting waits for the applicable effect-reconciliation rules. A child's own failure does not automatically cancel unrelated work without an explicit policy.

## Assemble the Capability with Objects

The proposed composition can look like this:

```typescript
const units = new AgenticUnitFactory({
  models: modelRouter,
  toolSets,
  resultContracts,
  sessions,
});

const subAgents = new SubAgentCoordinator({
  units,
  policy: new BoundedSubAgentPolicy({
    maxDepth: 1,
    maxChildrenPerSession: 3,
  }),
  store: subAgentStore,
});

parentTools.register("spawnSubAgent", new SpawnSubAgentTool(subAgents));
```

These are illustrative constructor contracts; the host supplies the named collaborators. Scoped execution context supplies identity, the shared budget, cancellation, and debug capabilities for each operation. The factory/coordinator use injected interfaces rather than global state or a growing switch on child purpose/provider.

Provide sub-agent support in the framework and make each parent's access configurable. A unit without spawnSubAgent remains valid. Trusted application code may use the same coordinator directly. The first standalone example uses deterministic fake models and read-only tools, with a durable sub-agent storage adapter to demonstrate restart handling.

## Make Sub-Agents Visible in the Timeline

Record requested, accepted/rejected, started, completed/failed/stopped, cancellation, and recovery events with parent/child/sub-agent identities. Include safe assignment summaries, selected models/tools, contract versions, source/evidence references, policy reasons, usage, and duration.

A developer should be able to follow the parent span into the child and see exactly which child outcome informed the next parent model call. Preserve tool-call/result pairing, avoid private reasoning capture, and use the existing redaction and logging controls. KUSHIBOT_LOG_ENABLED and KUSHIBOT_LOG_LEVEL govern optional diagnostics; durable execution/usage/sub-agent records keep their required semantics.

Provider prompt caching can reuse supported input computation during bounded child model calls. Each request still goes to the provider and generates a new response. Cache usage never proves a sub-agent task or file action executed; current evidence, scope, validation, and side-effect rules still apply.

## Follow the Google-Login Example

Here is one complete walkthrough. The file names, IDs, limits, and findings below are illustrative; they describe how the proposed framework would work, not an execution that has already happened.

### Step 1: The User Gives the Agent a Goal

The user asks:

> Add Google login, preserve password login, and reject expired OAuth callback state. Prepare the specification before implementation. Do not publish changes.

WorkflowEngine creates WorkflowRun `run-42` and starts its specification StepRun `step-spec-1`. The specification executor receives that assignment and starts the supervising AgenticMindUnit session `parent-plan-1`.

The host supplies the working source snapshot `code-r0`, applicable guard instructions, permitted tools, result contract, cancellation signal, and shared budget. The supervisor can inspect source and request read-only children. It cannot edit or publish during this specification assignment.

### Step 2: The Supervisor Identifies a Focused Question

AgentContextComposer prepares the parent's request from the assignment, rules, selected context, and current observations. The model sees that it needs to understand existing session handling before it can specify Google login correctly.

Instead of guessing, it returns a spawnSubAgent tool call:

```json
{
  "purpose": "Investigate session handling for Google login planning",
  "goal": "Identify how password login creates a session and how requests validate it at code-r0",
  "completionCriteria": [
    "Identify the session creation and validation paths",
    "Cite inspected source locations",
    "List constraints Google login must preserve",
    "List unresolved questions"
  ],
  "toolSet": "workspace-read-only",
  "modelRole": "investigation",
  "resultContract": "investigation-findings/v1",
  "maxIterations": 6
}
```

This is a request for help. The model has not created a child, selected an arbitrary provider, or granted permissions. The trusted tool context supplies the actual workspace and snapshot identity; writing `code-r0` in the goal cannot redirect access to another workspace.

### Step 3: The Framework Checks Whether the Request Is Allowed

SpawnSubAgentTool passes the validated request and trusted execution context to SubAgentCoordinator. SubAgentPolicy checks:

- The registered read-only tool set and result contract exist and are allowed.
- The assignment belongs to the parent's project and authorized source scope.
- The requested child fits the depth, child-count, concurrency, deadline, and remaining budget limits.
- The requested investigation profile can be resolved under the parent's model restrictions.

For this example, the host permits at most three children, one active child at a time, and no grandchildren. The six requested iterations are a local maximum, not six free calls outside the run budget.

If a check fails, the parent receives an explicit rejected outcome with a safe reason. No child starts. If accepted, the coordinator records sub-agent `sub-agent-1`, linked to the parent's tool-operation identity, before dispatching work.

### Step 4: Existing Objects Are Assembled Into a Child

AgenticUnitFactory asks ModelRouter to resolve an eligible investigation model. ToolRegistry supplies only the allowed source-search and source-read tools. The result-contract registry supplies the runtime validator for `investigation-findings/v1`.

The factory creates child session `child-session-1` using the existing AgenticMindUnit implementation. Its assignment contains the bounded question, completion criteria, authorized source references, and inherited constraints.

The child has its own conversation, DraftNotebook, counters, and operation records. It does not receive writable access to the parent's notebook. The example uses the same fixed source snapshot for both sessions, so evidence cannot quietly change while the child investigates.

### Step 5: The Parent Waits and the Child Investigates

The parent records that its spawnSubAgent operation is pending. Its model call has finished, so its model-call capacity is released before the child needs that capacity. No database transaction stays open throughout the investigation.

The child now runs its own bounded model/tool loop. An illustrative sequence is:

1. Search the authorized source for session creation and validation.
2. Read `auth/passwordLogin.ts` and find a call to `SessionService.create`.
3. Read `sessions/SessionService.ts` and identify session expiry behavior.
4. Read `auth/requireSession.ts` and identify how protected requests validate sessions.
5. Record concise findings and source locations in its own notebook.
6. Return a final investigation report before exceeding its limits.

Each model/tool operation checks the applicable cancellation, permissions, deadline, and usage limits. The maximum iteration count is a ceiling; the child can finish earlier.

### Step 6: The Child Report Is Validated and Delivered

Suppose the child reports that password login creates the existing session cookie, protected routes validate that session, and Google login should reuse the same session service after successful OAuth validation.

The framework checks the result shape and required source references against the registered contract. Contract validation establishes that the report meets its required structure; it does not independently prove every technical conclusion. Missing evidence remains visible and can require further inspection.

ArtifactStore saves the full report. The coordinator records the completed child outcome and sends a bounded tool observation back to the parent, for example:

```text
Sub-agent: sub-agent-1
Child session: child-session-1
Outcome: completed
Source snapshot: code-r0
Summary: Password login creates sessions through SessionService.
         Google login should reuse this path after OAuth validation.
Evidence: authorized source references in the saved report
Open questions: OAuth callback-state handling needs separate investigation
Report: ArtifactRef(session-investigation-1)
```

The parent can read the full report through permitted artifact access. A completed child means this bounded investigation finished; it does not mean Google login has been implemented.

### Step 7: The Supervisor Requests the Next Investigation

The parent's next model request includes the paired spawnSubAgent observation. It now knows how sessions work but still needs evidence about authentication tests and OAuth state.

It requests a second read-only child with a separate assignment: inspect existing password-login tests, locate callback-state behavior if present, and identify the tests needed for Google login. The framework repeats validation and construction under sub-agent `sub-agent-2` and a new isolated child session.

This child might find password-login regression tests but no OAuth callback-state implementation. It reports that absence explicitly rather than inventing behavior. Its proposed test cases include valid state, expired state, invalid state, and preservation of password login.

The two investigations execute sequentially. The second receives only selected permitted references from the first report when useful, not the first child's mutable notebook.

### Step 8: The Parent Produces the Specification

The supervisor combines both accepted reports with the original assignment and mandatory rules. Its specification can now state:

- Validate OAuth callback state, including expiry, before creating a session.
- Reuse the existing session service after successful Google authentication.
- Preserve the password-login path and its regression coverage.
- Add callback-state tests and define failure behavior.
- Leave publication outside the current assignment.

The parent returns its own final result. Its completion policy checks the specification's required sections, evidence, and unresolved questions. The specification executor maps that accepted outcome into its declared step-output contract. WorkflowEngine accepts and persists the result before following the next declared transition.

The workflow still has one specification step. The child investigations are linked sessions inside that step, not extra workflow steps invented by the model. Coding and actual test execution happen later through their configured executors and policies.

### Step 9: Usage and Caching Stay Attached to Real Work

The run ledger includes the supervisor's calls, both children's calls, routing work, and permitted tool usage. Each child has local limits, but all consumption remains under the shared parent/run limits.

Provider prompt caching may reuse supported input computation on compatible stable instructions. Every child model request makes its own provider call and generates a new answer, including independent reviews. The framework does not reuse saved answers. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

Provider prompt caching does not complete a sub-agent or execute its tools. The coordinator still owns the child's lifecycle and outcome delivery. Tests must actually run, and publication still requires the normal authorization.

### Step 10: An Interruption Does Not Start the Child Twice

Suppose the process stops after `child-session-1` finishes but before its report reaches the supervisor.

On recovery, the framework restores the pending parent tool operation and looks up `sub-agent-1`. It finds the saved completed child outcome, restores the required tool-call/result pairing, and delivers that outcome without launching another investigation. Durable delivery bookkeeping prevents a duplicate tool observation in the parent's conversation.

If the child was still running or a tool effect was uncertain, the framework reconciles that state before deciding whether to resume. If the user cancels the parent, active children receive cancellation and their outcomes remain explicit. A failure or exhausted allowance returns available evidence and a reason, rather than a fabricated successful report.

The practical result is that the planning agent can ask focused helpers for evidence while the framework controls construction, permissions, execution, accounting, and recovery.

Place sub-agent contracts, coordinator, policy, factory, and scoped tool adapter in a cohesive agentic/sub-agents/ module. Reuse session factories, registries, stores, artifacts, budgets, and events instead of duplicating them. Export supported interfaces through index.ts.

Verify bounded success/failure, invalid requests, forbidden tools, unknown result contracts, isolated notebooks, shared usage, depth/child caps, duplicate calls, cancellation, recovery, and parent observation delivery. The architecture should let the supervisor request useful help while the framework remains responsible for controlled construction and actual execution.

[AgenticMindUnit](12-agentic-mind-unit.md) · [Routing](19-hierarchical-task-aware-model-routing.md) · [Limits](18-limits-budgets-and-execution-control.md) · [State Machines](22-state-machines-and-coordinated-lifecycles.md) · ## Construct Child Requests for Provider Prompt Caching

Child request composers and provider adapters must preserve stable ordering and representation of authorized shared instructions and tool contracts across compatible child calls. Child-specific assignments and evidence remain current and separately scoped. Stable structure enables provider caching; it never justifies giving a child extra context, merging separate requests, or assuming a cache hit.

[Back to table of contents](harness-workflows-executors-framework-idea.md)

## SubAgentPolicy Uses the Shared Policy

BoundedSubAgentPolicy implements Policy<SubAgentPolicyInput, SubAgentDecision>. SubAgentPolicy describes its role, not a competing interface. SubAgentCoordinator awaits policy.apply(input) with the validated request, trusted capability registry, parent allowances, depth, and required result contract. It checks the returned assignment against runtime constraints, records identity, and constructs the child through the existing factory. The policy neither starts the child nor expands its tools or budgets; sessions and durable delivery remain coordinator responsibilities.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

