# 20. Budgets and Limits: Knowing When to Continue or Stop

Imagine your class building the wooden bridge with a box of sticks and forty minutes before the lesson ends.

Everyone uses the same supply. Giving a classmate a smaller assignment does not create another box of sticks. Starting a new design does not restart the clock.

The proposed kushibot framework needs similar boundaries for **model calls, tools, time, retries, and stored material.**

A **budget** tracks an allowance that operations consume. 
A **limit** places a boundary on work, size, time, or another resource.

The numbers in this chapter are teaching examples, not recommended defaults or provider specifications.

## Why a Token Limit Is Not Enough

A worker can consume resources in many ways. It might keep searching, retry a failing process, generate huge reports, or create more helpers without making progress.

A token budget does not control all those activities.

| Boundary               | Simple example                                         |
| ---------------------- | ------------------------------------------------------ |
| Model-call budget      | Limit how many provider requests the run may dispatch. |
| Aggregate usage budget | Bound total input and output usage across operations.  |
| Tool limit             | Bound tool count, execution time, or returned bytes.   |
| Context capacity       | Ensure one model request can fit safely.               |
| Storage quota          | Bound artifact, checkpoint, or memory storage.         |
| Correction limit       | Bound how many code-fix rounds are permitted.          |
| Concurrency limit      | Bound how many operations can be active at once.       |
| Rate limit             | Bound how quickly operations may start.                |
| Deadline               | Define when the work's allowed time expires.           |

A warning can indicate that allowance is getting low. It is not permission to exceed a hard cap.

## Limits Are Enforced by the Framework

The model may receive a reminder such as:

> Finish within the available allowance.

That reminder is useful guidance, but it cannot enforce the allowance by itself.

The runner, ledger, scheduler, and concrete adapters check the relevant boundaries before and during operations. A tool adapter can limit captured output, and a process runner can enforce its supported timeout and termination behavior.

Permissions are separate boundaries. **Having enough tool calls left does not authorize an out-of-scope file edit.**

## Parent Allowances Constrain Children

A run can contain several step executions and model sessions. Sub-agents also consume resources.

```text
Agent or host constraints
          ↓
Run budget and deadline
          ↓
Step and session limits
          ↓
Individual model and tool operation limits
```

A child can receive a narrower limit. **It cannot enlarge the parent allowance.**

Suppose a run has six model calls available and a child has a local ceiling of four. That ceiling does not reserve four calls for the child or promise they will remain available. The child's actual operations still need approval from the applicable shared budget.

The application supplies trusted configuration. Model-generated requests cannot raise their own limits.

## The Ledger Tracks What Is Available

A **usage ledger** records known consumption, outstanding reservations, and usage that still needs reconciliation.

Think of the class writing down which sticks were used and which are already set aside for work in progress.

Before admitting another operation, the framework considers:

```text
Known usage + outstanding reservations + new reservation
                       must fit the applicable cap.
```

This check needs appropriate atomic coordination. **Two workers must not both spend the same remaining balance because they checked it at nearly the same time.**

A storage adapter that coordinates only one process cannot claim to enforce every external account's total quota.

## Reservations Prevent Double Spending

Suppose an illustrative output-token budget has a cap of 1,000:

```text
Known output usage:          600
Outstanding reservations:  200
Available capacity:         200
```

**A new request needs a reservation of 300 output tokens. It does not fit.**

The framework must deny that request or follow an explicit permitted alternative. It cannot assume the earlier operation will use less than reserved.

When an operation completes, **settlement** replaces its reservation with measured usage. It does not permanently charge both the reservation and the actual usage.

If an operation never dispatches, its reservation can be released. A request that timed out after submission is a different case: it may already have consumed provider resources.

## Follow a Google-Login Run Through Its Allowance

The user asks for reviewed Google-login changes with password-login regression coverage.

### Step 1: Admit the Run

The host validates the run's configured limits and checks active-work capacity. The framework records the effective configuration and deadline.

If admission cannot proceed, it follows a bounded queue or rejection policy rather than creating unlimited active work.

### Step 2: Account for Investigation and Planning

Investigation reserves and consumes permitted calls and tools. Planning uses the same run ledger, even though it starts a new session.

DecisionUnit calls used for selection also consume allowance. A small classification is not free merely because it is called System 1.

### Step 3: Reserve Before Coding Calls

Before a provider request, the framework checks the valid request size, remaining deadline, and applicable limits. It reserves intended resource capacity and acquires permitted concurrency and rate capacity.

It rechecks cancellation and expiry near dispatch. No database transaction stays open while a provider generates its answer.

### Step 4: Settle What Actually Happened

The adapter reports measured usage where available. The ledger settles the operation once under its stable identity.

If actual reported usage exceeds an estimate, the framework records the truth and exposes the breach. It must not clip the recorded usage to make the cap appear respected.

Provider billing can include categories and behavior the framework cannot predict exactly. Estimates are not an exact invoice guarantee.

### Step 5: Bound Verification and Fixes

Verification runs configured checks with process-runtime and output limits.

Suppose the expiry check fails. A correction is permitted only if its workflow limits and remaining allowance allow it.

A new editing session consumes the existing run allowance. Switching models or starting a child does not reset the ledger.

### Step 6: Check Whether Required Review Can Proceed

Suppose the remaining budget cannot support the required review request.

The framework must not skip that review and declare completion. It reports a stopped outcome with the completed work, current source and report references, and the missing requirement.

A report can say:

```text
Outcome: Stopped before required review.
Completed: Investigation, specification, implementation, and verification.
Remaining requirement: Review of the current prepared changes.
Reason: The requested reservation exceeds available allowance.
Recovery references: Saved run and session records.
```

That is more useful than an invented success or an unexplained failure.

## Reaching a Stopping Limit Preserves Collected Work

**When a hard budget, iteration limit, or deadline stops an assignment, stop new work, preserve the available work, and return an explicit partial outcome.** Reaching the limit does not erase findings or automatically turn an unfinished assignment into a success.

Not every boundary ends an assignment. A concurrency slot may become available after a bounded wait, and oversized context may be rebuilt within policy. The rule here applies when the framework determines that an assignment cannot continue under its effective limits.

The runner and coordinator should:

1. Stop admitting new model calls or tool operations for the stopped assignment.
2. Safely settle completed operations and cancel or reconcile work already in progress. Retain uncertainty when an operation's usage or effects cannot yet be established.
3. Preserve collected evidence, available artifacts, actual file changes, and pending requirements within the permitted persistence and storage bounds. Do not discard useful work merely because the next operation is denied.
4. Record a stopped outcome that identifies partial progress, the stopping reason, evidence/source references, and unresolved work. If persistence fails, expose what could not be saved.
5. Deliver the outcome to the parent or workflow. Its acceptance rules decide how the available material can be used; the limit itself does not decide that it is sufficient.

A **partial outcome** describes the available progress. It is not a replacement for the existing stopped status: the status remains Stopped, with explicit partial-progress information. It must not be disguised as a completed child report or an accepted final answer.

The framework can construct this envelope from saved notebook entries and operation records without asking the model to summarize again. If a new model-written closing summary is desired, reserve capacity for it before exhaustion. Housekeeping capacity does not authorize another model call after a hard limit is reached.

## Concrete Example: A Parent Uses a Sub-Agent's Partial Findings

A parent agent is preparing a Google-login specification. It asks a read-only sub-agent:

> Explain how password login creates and validates sessions, and identify regression tests needed before adding Google login.

The sub-agent receives a local limit of three completed model-and-tool iterations within the shared run allowance. In this illustration, it inspects three source files at the fixed source version `code-r4`. It records supported observations, but has not inspected the expiry implementation or the authentication tests when its iteration limit is reached.

### Step 1: Return the Work Already Collected

The runner refuses another child iteration and builds an outcome from the records it already has:

```text
Sub-agent: session-investigation-1
Status: Stopped
Progress: Partial
Reason: Local iteration limit reached (3 of 3).
Source: code-r4

Collected findings:
- login.ts calls SessionService to create the password-login session.
- session-service.ts creates the session record and session identifier.
- session-middleware.ts loads the session for authenticated requests.

Evidence:
- Saved inspected-source references for those three files at code-r4.

Unresolved:
- Whether and where session expiry is enforced.
- Which password-login regression tests currently exist.

Artifacts:
- Authorized reference to the saved partial investigation notes.
```

These are illustrative findings, not claims about an actual application. Each finding must be supported by the inspected source. The framework does not invent the unresolved answers or spend an extra model call to produce this envelope.

### Step 2: Let the Parent Use Supported Findings

SubAgentCoordinator records the child's stopped outcome and delivers it as the result of the parent's pending sub-agent operation. The parent receives both the useful findings and the explicit missing coverage.

If the parent still has its own remaining allowance within the shared budget, it can make its next model call using that outcome. It can draft the session-creation part of the specification using the evidence-backed findings, while marking expiry behavior and existing test coverage as unresolved. A local child limit does not necessarily exhaust the parent's remaining allowance.

The parent's draft might contain:

```text
Supported design input:
Reuse the existing SessionService session-creation path for Google login,
subject to the implementation's normal acceptance and verification rules.

Open requirements:
Confirm session-expiry enforcement.
Inspect existing password-login regression tests before finalizing coverage.
```

Using the findings does not change the child's status from Stopped to Completed. Earlier findings remain tied to `code-r4`; changed source requires current evidence.

### Step 3: Apply the Parent's Completion Rules

If an explicitly incomplete planning draft is an allowed deliverable, the parent can return that draft with its open questions. If the requested specification requires confirmed expiry behavior and test coverage, it cannot claim completion yet.

Where policy and remaining allowance permit, the parent may perform a focused follow-up or request another sub-agent for genuinely separate unresolved work. It must not repeatedly spawn replacements to evade the original iteration limit, no-progress rules, or shared budget.

If the run-wide budget or deadline is also exhausted, the parent cannot make another model call. The framework preserves and returns the parent's own stopped partial outcome using the same bookkeeping path. Already collected findings remain useful for review or a later explicitly authorized continuation.

## Different Repetition Counters Mean Different Things

Several kinds of repetition can occur:

| Repetition | Example |
| --- | --- |
| Transport retry | Repeat a provider request after an eligible connection failure. |
| Output correction | Ask for a contract-compliant answer after invalid output. |
| Unit iteration | Continue the model-and-tool loop. |
| Step attempt | Retry a step execution under its attempt policy. |
| Workflow fix round | Correct code after verification or review finds a problem. |
| Escalation | Start a new permitted diagnostic session or model handoff. |

Separate local retry loops can multiply work. Each layer needs a defined owner, count, and bounded policy. Underlying dispatched requests still count when usage is incurred.

A retry counter remaining above zero does not make invalid arguments or exhausted budgets retryable.

## Deadlines and Timeouts Are Different

A **deadline** is an expiry for a larger scope. A **timeout** bounds an individual operation.

For example, a model call may have its own timeout, but it cannot use more time than the remaining parent deadline permits.

An absolute run deadline normally continues while waiting, queued after admission, or restarted. A separately configured active-runtime allowance is a different policy and needs explicit accounting.

Retry delays and rate-limit waits also consume elapsed time. Waiting is not a hidden way to stop the clock.

Cancellation is cooperative. A timeout response does not always prove that a remote operation stopped. The framework must retain uncertainty about usage and effects where necessary.

## Unknown Usage Is Not Zero Usage

Suppose the provider accepted a request, but the connection times out before usage is returned.

The framework marks the usage pending or unknown and retains the appropriate reservation under its reconciliation policy. Available request IDs or provider evidence may help resolve it later.

It cannot release all capacity and assume the request cost nothing.

The same caution applies to effects: a timed-out file write may have completed. Recovery needs to establish what happened before unsafe repetition.

## Stop Repeating Work That Makes No Progress

A **progress guard** detects patterns such as repeated equivalent searches, unchanged failure reports, or corrections that do not address the same unresolved issue.

A configured policy may request bounded replanning, escalation, or a stop.

The guard uses observable evidence and operation history. It does not need a private reasoning transcript.

Starting another session must not erase this no-progress history or create an unlimited new sequence of attempts.

## Recovery Preserves Consumption

After interruption, the framework restores the effective configuration, deadline, operation identities, reservations, and relevant progress counters.

A stale checkpoint must not overwrite the ledger with an older, larger available balance.

Repeated completion delivery must not charge an operation twice. Uncertain operations need reconciliation, not a reset.

A trusted authorized limit change can be recorded explicitly. It retains prior usage and history rather than pretending the task started again.

## Leave Bounded Capacity for Honest Finalization

The framework needs a small, separately bounded housekeeping path to record the stopped state, preserve minimum recovery information, and release appropriate leases.

That capacity cannot fund another coding attempt or a new model-generated summary. Its job is to record the stopped partial outcome and finish execution bookkeeping safely. Any model-written finalization must have its own allowance reserved beforehand, within the applicable hard caps.

If required persistence fails, the outcome must expose that durability problem rather than claim everything is safely saved.

## Policies Decide Within Enforced Limits

Retry, no-progress, and limit policies use the same Policy agreement and apply(). Their typed input describes current usage, requested work, and relevant evidence; their result describes the allowed next action. The usage ledger and control services enforce actual reservations, deadlines, and cancellation. A policy's positive answer alone does not reserve resources.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does creating a sub-agent create a new run-wide budget?
2. Is a warning permission to exceed a hard limit?
3. Can unknown provider usage automatically be recorded as zero?
4. Does a timeout always establish that an external operation stopped?
5. May the framework skip a mandatory review because allowance is exhausted?
6. What happens to evidence collected before a stopping limit is reached?
7. Can a parent use partial findings from a stopped sub-agent?

Possible answers:

1. No. Children remain subject to applicable shared limits.
2. No. It is an early signal, not a limit increase.
3. No. Preserve and reconcile the uncertainty.
4. No. Usage and effects can remain uncertain.
5. No. Report the unfinished requirement and stop honestly under policy.
6. Preserve it within the permitted storage bounds and return it with a stopped partial outcome, evidence references, and unresolved work.
7. Yes, within its own remaining allowance and acceptance rules. The parent must retain the missing coverage and cannot relabel the child as completed.

## Remember These Ideas

- Limits cover calls, tools, time, repetitions, storage, and active work.
- Children and new sessions remain inside applicable parent allowances.
- Reservations protect shared capacity; settlement records actual consumption.
- Unknown usage, timeout effects, and recovery need explicit handling.
- Exhaustion preserves collected work and returns a stopped partial outcome with the reason, supported findings, and unresolved requirements.
- Parents can use partial findings under acceptance rules; missing evidence stays missing and new work still needs allowance.
- Hard limits do not authorize an extra model call for a closing summary.

**Next chapter:** Checkpoints and Recovery: Continuing After an Interruption.

[Previous: Sub-Agents: Asking Another Worker for Help](19-delegation-asking-another-worker-for-help.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
