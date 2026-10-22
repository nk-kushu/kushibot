# 21. Checkpoints and Recovery: Continuing After an Interruption

Imagine your class is halfway through building its wooden bridge when the lesson ends unexpectedly.

You leave the drawing, test notes, and a progress sheet beside the bridge. The next day, you check both the records and the actual bridge before continuing.

One note says “attach the right support next.” But perhaps someone attached it just before leaving. You inspect the bridge instead of blindly attaching another support.

The proposed kushibot framework needs the same care after an interruption.

A **checkpoint** preserves information needed to restore an execution.
**Recovery** uses saved state and actual evidence to determine how work can safely continue.

The examples in this chapter illustrate the design. They are not records of an actual interrupted task.

## Three Problems That Need Different Responses

Not every problem means “start again.”

| Situation                                   | Appropriate kind of response                        |
| ------------------------------------------- | --------------------------------------------------- |
| A provider connection fails temporarily     | A bounded technical retry, if permitted.            |
| Tests show that the prepared code is wrong  | A focused correction followed by applicable checks. |
| The application stops with work in progress | Restore and reconcile execution before continuing.  |

A retry repeats a permitted operation under its retry policy. A correction changes the work to address evidence of a defect. Recovery establishes the state after interruption.

These responses can interact, but they should not be confused. Restarting the entire workflow after every connection problem can waste valid completed work and repeat effects.

## What Does a Checkpoint Need to Preserve?

A checkpoint is more than a short reminder.

For an **AgenticSession**, saved data or stable references may include:

- The assignment, session identity, and surrounding execution links.
- Conversation and tool-call protocol state.
- Working notebook content or a consistent reference to it.
- Counters and authoritative usage references.
- Pending and completed operation identities.
- Workspace and relevant source references.
- Required configuration and version information.

Other authoritative records remain with their owners. The run repository stores accepted workflow results. The usage ledger owns consumption and reservations. **ArtifactStore holds produced reports.**

Recovery coordinates these records rather than treating one checkpoint as a universal copy of everything.

## Save Data, Then Reconnect Services

A saved checkpoint **cannot contain a running process or an active connection** in a form that automatically comes back to life.

The framework **restores supported data and reconnects registered model gateways, tools, repositories, and other services under current trusted execution controls.**

A stored cancellation-signal object is not a working new signal. A serialized provider client is not a resumed provider request.

The framework also checks supported state versions and required dependencies. Missing or incompatible recovery material needs an explicit outcome, not guessed replacement state.

## Follow an Interrupted Google-Login Edit

The user requested reviewed Google-login changes that preserve password login and reject expired login attempts.

Investigation and specification have already been accepted and saved. The editing worker is preparing the callback handler in the authorized working copy.

### Step 1: Record the Intended Operation

Before dispatching the edit, the framework records its operation identity and relevant source expectations.

An illustrative record might say:

```text
Operation: edit-callback-7
Session: coding-session-2
Workspace: Authorized Google-login working copy
Target: Callback handler
Intended change: Validate expiry before creating a session
Expected source: Reference to the inspected before-state
State: Dispatched; outcome not yet confirmed
```

The actual implementation needs enough information to identify and reconcile the operation safely. The labels here are simplified.

### Step 2: The Write Happens, but Confirmation Is Lost

Suppose the tool updates the file. Immediately afterward, the application process stops before recording the tool response.

The durable record still shows an uncertain operation. The model conversation may also be waiting for that tool result.

The file can be changed even though the confirmation is missing. Absence of a response is not proof of absence of an effect.

### Step 3: Restore the Execution Records

On restart, recovery loads the run, the relevant session state, and its pending operation records.

It finds the accepted investigation and specification results. Those completed results do not automatically need to run again, provided their validity conditions still hold.

It also checks workspace identity, source expectations, budget state, deadlines, and applicable configuration.

### Step 4: Reconcile the Actual File Effect

Recovery inspects the operation evidence and authorized workspace using the adapter's supported recovery mechanism.

If it can establish that this operation's intended effect is present under its identity and source expectations, it records the confirmed outcome instead of applying the edit again.

A matching-looking file alone does not always establish who wrote it or that the whole operation completed. The required evidence depends on the operation's contract and records.

If the target differs unexpectedly, recovery preserves the conflict or uncertainty. It does not overwrite a later change merely to make the old operation appear successful.

### Step 5: Restore Valid Tool-Call Pairing

The framework reconnects the confirmed outcome to the pending tool request according to the provider protocol.

The model must not receive an orphaned tool response or duplicate result as though two edits occurred.

Stable operation identities let repeated delivery be reconciled without automatically dispatching the same work again.

### Step 6: Continue Only If Further Work Is Allowed

After reconciliation, the unit can continue from the valid restored state if permissions, deadline, capacity, and remaining allowance permit it.

Used resources remain consumed. Unknown provider usage remains pending under its policy. A checkpoint from before the edit must not reset the ledger to an older balance.

If the deadline expired during the interruption, recovery can record the truthful stopped outcome through its bounded finalization path. Restarting does not automatically extend the deadline.

### Step 7: Verify the Updated Source

Confirming the edit establishes its file effect, not that the feature is correct.

The configured verification and review still need to evaluate the resulting source. Recovery cannot turn an edit receipt into a passing expiry test.

If required checks pass and the other completion rules are met, the workflow can continue toward its agreed deliverable.

## What If the Effect Cannot Be Established?

Sometimes the framework cannot safely determine whether an external action completed.

A remote service may have accepted a request but supplied no recoverable receipt. A file may have been changed again. Required operation evidence may be missing.

The correct outcome preserves uncertainty and follows the configured reconciliation policy. It may need additional evidence or an explicit trusted recovery decision before repetition.

**The framework should not promise that every arbitrary external action can be executed exactly once.** Its guarantees depend on the concrete capability and durable records available.

## Saved Artifacts and Child Outcomes Also Need Reconciliation

The same principle applies beyond file writes.

Suppose a check report is saved before its parent step result is recorded. Recovery can locate the ready artifact using the producer operation identity and attach its reference appropriately, rather than blindly rerunning the check.

Suppose a sub-agent completes before its parent receives the report. The sub-agent coordinator can recover the stored child outcome and deliver it without starting another child.

These cases have different owners, but the shared lesson is to identify existing work before repeating it.

## Resuming a Session Is Different From a Model Handoff

**Resume** restores the same session's valid execution state from saved records.

A **ModelHandoff** supplies selected information to a new session, often when policy selects another model for diagnosis or continuation.

| Resume | Handoff |
| --- | --- |
| Continues the same session identity where supported. | Starts a new session with its own working state. |
| Restores relevant conversation and pending protocol state. | Carries a bounded assignment, evidence, progress, and unresolved-operation references. |
| Reconnects required execution services. | Uses the newly selected gateway and valid new protocol. |

Neither grants new permissions, resets the run budget, or erases uncertain effects.

## Saving Progress Does Not Create Approval

Suppose publication was waiting for the user's approval when the process stopped.

Recovery restores the waiting state and the exact proposal references. It does not treat the restart as approval.

If approval already exists, the publication capability still validates its proposal, target, scope, and current conditions. A changed proposal cannot borrow approval from an older version.

Partial publication has its own journal and reconciliation rules. Recovery must report which effects are confirmed, conflicting, or still uncertain rather than calling the entire operation successful.

## Recovery Can Stop Honestly

A useful recovery report might say:

```text
Restored:
  Accepted investigation and specification results.
  Coding session and working notebook.

Reconciled:
  Callback edit confirmed under its operation record.

Not yet completed:
  Verification and review of the updated source.

Current outcome:
  Stopped because the run deadline expired.
```

That report helps a user understand where the work stands. It does not promise that automatic continuation is always possible.

If required recovery data cannot be saved or read, the framework exposes that durability failure. It must not claim safe restoration merely because some notebook text survived.

## Rebuild Compatible Policies on Recovery

Policies use the common apply() agreement, but their versions and configuration matter. Save those identities and effective values with the required execution records. After restart, the application rebuilds compatible policy objects; it does not deserialize live objects or reset the budget. Recovery still checks actual pending effects before allowing repetition.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does a lost tool response prove the operation never happened?
2. Is a notebook alone enough to restore an interrupted edit safely?
3. Does restarting reset consumed usage or the deadline?
4. Does confirming a file write establish that its tests passed?
5. Can recovery create missing user approval?

Possible answers:

1. No. The actual effect may already exist.
2. No. Protocol state, operation records, and reconciliation are also needed.
3. No. Applicable durable usage and time limits remain in force.
4. No. Required verification still has to establish behavior.
5. No. Trusted approval remains a separate requirement.

## Remember These Ideas

- Retry, correction, and recovery solve different problems.
- Checkpoints preserve supported execution state and references, not live services.
- Recovery checks records and actual effects before repeating uncertain operations.
- Completed valid results can be retained without restarting the whole workflow.
- Budgets, deadlines, permissions, verification, and approval survive interruption as real constraints.

**Next chapter:** Debug Events: Following What Happened and Why.

[Previous: Budgets and Limits: Knowing When to Continue or Stop](20-budgets-and-limits-knowing-when-to-continue-or-stop.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
