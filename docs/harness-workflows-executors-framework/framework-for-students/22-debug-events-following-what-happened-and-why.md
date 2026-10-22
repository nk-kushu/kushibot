# 22. Debug Events: Following What Happened and Why

Imagine returning to your classroom bridge and finding that one support has changed.

Who changed it? Did the strength test fail? Was the change checked afterward?

A project diary can help:

```text
Research finished.
Design accepted.
Bridge tested: right support bent.
Correction assigned because the strength requirement was not met.
Support changed.
Bridge tested again: held the agreed book.
```

The diary makes the sequence easier to understand. It is most useful when entries include the relevant evidence and reason for each decision.

The proposed kushibot framework uses **debug events** and **tracing** to explain execution in a similar way.

The IDs, events, and outcomes in this chapter are illustrative. They do not describe a real run.

## What Is a Debug Event?

A debug event is a small structured record about something that happened.

For example:

```text
Type: Tool operation completed
Run: run-101
Session: investigation-1
Operation: source-search-3
Outcome: Four matching files found
Duration: Recorded elapsed time
```

Structured means the information has defined fields, rather than being an arbitrary sentence with no context.

An event can describe a start, outcome, save, policy decision, warning, or failure. Different event types have their own validated, bounded payloads.

The purpose is to answer practical questions:

- Where is the task now?
- What operation is it waiting for?
- Which result informed the next assignment?
- Why was a retry, fix, or stop selected?
- Which source version did a check evaluate?

## A Timeline Is More Useful Than “Working…”

Suppose the Google-login investigation appears stuck.

A readable timeline might show:

```text
Run started: feature-preparation workflow.
Investigation started.
Model call completed with a source-search request.
Source search failed: temporary service unavailability.
Retry permitted: safe read operation, within retry and time limits.
Source search completed: four matching files.
Investigation report validated.
Investigation result saved.
Specification selected because the required findings are available.
```

Now we know the worker encountered a temporary search problem and recovered. It was not silently editing files or waiting for publication approval.

The exact event names and retry scope depend on the configured implementation. The key is to record both what happened and the policy reason behind the next action.

## IDs Keep Different Work From Getting Mixed Up

Imagine two class groups both writing “test started” at the same time. Without labels, their diary entries would be hard to distinguish.

The framework uses identities to connect events to the correct execution:

| Identity | What it identifies |
| --- | --- |
| Run ID | One execution of a workflow. |
| StepRun ID | One execution of a particular step. |
| Attempt ID | A technical attempt within that step execution. |
| Session ID | One model-and-tool invocation's working state. |
| Operation ID | A particular tool, model, or other tracked operation. |
| Event ID | One event record, also useful for duplicate-delivery handling. |

A workflow correction gets its own step-execution record. A technical retry uses its appropriate attempt or operation identity under the configured retry layer. These should not collapse into one unlabelled “try again” entry.

## Traces and Spans Connect the Work

A **trace** connects related execution activity. A **span** groups a particular operation's start and outcome.

For example:

```text
Google-login run
    └── Investigation execution
            └── Investigation session
                    ├── Model call
                    ├── Source search
                    └── Source read
```

Parent links show which operation contains another. Causation links can show which event triggered a decision or action.

This matters when sub-agents or other operations overlap. Event arrival order alone does not prove causation. Clocks from different processes also need appropriate handling; reliable elapsed-time measurement cannot come from subtracting unrelated process-local clocks.

You do not need to memorize the tracing vocabulary. Think of a labelled project tree with connected diary entries.

## Follow a Failed Google-Login Check

The prepared code is ready for verification. Let us inspect the story through its events.

### Step 1: Record What Will Be Checked

The verification operation identifies the configured checks and prepared source revision `code-r2`.

The event uses safe summaries and references. It does not need to copy the entire source into the timeline.

### Step 2: Record the Actual Outcome

The check runner reports that the expiry test ran and failed.

The event should preserve that meaning:

```text
Verification executed against code-r2.
Expiry behavior: Failed.
Observed issue: Expired attempt created a session.
Detailed evidence: Authorized report reference.
```

A check that could not start would have a different outcome. “Verification completed with a failed check” is not the same as a process-launch exception.

### Step 3: Record the Evidence Save Separately

ArtifactStore saves the detailed report. The framework then records the accepted step result through its persistence path.

“Executor returned” and “result persisted” are different events. A persisted-result event must follow a confirmed save, not merely a worker returning an object.

### Step 4: Explain the Fix Decision

The transition policy permits a correction because the failure has actionable evidence and the applicable limits allow more work.

The decision event links to the failed report and policy version. It explains why the next path is a fix instead of successful completion or another transport retry.

### Step 5: Record the New Evidence

The editing executor produces `code-r3`. Required checks run against that revision and produce a new report.

The timeline retains the earlier failure and the later results. It does not rewrite the old event to claim that `code-r2` passed.

The final report can now explain both the problem found and the evidence supporting the corrected work.

## Recommendation and Applied Policy Are Different Events

In Chapter 11, DecisionUnit recommended relevant reviews.

A useful timeline distinguishes:

```text
Recommendation:
  Authentication review is relevant.

Applied selection:
  Authentication review plus all configured required checks.

Execution:
  Authentication review actually started and returned a report.
```

Likewise, model-routing events explain the eligible choices, selected identity, and applicable reason. Memory events can identify which authorized entries influenced a request.

The framework records concise decision explanations and evidence references. It does not need private reasoning transcripts to explain observable decisions.

## Keep the Timeline Safe and Bounded

More detail is not broader permission.

Events should use safe summaries, identities, counts, outcomes, and authorized evidence references. Credentials, unrestricted source content, raw environment values, and private reasoning traces do not belong in the timeline.

Larger permitted reports stay in ArtifactStore. Knowing a report reference in a timeline does not authorize reading it.

Payload sizes, queues, export sizes, and retention need limits too. Thousands of tiny events can still create large storage and delivery costs.

## Optional Logging Can Be Controlled

The proposed framework uses settings such as:

```dotenv
KUSHIBOT_LOG_ENABLED=true
KUSHIBOT_LOG_LEVEL=info
```

The level chooses the amount of optional diagnostic detail:

| Level | Typical content |
| --- | --- |
| debug | Detailed safe operation and context-selection diagnostics. |
| info | Ordinary milestones, applied decisions, and result references. |
| warn | Recoverable issues, fallbacks, and approaching-limit warnings. |
| error | Failures requiring attention. |

Levels are severity thresholds. A report describing a failed behavior check still needs an accurate outcome regardless of its configured log severity.

Disabling optional diagnostics must not stop the worker, skip its tools, or alter its returned result.

Required run state, usage accounting, checkpoints, operation journals, approval records, publication receipts, and required lifecycle records retain their own durability rules. Logging off does not erase those responsibilities.

## A Scoped Recorder Handles Common Details

An executor can receive a recorder that already knows its execution identity.

When it wraps a source read, the recorder can measure duration, emit permitted events, return the actual result, or preserve the original task error.

That keeps executors from repeatedly rebuilding run and session labels. Different storage and delivery adapters can implement shared interfaces without adding provider-specific branches to the engine.

The normal progress message uses this same event capability rather than creating an unrelated competing timeline.

## What If a Viewer or Event Sink Fails?

A slow optional live viewer must not corrupt execution state. Delivery needs bounded queues and duplicate handling with stable event IDs. Dropped optional detail or delivery failures should remain visible through an appropriate health path.

Required persistence is a different matter. If a required lifecycle record cannot be saved under the durability contract, the framework cannot claim the associated transition was durably completed.

Reporting failure should not recursively flood the same broken sink or replace the original task error with a misleading logging error.

## A Missing End Event Does Not Prove Nothing Happened

A crash can leave an operation-start event without a recorded ending.

That span may be interrupted or uncertain. Recovery checks authoritative state and actual effects before establishing the outcome.

A missing edit-completed event does not prove that the file was never changed. Likewise, replaying the timeline for inspection is not permission to run the tools again.

Events explain execution. Operation records and recovery mechanisms establish how uncertain execution can continue safely.

## Show the Policy Choice and the Actual Action

Policies share apply(), but can make very different choices. Events record the policy role, configured version, reason, and safe evidence references, then separately show what the runtime actually did. A retry decision is not proof that a second attempt ran. Events do not need to expose the full policy input or private model context.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Why does “test started” need a run and operation identity?
2. Is an executor returning a report the same as saving its result successfully?
3. Does a recommendation establish that the recommended review ran?
4. Does disabling optional logs remove required usage and recovery records?
5. Does a missing completion event prove a file write did not happen?

Possible answers:

1. To connect it to the correct task and distinguish overlapping work.
2. No. Persistence is a separate confirmed action.
3. No. Actual execution needs its own outcome and evidence.
4. No. Those records retain their required semantics.
5. No. Recovery must reconcile the actual effect.

## Remember These Ideas

- Debug events provide a structured explanation of observable work and decisions.
- Identities, spans, and causation links connect related activity.
- Requested, executed, validated, and persisted are different facts.
- Safe summaries and evidence references are more useful than unrestricted content dumps.
- Optional diagnostics complement required execution records; they do not replace them.

**Next chapter:** Safe Workspaces and Approval: Preparing Changes Before Publishing.

[Previous: Checkpoints and Recovery: Continuing After an Interruption](21-checkpoints-and-recovery-continuing-after-an-interruption.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
