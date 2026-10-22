# 24. Put It All Together: Build Google Login Step by Step

We have met the framework's main parts one at a time. Now let us follow them working together on one request.

Think of the classroom bridge project again. The plan, students, instructions, tools, reports, and project diary all contribute to the result. None needs to do every job alone.

The same idea applies to kushibot: clear responsibilities cooperate through checked handoffs.

This is an illustrative story about the proposed framework, not an implementation that has already run. It explains framework coordination rather than prescribing a complete Google authentication design. A real feature needs its concrete security requirements, provider configuration, and verification.

## Our Goal and Example Boundaries

The user tells Project Helper:

> Add Google login to the Shop application. Preserve password login and reject expired login attempts. Prepare the changes for my review, then apply only the exact proposal I approve. Do not deploy.

For this story, the agreed deliverable is reviewed local changes with configured automated checks and explicit limitations. Automated examples use simulated provider responses. Live Google integration remains a separate configured check and is not claimed as completed here.

If live integration were mandatory for the agreed deliverable, the workflow could not declare completion without it.

The plan includes:

```text
Investigate → Specify → Implement → Verify → Review
                                  ↑          │
                                  └── Fix ───┘ if permitted

Accepted preparation → Frozen proposal → Approval → Apply → Receipt
```

Each transition follows configured policy, required evidence, and applicable limits.

## Step 1: Assemble the Configured Assistant

Before execution, the host supplies collaborators: model profiles, registered tools, executors, policies, scoped stores, and the workflow definition.

Project Helper has its stable agent identity. A new run, `run-42`, records this particular request.

The workflow is the reusable plan. Its run holds today's progress; a separate password-reset request would have its own run.

The framework validates configuration and admission limits. It does not let a model create hidden provider clients or grant itself tools.

**Connect this to:** agents, workflows, executors, and budgets.

## Step 2: Capture the Source and Create a Working Copy

The workspace capability captures the explicitly selected source state as a baseline, including local modifications only under the chosen source-state policy.

It creates an authorized working workspace. File and check capabilities operate within the configured boundaries.

The original project does not become an editing target just because it supplied the source. Network and other external effects remain controlled separately from filesystem isolation.

**Connect this to:** safe workspaces and tool permissions.

## Step 3: Select Initial Guidance

The guard-selection service considers the request and available evidence. DecisionUnit can recommend relevant guards from trusted enabled candidates.

Selection policy preserves all required guards and validates optional recommendations. For this example, coding receives relevant design and lint guidance.

A relevance recommendation is not a completed guard check. Actual evaluation comes when the relevant work exists.

**Connect this to:** small decisions, guidance, and enforcement.

## Step 4: Choose an Eligible Investigation Model

The router resolves task needs and trusted constraints, filters eligible profiles, and applies the configured selection policy.

The concrete model must support the required tools, output, context, and allowed provider scope. Budget and capacity are rechecked and reserved near dispatch.

The investigation executor starts an AgenticMindUnit session with read-only tools, a fresh notebook, and a report contract.

**Connect this to:** model routing, sessions, and contracts.

## Step 5: Investigate With Actual Tools

The model requests a source search. The framework validates it, and the permitted tool returns matches. Reads then reveal relevant authentication source.

The notebook records concise findings, evidence references, and open questions. The composer selects useful observations for each next model request while preserving the assignment and required rules.

Suppose investigation establishes that password login uses an existing session service. The report states its evidence and limits rather than guessing about uninspected behavior.

The framework validates and accepts the appropriate result, saves the full report as an artifact where useful, and persists the small step outcome with its references.

**Connect this to:** the model-and-tool loop, context, and artifacts.

## Step 6: Prepare the Specification With Focused Help

The specification executor starts its own session. It receives selected accepted findings and requirements, not the investigator's mutable notebook.

Suppose it needs more detail about existing tests. Its supervisor requests a read-only child investigation through the optional sub-agent capability.

The framework validates the child request, inherits boundaries and shared limits, and constructs an isolated session. The child inspects the assigned source and returns a validated report.

The parent then prepares its own specification. The child did not become a new workflow step or automatically finish the parent assignment.

**Connect this to:** sub-agents and checked handoffs.

## Step 7: Define What Implementation Must Produce

The specification states the expected behavior, affected responsibilities, required checks, and unresolved configuration details.

For our simplified story, it requires validating the login attempt before creating a session, preserving password login, and verifying rejection of expired attempts.

The result contract checks required structure. Evidence and acceptance policies determine whether the content satisfies the assignment. A properly shaped document can still be incomplete.

The accepted specification is saved before implementation relies on it.

**Connect this to:** contracts and acceptance criteria.

## Step 8: Implement Under the Same Shared Allowance

The router selects an eligible coding profile for a new editing session. This does not reset consumed usage.

The editor receives the specification, relevant source, required guidance, and permitted tools for the working copy.

Provider prompt caching, where supported and permitted, may reuse input processing. Each model request still makes its own provider call and generates a fresh response. The framework does not substitute saved answers, and input reuse cannot prove an edit occurred.

The edit tool performs actual source changes. Its operation outcome and resulting references become evidence for subsequent work.

**Connect this to:** editing, caching, and accounting.

## Step 9: Find a Bug Through Verification

The verification executor runs the configured checks against the prepared source revision `code-r2`.

Suppose the actual report says:

```text
Password-login regression: Passed
Valid simulated Google response: Passed
Expired login attempt: Failed
Observed: A session was created before expiry was rejected.
```

The verification assignment produced useful failure evidence. The feature has not met its required behavior.

ArtifactStore saves the detailed report under an exact identity. The small result carries its outcome and report reference.

The transition policy permits a focused correction because the configured fix limit and remaining resources allow it.

**Connect this to:** verification, artifacts, and bounded fix loops.

## Step 10: Recover From an Interrupted Correction

The editing worker requests a change to validate expiry before session creation. The tool performs the write, but the process stops before its confirmation is saved.

On restart, recovery restores the relevant state and finds the pending operation. It checks the actual effect using operation identity, source expectations, and the adapter's recovery evidence.

If confirmed, it records the outcome and restores valid tool-call/result pairing without blindly repeating the edit. If uncertainty remains, it preserves that uncertainty and follows reconciliation policy.

Consumed usage, pending charges, permissions, and deadlines remain in force. This story continues only because the operation is reconciled and further work is still allowed.

**Connect this to:** checkpoints and honest recovery.

## Step 11: Recheck the Updated Source and Guards

The fix produces `code-r3`. Required verification runs against that updated source.

Guard relevance can be reassessed using the actual changes while preserving mandatory obligations. Registered checkers run applicable lint and design evaluations.

Suppose the configured checks pass and review accepts the changes under its coverage and limitations. Earlier reports stay associated with their earlier source versions.

A missing required check would remain unresolved. The framework cannot replace it with an empty success or use an old passing report for different content.

**Connect this to:** guard coverage and evidence freshness.

## Step 12: Use an Independent Review Where Required

Every model-backed review makes a provider call and generates a new answer. When an independent judgment is required, the review policy also establishes the appropriate reviewer context and requirements.

Provider prompt caching may reuse supported input computation during that call. The reviewer receives authorized current evidence and a bounded review assignment.

The review result is validated and evaluated against applicable acceptance rules. Its recommendation cannot create publication approval.

If repeated problems justified escalation, policy could instead start another eligible session with a ModelHandoff and the remaining allowance. That would be an explicit bounded path, not a hidden reset.

**Connect this to:** fresh evaluation and model handoffs.

## Step 13: Freeze the Reviewable Proposal

ChangeSetBuilder compares the working state with the baseline and freezes exact proposed operations and content as `changes-42/v1`.

The review bundle includes the diff, relevant check and guard reports, source identities, and explicit limitations such as the unperformed live integration check.

The user can inspect the concrete proposal before deciding. If a requested correction changes content, the framework produces a new proposal version and appropriate fresh evidence.

**Connect this to:** immutable artifacts and proposal versions.

## Step 14: Wait for Exact Approval

The framework records that the publication stage is awaiting approval and releases appropriate expensive execution resources.

The user approves the exact proposal for the original Shop target. The trusted boundary records that decision and scope.

A model response, memory entry, or restart cannot supply missing approval. The approval also does not automatically extend an expired deadline.

In this story, the required approval arrives while the applicable publication scope remains valid.

**Connect this to:** authority and lifecycle state.

## Step 15: Check the Target and Apply Approved Content

WorkspacePublisher verifies the approval, proposal, evidence requirements, and current target conditions.

If the original login file has changed incompatibly since the baseline, publication reports a conflict. A resolved candidate needs appropriate new checks and approval rather than silently overwriting the user's work.

For the successful path, assume those checks establish that application may proceed. The publisher applies only the approved operations from frozen content, records its journal, verifies actual results, and persists a receipt.

Partial or uncertain application would require its own honest outcome and recovery. Approval alone cannot establish success.

**Connect this to:** publication and durable receipts.

## Step 16: Report the Actual Deliverable

The final outcome describes what the evidence establishes:

```text
Prepared and applied:
  The exact approved Google-login proposal to the designated local project.

Recorded checks:
  Configured regression and simulated-response checks for the reviewed revision.
  Applicable guard and review results.

Limitations:
  Live Google integration was not exercised in this illustrative path.

Not performed:
  Deployment.

Evidence:
  Accepted results, report references, approved proposal, and publication receipt.
```

Completion depends on the agreed deliverable. If an omitted check or action were mandatory, the framework would report unfinished work instead.

**Connect this to:** truthful completion and evidence boundaries.

## Step 17: Retain Useful Knowledge for a Later Task

The coordinator can record an episode from the confirmed outcome under retention policy. A supported reusable lesson can be proposed separately for validation.

When password-reset work begins later, it gets a fresh run and session. Scoped memory can supply relevant project knowledge, but important facts need freshness checks against current evidence.

The new task does not share the old notebook or treat a previous proposal as approval for new work.

**Connect this to:** memory and task isolation.

## The Timeline Makes the Story Inspectable

Debug events connect the run, step executions, sessions, model calls, tools, decisions, reports, and publication.

A developer can follow the failed check into the fix, the interruption into reconciliation, and the approval into its application receipt.

Optional diagnostic settings control safe verbosity. Required execution, recovery, usage, and approval records retain their own durability rules.

The trace explains observable decisions and outcomes without capturing private reasoning or unrestricted content.

## The Whole Framework in One Table

| Concept | Its job in this story |
| --- | --- |
| Agent | Supplies stable identity and configured capabilities. |
| Workflow and engine | Define and coordinate the permitted process. |
| Run and step records | Own this execution's accepted progress and outcomes. |
| Executors | Perform investigation, specification, editing, verification, and review assignments. |
| AgenticMindUnit | Coordinates bounded model-and-tool work through its runner. |
| Sessions and notebooks | Keep each invocation's working state separate. |
| Tools | Produce actual observations and effects within their boundaries. |
| Contracts | Define usable inputs, outputs, and capability agreements. |
| Guards | Connect guidance to evidence-backed checks and enforcement. |
| DecisionUnit | Supplies validated bounded recommendations. |
| Routing | Selects eligible model capabilities at defined boundaries. |
| Context composer | Prepares useful, valid information for each model request. |
| Memory | Supplies scoped knowledge and experience across tasks. |
| Artifacts | Hold immutable produced material by exact reference. |
| Provider prompt caching | Reuse supported input computation while generating a new response for every model request. |
| Sub-Agents | Run focused child AgenticMindUnits in separate sessions and return their outcomes. |
| Budgets and limits | Bound admission, usage, time, repetitions, and growth. |
| Checkpoints and recovery | Restore and reconcile execution without erasing uncertainty. |
| Debug events | Explain connected observable actions and decisions. |
| Workspaces and publication | Separate preparation from approved application and record actual effects. |

## The Same Policy Idea Runs Through the Whole Story

Input policies prepare assignments from accepted earlier results. Context policies choose what each model sees. Completion, routing, guard, provider prompt-cache configuration, sub-agent admission, retry, and transition policies make their own focused choices. They all implement Policy<TInput, TOutput> and apply(). Executors, unit runners, tools, and stores carry out the work and enforce the required boundaries. This gives one reusable policy concept without mixing the responsibilities.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Why does the editing session receive a specification instead of only “add login”?
2. Why does the expiry failure remain useful after the fix passes?
3. Why must recovery inspect an edit whose response was lost?
4. Why does an independent review bypass an otherwise matching saved answer?
5. Why does publication need a receipt after approval?
6. Can the next task reuse project knowledge without sharing the old session's notebook?

Possible answers:

1. The specification carries expected behavior, constraints, and acceptance criteria.
2. It explains the defect and correction history while remaining tied to its checked source.
3. The edit may already have happened; repeating it blindly could be unsafe.
4. Reusing the earlier final answer would not provide a fresh judgment.
5. Approval permits an action; the receipt establishes its actual recorded outcome.
6. Yes. Scoped durable memory and isolated working state have different responsibilities.

## What You Have Learned

The framework turns a user goal into connected, bounded assignments with evidence-backed handoffs.

Models help generate useful responses. Tools perform permitted operations. Workers return results. Policies decide what those results allow next. Stores preserve the appropriate records, and recovery checks uncertainty before repetition.

The result is a process that can explain its progress, correct problems within limits, and report honestly when work is complete or still unfinished.

This final chapter completes the introductory walkthrough.

[Previous: Safe Workspaces and Approval](23-safe-workspaces-and-approval-preparing-changes-before-publishing.md) · [Start again: Meet the Framework](01-meet-the-framework.md)

## Build Requests So the Provider Can Reuse Preparation

The framework must enable provider prompt caching by keeping unchanged instructions, tools, and answer requirements in a stable order and representation. The request composer builds that structure, and the provider adapter preserves it in the request it sends. Changing evidence still belongs in the correct current context; summaries or model changes may reduce reuse. Each request generates a new answer, and the provider decides whether cached input computation can be used. See [chapter 18](18-caching-reusing-work-when-it-is-still-useful.md).

