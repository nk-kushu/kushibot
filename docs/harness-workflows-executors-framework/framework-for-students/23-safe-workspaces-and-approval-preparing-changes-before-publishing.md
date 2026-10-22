# 23. Safe Workspaces and Approval: Preparing Changes Before Publishing

Imagine your class wants to improve the bridge drawing displayed on the classroom wall.

Instead of erasing the displayed drawing immediately, you make a copy and try changes there. You inspect the revised design, test what needs testing, and show the teacher the exact version you want to put on the wall.

The teacher approves that version. If you redraw another support afterward, the earlier approval does not automatically cover the new drawing.

The proposed kushibot framework uses a similar separation between **preparing changes** and **applying an approved proposal**.

This chapter explains the design through illustrative files and outcomes. It does not publish a real project.

## What Does “Publish” Mean Here?

In this framework chapter, **publication** means applying approved file changes to a designated original local workspace.

It does not automatically mean pushing to a remote Git repository, merging a pull request, or deploying an application. Those are separate capabilities and actions.

The basic process is:

```text
Original project
        ↓ capture a defined baseline
Authorized working copy
        ↓ edit, check, and review
Frozen proposal
        ↓ trusted approval of this version and target
Validate current target and apply approved operations
        ↓
Recorded publication outcome
```

## Meet the Main Pieces

| Piece | Simple meaning |
| --- | --- |
| Source workspace | The project state the task starts from. |
| Baseline | A recorded, identifiable starting state for comparison. |
| Working workspace | The authorized environment where draft changes are prepared. |
| ChangeSet | The exact versioned list of proposed additions, edits, and deletions. |
| Review bundle | The proposal, visible differences, check evidence, and remaining issues. |
| Approval | A trusted decision covering a particular proposal, target, and scope. |
| Publication receipt | A durable record of what actually applied and what did not. |

A **diff** is a view of differences between versions. It helps a reviewer inspect proposed changes.

These pieces have separate jobs. A working copy existing does not mean its contents are approved, and approval does not prove that application succeeded.

## Capture the Starting State Honestly

Before creating the working environment, the framework needs an explicit source-state policy.

Is the task based on a committed revision, or on the current working files including selected local modifications and new files?

An ordinary repository clone does not automatically include uncommitted work. The framework must not silently discard the user's local changes when choosing its baseline.

Include and exclude rules also matter. A file excluded from the working copy is not automatically a proposed deletion from the original.

The baseline must describe a consistent captured state. If source changes during capture, the provider needs to establish consistency or report the problem.

## Give Editing Tools the Working Boundary

Investigation, implementation, checks, and guards operate through scoped capabilities for the assigned workspace.

A model cannot escape that boundary by requesting an absolute path or following a link outside it. Concrete adapters must enforce the actual operation boundary.

Separate sessions can use the same working copy during sequential assignments while keeping their conversations and notebooks separate. Concurrent edits require additional isolation or coordination.

A filesystem boundary is not a complete sandbox. A command with network access or database credentials can affect external systems, so those capabilities need their own controls.

## Follow Google Login From Draft to Application

The user asks:

> Prepare Google-login changes, preserve password login, and let me review the proposal before applying it to my original project.

### Step 1: Create the Working Copy

The framework records the chosen source state as `baseline-42` and creates an authorized working workspace.

Its metadata records the source and baseline identities. Tools for the feature assignment receive the permitted working-workspace capabilities, not unrestricted editing access to the original project.

### Step 2: Prepare and Check the Feature

The workflow investigates, specifies, implements, verifies, and reviews the changes.

Suppose the working copy contains a new callback handler, an updated login entry point, and new tests. Required checks and guard reports identify the source they evaluated and any limitations.

Draft edits inside this authorized scope do not require a separate publication approval for every keystroke.

### Step 3: Freeze a Concrete Proposal

ChangeSetBuilder compares the included working state with its baseline and produces `changes-42/v1`.

A simplified review bundle might say:

```text
Proposal: changes-42/v1
Target: Original Shop project

Modified:
  Login entry point

Added:
  Google callback handler
  Callback tests

Deleted:
  None

Evidence:
  Verification and guard reports for the reviewed source

Remaining limits:
  Live integration requirements stated explicitly
```

The actual proposal identifies exact paths, expected before-states, and immutable proposed content. Friendly summaries supplement those identities rather than replace them.

### Step 4: Review Before Requesting Approval

The user can inspect the diff, check evidence, and remaining issues. The framework has already made the proposed action concrete.

If the user requests a correction, the worker edits the working copy and produces a new proposal, such as `changes-42/v2`, with appropriate updated checks.

Version 1 does not silently change underneath the earlier review.

### Step 5: Record Trusted Approval

The user approves version 2 for the designated original Shop target under the stated scope.

The trusted approval boundary records the exact proposal identity and content fingerprint. The model cannot create that authority by returning an object containing “approved.”

A DecisionUnit recommendation or a passing guard report cannot substitute for the user's required decision.

### Step 6: Recheck the Original Target

While the agent prepared its draft, the user might have edited the original login file.

Publication compares the current target with the expected baseline and applicable review context:

```text
Baseline login file: A
Approved proposal wants: B
Current original file: C

C differs from A → potential conflict, not permission to overwrite C.
```

The framework reports conflicts rather than silently replacing the user's newer work. Even changes outside the proposed paths can matter if dependencies or configuration invalidate earlier verification evidence.

A resolved merge candidate may need new checks and a new proposal approval. It cannot borrow approval for different content.

### Step 7: Apply Only the Approved Operations

After the required checks, WorkspacePublisher stages and applies the exact approved proposal through its supported safe primitives.

It does not copy an entire directory over the original and delete everything absent. Unrelated files, excluded material, and paths outside the approved proposal remain outside its scope.

The publisher applies frozen approved content, not whatever happens to be in the working directory at that moment.

### Step 8: Verify and Save the Receipt

The publisher checks the actual outcomes and records a receipt with operation identities, resulting fingerprints, and any failures or uncertainty.

The surrounding workflow completes publication only when its required receipt and other completion rules are satisfied.

A message saying “applying changes” is not a publication receipt. A receipt for successful local application is not evidence that deployment happened.

## What If the Proposal Changes After Approval?

Suppose the user approves `changes-42/v2`, and then another edit changes the callback handler.

That edit requires a new proposal version and the applicable checks and approval. Version 2's approval covers version 2's frozen content.

The framework must not publish a mixture of versions or quietly omit difficult operations. Publishing a subset, if supported, requires an explicit coherent proposal with its own applicable validation and approval.

## What If Application Stops Halfway Through?

Updating several files in an ordinary directory is not automatically one all-or-nothing transaction.

An interruption might leave one operation applied and another uncertain. The publication journal records intended and observed operations so recovery can reconcile the actual state.

The framework must report partial or uncertain application rather than claim total success.

Rollback also needs care. Restoring an old file must not overwrite a user's new edit made after the partial application. The recovery capability checks current content against its recorded state and stops where safe restoration cannot be established.

The concrete provider must state its actual guarantees. A framework lock does not automatically block every other editor on the computer.

## Waiting for Approval Is Real Execution State

If the proposal is ready but approval has not arrived, the workflow records that it is waiting.

It can release expensive execution resources while retaining the proposal and required evidence. Restarting does not create missing approval, and approval does not automatically extend an expired deadline.

If the user rejects the proposal before application, the original target remains unchanged by that unapplied proposal. The prepared work can remain inspectable under retention policy.

Cleanup applies to framework-owned temporary material, not the user's original project. Required approval and recovery evidence needs protection for its applicable lifetime.

## Workspace Policies Follow the Common Agreement

Edit and retention policies use Policy<TInput, TOutput> and apply(), just like assignment and context policies. They return choices about exact candidate content or framework-owned retained material. The workspace services enforce boundaries and perform operations. Publication still needs the trusted approval for the exact proposal; a policy cannot supply that user approval.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does editing the working copy automatically edit the original project?
2. Does approval of one version cover later changed content?
3. May publication silently overwrite a conflicting user edit?
4. Does successful local publication imply remote push or deployment?
5. Can a partial application be reported as complete because approval existed?

Possible answers:

1. No. Applying an approved proposal is a separate action.
2. No. Approval is bound to the exact proposal, target, and scope.
3. No. Conflicts require explicit handling and applicable renewed validation.
4. No. Those are separate capabilities and outcomes.
5. No. The receipt must reflect the actual complete, partial, failed, or uncertain result.

## Remember These Ideas

- Prepare edits within an authorized working boundary from a defined baseline.
- Review a frozen proposal with evidence and explicit limitations.
- Trusted approval covers exact content and a designated target.
- Publication checks current conditions and applies only approved operations.
- Durable receipts and recovery records establish what actually happened.

**Next chapter:** Put It All Together: Build Google Login Step by Step.

[Previous: Debug Events: Following What Happened and Why](22-debug-events-following-what-happened-and-why.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
