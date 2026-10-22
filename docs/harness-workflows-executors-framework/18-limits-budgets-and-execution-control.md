# Limits, Budgets, and Execution Control

## 1. Why the Framework Needs This

An agent can keep calling a model, searching files, retrying a failing check, writing notes, or revisiting a workflow step without producing useful progress. A token cap alone does not control those other resources.

The framework needs explicit limits at every resource boundary and a shared, durable accounting mechanism. Limits must be enforced by framework code and adapters, not only written into the model's prompt. This is a first-version standalone capability, implemented through cohesive OOP objects and interchangeable policies.

For “Add Google login,” a run budget might permit several planning/coding/review sessions while restricting total calls, input/output tokens, elapsed time, fixes, tool work, and stored output. Every child session consumes from that same parent budget.

All numeric examples in this document are illustrative configuration, not recommended production defaults or model/provider specifications. Choose actual limits from representative workloads and measured usage.

## 2. Different Kinds of Limits

| Kind | Meaning | Example |
| --- | --- | --- |
| Consumable budget | A resource balance consumed across operations. | Total tokens or tool calls for one run. |
| Structural cap | Maximum size/depth/count at a boundary. | Tool-response bytes, notebook entries, evidence candidates. |
| Deadline / timeout | Time after which work is no longer allowed to proceed normally. | Run expiry, model request timeout, verification-process timeout. |
| Concurrency / rate limit | How much work can be active or start in a time window. | Two active runs per agent; provider calls per interval. |
| Warning threshold | Early signal that a limit is approaching. | Emit a warning at a configured budget fraction. |
| Progress guard | Detects repeated work without useful change. | Repeated equivalent tool requests or failed fixes. |
| Retention / storage quota | Bound on retained data and its lifetime. | Artifact bytes and episode retention. |

An enforced cap prevents new work/reservations beyond a bound the framework can measure. It cannot guarantee exact billed cost when a provider has unknown usage or ignores cancellation. Record that limitation explicitly instead of presenting estimates as exact accounting.

A warning is not permission to exceed a hard cap. A rate limiter is not a total-spend ledger. A context-window check is not the same as a run's aggregate token budget.

## 3. Scope Hierarchy and Ownership

```text
Host / tenant or deployment resource constraints
  → Agent / project admission, rate, and quota scope
    → WorkflowRun budget + absolute deadline
      → StepRun execution and retry limits
        → AgenticSession / DecisionUnit evaluation limits
          → Model call / tool call limits
```

The outer scopes can be supplied by the host application through injected admission/quota interfaces. Standalone examples use deterministic local implementations. The framework must not claim to enforce an external provider's complete account-wide quota unless that shared state is actually available.

Agent-level usage can also cover direct units that have no workflow. A standalone AgenticMindUnit or DecisionUnit gets an explicit execution-budget scope and root trace; it does not require a fake WorkflowRun to enforce limits.

Children can narrow permissions/limits, not enlarge their parent. At admission, validate impossible configurations and resolve inherited defaults into an immutable, versioned limit snapshot. Omitted means inherit a documented default; unlimited must be an explicit supported setting rather than an accidental missing value. Reject negative, non-finite, malformed, or inconsistent values with boundary validation.

## 4. Where Limits Belong

| Boundary | Important limits | Enforcing owner / behavior |
| --- | --- | --- |
| Run admission | Active/queued runs, queue age, request size, scoped rate/quota. | Admission controller reserves capacity before creating active work; releases leases on terminal/reconciled state. |
| WorkflowRun | Aggregate model calls, input/output tokens, tool calls, total time, fix cycles, escalation count. | Run ledger + engine + policies; every session and decision consumes the same allowance. |
| StepRun / StepRunner | Technical attempts, cumulative retry delay, execution timeout, repeated equivalent failures. | Step execution/retry policies; no nested unbounded retry chains. |
| AgenticSession | Iterations, model/tool calls, tokens, elapsed time, validation retries, no-progress repetitions. | AgenticMindUnitRunner checks before each action and reconciles usage afterward. |
| Individual model call | Input/context size, requested output cap, timeout, retries, tool-call batch size. | Context composer, gateway adapter, budget reservation, provider request limits. |
| DecisionUnit | Evidence/question/candidate sizes, batch questions, call time/output, retry count. | Decision contract/provider boundary; bounded fallback rather than recursive retries. |
| Tool call | Invocation count, duration, arguments/response bytes, file/read/write scope, generated output, concurrent calls. | ToolDispatcher and concrete capability adapter enforce sizes, paths, and cancellation/process control. |
| Verification | Process runtime, output bytes, allowed checks, parallel processes, retry count. | Verification capability controls processes and records real outcomes. |
| Notebook / model context | Note entries/bytes/tokens, observation history, compaction work, context allocation. | DraftNotebook + AgentContextComposer keep bounded task memory without dropping authoritative goals. |
| Memory retrieval | Query count/time, top-k results, scanned/returned bytes, token allocation. | Scoped memory retrieval and composer; authorization filters remain mandatory. |
| Memory writes/storage | Proposal count/size, durable writes, per-scope quota, retention, index work. | Memory policies/storage boundary; no unlimited “save everything” behavior. |
| Artifacts/checkpoints | Per-object and total bytes, frequency, revision count, retention. | Storage adapters and checkpoint policy; fail visibly if required recovery state cannot be saved. |
| Debug events/delivery | Payload bytes, verbose event rate, subscriber queue length, export size. | Sanitizer/store/delivery policies; preserve required lifecycle durability and report verbose drops. |
| Recovery | Restore attempts, state size/version, uncertain operations, remaining deadline/budget. | Recovery coordinator reconciles durable state without resetting consumed allowances. |

Filesystem/network permissions are hard capability boundaries, not merely resource budgets. A generous tool-call limit cannot authorize an out-of-scope file write. A token limit cannot replace input validation or access control.

## 5. Token Budgets: What Counts?

### Per-Call Context Capacity

A model can accept only a bounded context. Check the complete request: system/assignment instructions, tool schemas, selected memories, notebook, conversation, observations, and the provider's required output reservation/overhead.

`AgentContextComposer` works from a profile's validated capabilities. The adapter applies the provider's actual accounting rules; do not assume one universal context formula or tokenizer. When possible, count with a compatible tokenizer and include documented safety margin for estimation. Reserve room for output before submitting a call.

If context does not fit, select less relevant material, reference artifacts, or compact bounded history. Never silently remove permissions, the authoritative assignment, unresolved side effects, or required evidence. If no valid request fits, return a clear context-limit outcome.

### Aggregate Run Tokens

Run consumption includes repeated input sent on each call, model output, decision calls, and retries where usage was incurred. A 5,000-token prompt sent ten times can consume roughly 50,000 input tokens before output, depending on provider accounting. A small current conversation does not imply low cumulative usage.

Track provider-reported input/output categories and any additional billed categories separately. Cached tokens may have different costs but still have a provider-specific usage meaning. Do not ignore reasoning/other metered tokens when the provider reports them, and do not store private reasoning traces just to account for usage.

A selected stronger model and an economical model may have different prices for identical token counts. The ledger records actual identity, usage categories, estimates, and price-source/version when cost estimation is enabled. Token consumption is not the same as an exact currency invoice.

### Unknown Usage

A timeout after submission can leave unknown provider usage. Mark the charge as pending/unknown, retain an appropriate reservation, and reconcile through available request IDs or a conservative documented policy. Do not charge zero by default or reset the balance on retry.

## 6. Proposed Configuration Example

```typescript
const limits = {
  run: {
    maxModelCalls: 60,
    maxInputTokens: 120_000,
    maxOutputTokens: 24_000,
    maxToolCalls: 100,
    maxFixCycles: 3,
    maxEscalations: 2,
    maxElapsedMs: 20 * 60_000,
  },
  step: {
    maxAttempts: 3,                 // Includes the initial attempt.
    maxElapsedMs: 6 * 60_000,
  },
  session: {
    maxIterations: 12,
    maxModelCalls: 12,
    maxToolCalls: 20,
    maxOutputTokens: 6_000,         // Across this entire session.
    maxNoProgressCycles: 3,
  },
  modelCall: {
    maxOutputTokens: 2_000,         // For one call, subject to remaining budget.
    timeoutMs: 45_000,
  },
  toolCall: {
    timeoutMs: 15_000,
    maxResultBytes: 64 * 1024,
  },
  memoryRead: {
    maxQueriesPerSession: 8,
    maxEntriesPerQuery: 8,
    maxContextTokens: 4_000,
  },
};
```

This is a naming/ownership sketch, not a complete runtime schema. Separate policies also configure provider retry rates, input/context capacity, monetary estimates if used, artifact/debug storage, and memory-write quotas. Child maxima are upper bounds within parent remaining capacity, not promised allocations. Definitions of iteration, attempt, call, and fix cycle must be stable and tested.

For the sequential first version, a fixed parent allowance with dynamic per-call reservations is sufficient. Even sequential orchestration needs a safe reservation contract because asynchronous calls, decision requests, and multiple runs can share a scoped quota.

## 7. OOP Objects and Contracts

| Object | Responsibility |
| --- | --- |
| `LimitConfiguration` / validated limit value objects | Immutable units, defaults, scope, and versioned configuration. |
| `ExecutionLimitPolicy` | Composes applicable limits and returns typed permit/warn/stop decisions with reasons. |
| `RunUsageBudget` | Existing public run-wide budget capability; delegates durable accounting rather than duplicating counters. |
| `UsageLedger` | Atomically records reservations, known usage, pending unknown charges, and reconciliation. |
| `BudgetReservation` | Stable operation-scoped allocation with idempotent settlement/release semantics. |
| `ExecutionDeadline` | Persisted expiry plus runtime remaining-time checks through an injected clock. |
| `AdmissionController` / `ConcurrencyLimiter` | Acquires/releases scoped capacity and bounds queues. |
| `RateLimiter` | Enforces provider/tool request-start limits with bounded waiting. |
| `ProgressGuard` | Detects repeated no-progress observations under an explicit policy. |
| `LimitOutcome` | Identifies scope, dimension, configured bound, usage/reservation, reason, and resumability. |

Keep contracts small. Select real policy variants through registries/composition rather than growing behavior-selecting switches for every provider, role, or limit type. Model adapters, tools, and storage adapters enforce their own concrete resource boundaries behind these interfaces.

A budget contract sketch:

```typescript
interface UsageBudget {
  reserve(request: UsageReservationRequest): Promise<BudgetReservation>;
  snapshot(): Promise<UsageBudgetSnapshot>;
}

interface BudgetReservation {
  readonly id: string;
  settle(usage: MeasuredUsage): Promise<void>;
  releaseBeforeDispatch(): Promise<void>;
  markUsageUnknown(reference: PendingUsageReference): Promise<void>;
}
```

Supporting types are validated framework contracts. Releasing a reservation is valid only when dispatch did not consume resources; it is not a way to erase usage after a timeout. The implementation protects transitions and makes repeated settlement/reconciliation idempotent. Keep class-owned helpers private and inject clock, ID generator, repository, and adapters.

## 8. Reservation and Enforcement Lifecycle

1. Validate the operation and resolve applicable parent/child limits.
2. Check cancellation/deadlines and whether required input/tool permissions fit.
3. Atomically reserve the intended call/tool count and bounded resource estimate across relevant scopes. Partial multi-scope reservation failure rolls back undispatched reservations.
4. Acquire concurrency/rate capacity using bounded waiting. Do not hold a database transaction open while waiting or invoking a model.
5. Before dispatch, recheck expiry and cancellation; release undispatched capacity if no call is made.
6. Send enforceable limits through the adapter, such as provider output caps or process timeouts/output bounds.
7. Settle measured usage; retain unknown charges for reconciliation. Do not count the same operation again after duplicate completion delivery.
8. Release concurrency leases, persist decisions/state, and emit bounded events.

The durable reservation condition is conceptually `known usage + outstanding reservations + new reservation <= cap` in each applicable dimension. Settling replaces a reservation with measured usage; it does not add both permanently. Conservative reservations and provider enforcement reduce overshoot, but unexpectedly larger reported usage must be recorded truthfully, raise a visible breach, and block more work rather than clipping the ledger to the cap.

Infrastructure leases can expire to recover abandoned concurrency slots; expiry does not prove a remote request stopped and must not erase its token/cost reservation. Track uncertain operations separately.

## 9. Timeouts, Deadlines, and Pause Semantics

A run can have an absolute wall-clock deadline and an active-runtime allowance. They are different settings. By default, an absolute deadline continues to expire while paused, queued after admission, or restarted. If active-runtime accounting is supported, persist accumulated active time and define which waiting states count.

A call timeout is bounded by its own timeout and the remaining parent deadline. Retry backoff and rate-limit waiting count against elapsed time. Use monotonic timing for duration inside a process and a persisted wall-clock expiry for cross-process restoration. Handle clock changes conservatively; never compare unrelated process-local monotonic counters.

Cancellation is cooperative. Pass signals into tools/providers and support process termination where the capability permits it. Returning a timeout does not prove an external operation ceased. Record uncertainty and reconcile before repeating side-effecting actions.

Keep a small, separately bounded housekeeping allowance to record terminal state, persist minimum recovery data, and release leases after the task budget is exhausted. That allowance cannot fund another planning/coding attempt. If required persistence fails, report the durability failure rather than claiming a safely saved result.

## 10. Retry, Fix, and Escalation Limits

A workflow fix cycle, StepRun retry, model transport retry, output-validation correction, and unit iteration are distinct. Independent local retry loops can multiply calls dramatically.

Document one owner for each retry layer. Provider SDK retries must be disabled or explicitly coordinated/accounted for through the adapter. Every dispatched underlying request consumes the shared call/usage budget when measurable, even if a higher-level invocation is called one attempt.

Use capped backoff and total retry-delay limits; honor cancellation/deadlines while waiting. Invalid arguments, exhausted budgets, or deterministic policy rejection do not become retryable simply because a retry counter remains.

`ProgressGuard` can compare safe normalized observations, repeated tool arguments, unresolved issue fingerprints, or unchanged verification results. It must not require private reasoning traces. No-progress signals can request re-planning, escalation, or a stop under policy; switching models does not erase their history.

## 11. Notebook, Memory, Storage, and Debug Growth

Bound notebook entries and bytes, selected context tokens, tool observations, memory query volume/results, proposal counts, artifact/checkpoint sizes, and retained event volume. A token-safe prompt can still produce unlimited disk usage unless these other boundaries exist.

Compaction/summarization consumes its own model calls and budget. Prefer bounded deterministic trimming of irrelevant material where safe, explicit source references, and validated summaries. Preserve goals, evidence needed for unresolved work, and uncertain operations. If a safe checkpoint cannot fit, fail visibly rather than silently discarding required recovery state.

For debug output, bound verbose payloads and queues, report drops/truncation, and reserve capacity for required lifecycle records. A full event store can block required durable transitions under the documented policy; it must not silently discard required records. Retention applies independently to memory, artifacts, checkpoints, and events because their purposes differ.

## 12. Outcomes When a Limit Is Reached

A typed limit outcome should show the applicable scope and dimension, configured limit, consumed/reserved amount, attempted operation, timestamp, reason, and checkpoint/work references.

```text
Run: run-42
Outcome: stopped — output-token allowance unavailable
Known output tokens: 23,000 of 24,000
Outstanding output reservation: 500
Next requested output reservation: 1,000
Available output capacity: 500
Checkpoint: implementation session snapshot reference
Completed work: investigation, specification, partial implementation
```

Here the call is rejected before dispatch. A policy may explicitly reformulate a valid smaller request, but cannot silently truncate a required result or declare the task finished.

Distinguish hard exhaustion, temporary rate/concurrency waiting, cancellation, deadline expiry, context overflow, storage quota, and policy-driven no-progress stops. Some are resumable under new trusted configuration; others require correction or reconciliation. Resumability is explicit, not guaranteed.

Models cannot raise their own limits. A trusted host/user-authorized configuration change is versioned and recorded, with consumed/unknown usage retained. No automatic hidden top-ups or budget resets on model switch, retry, fix cycle, resume, or provider fallback.

## 13. Recovery and Shared Scope

Persist the effective configuration, deadline, ledger revisions, operation IDs, reservations, pending unknown charges, and relevant progress counters. Restoring checkpoints must not restore an old larger balance over newer ledger consumption. Reconcile ledger and session state using durable identities/versioning.

Agent/project admission quotas may span many runs and processes. An in-memory limiter only controls one process; a shared deployment needs an atomic shared adapter. Duplicate wake-ups and recovered workers must not double-acquire capacity or dispatch the same operation independently.

A run restart must demonstrate that already-used calls/tokens remain consumed. If usage cannot be resolved, preserve uncertainty and stop/reserve conservatively according to policy rather than assuming extra capacity.

## 14. Debug Events and Inspection

Emit structured `limit.configuration.resolved`, `budget.reserved`, `budget.settled`, `budget.usage_unknown`, `budget.reconciled`, `limit.warning`, `limit.denied`, `deadline.expired`, and scoped admission/rate/concurrency events. These are proposed names with versioned event-specific schemas.

Include configured scope/dimension, operation/reservation IDs, known/estimated/unknown usage, remaining allowance, relevant policy/version, queue wait, outcome, and reason. Correlate with run, StepRun, attempt, session, model call, and tool operation as applicable.

A budget view should explain where consumption went: planning, coding, review, decision calls, transport retries, fixes, and escalation, without double-counting those classifications as separate charges. Keep monetary estimates distinct from measured tokens and provider invoices.

## 15. Example: A Bounded Google-Login Run

1. Admission accepts run-42 under the configured active-run and queue limits.
2. Classification reserves and settles one DecisionUnit model call; it is not free simply because it is System 1.
3. Investigation uses a fresh session capped by its own iteration/tool limits and the run's remaining budget.
4. Planning sends selected context, reserves bounded output, and records measured usage after completion.
5. Coding uses a different profile and a new session but continues against the same run ledger.
6. A verification process has a timeout and output-size bound. Failed checks produce evidence for a fix, not an unbounded retry.
7. A fix consumes another StepRun and existing run allowance. Two repeated equivalent failures can trigger a bounded escalation decision.
8. If remaining allowance cannot support a required review request, the framework saves a truthful stopped outcome with existing results and checkpoint references.
9. Recovery preserves all usage, deadlines, and uncertain operations. A trusted limit increase, if authorized, is recorded rather than replacing history.
10. Required finalization uses the bounded housekeeping path. Debug inspection shows which limit stopped work and what was already accomplished.

## 16. File Placement and First-Version Acceptance

Extend the existing `usage/` module rather than introducing another competing budget ledger. Put `UsageBudget`, `UsageLedger`, `BudgetReservation`, and configuration/snapshot contracts in its cohesive subfolders. Keep execution deadline/admission/progress interfaces and implementations under an `execution-control/` folder. Local tools, memory, stores, and event adapters implement their own boundary caps using these shared contracts where applicable.

Export supported capabilities through `index.ts`. First-version requirements include validated hierarchical configuration, run/session/call/tool limits, durable atomic reservations, known/unknown usage accounting, bounded retry/fix/escalation, context composition limits, deadlines/cancellation, local admission controls, output/storage/queue bounds, explicit stopped outcomes, and structured events. Shared-host/tenant quota adapters remain injectable and must state the actual scope they enforce.

Deterministic tests cover exact-boundary acceptance/rejection; inherited caps and attempts to enlarge parents; duplicate settlement; concurrent reservations; retry multiplication; unknown usage; deadlines across waiting/restarts; cancellation; no-progress stops; oversized tool/notebook/storage payloads; event queue pressure; and preserved consumed budget after recovery. Standalone examples demonstrate success, approaching-limit warnings, exhausted allowance, and safe restart without hidden resets.

[Model Routing](14-model-routing-and-escalation.md) · [AgenticMindUnit](12-agentic-mind-unit.md) · [Complete Google-Login Walkthrough](17-google-login-complete-walkthrough.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## Limit Decisions Follow the Shared Policy Contract

ExecutionLimitPolicy names an implementation of Policy<ExecutionLimitInput, ExecutionLimitDecision>. The control coordinator awaits apply() with effective parent/child limits, usage/reservations, deadlines, and requested work, then handles permit, warning, or stop explicitly. Retry and no-progress policies use the same interface with their own data types. The usage ledger still owns atomic reservations and settlement; a positive policy decision alone cannot reserve capacity or prove a charge is known.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

