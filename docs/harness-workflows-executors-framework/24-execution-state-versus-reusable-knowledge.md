# Execution State Versus Reusable Knowledge

## 1. The Main Idea

Separate what the agent needs to continue the current task from what it can usefully remember for future tasks.

```text
Execution state:
  What is happening in this particular task, and what must happen next?

Reusable knowledge:
  What supported experience or information may help another task later?
```

For Google login, “The verification process started, but its outcome is not yet confirmed” is execution state. “Check callback configuration when changing authentication” is a possible reusable lesson, supported by evidence and validated before becoming an active procedure.

Both can be saved on disk. This distinction is about purpose and authority, not RAM versus a database. Durable execution state does not become long-term knowledge merely because it survives a restart.

This page explains the proposed standalone framework design and how the existing concepts share responsibilities. It does not introduce a second state store or replace AgentMemory.

## 2. A Simple Comparison

| Question | Execution state | Reusable knowledge |
| --- | --- | --- |
| Why keep it? | Resume safely, coordinate the task, and know actual outcomes. | Help future tasks avoid rediscovering supported facts and lessons. |
| Example | StepRun sr-verify-1 is active; process operation op-9 is unresolved. | A previous task found a callback-configuration mismatch. |
| Main scope | This run, step execution, session, workspace, or publication. | Authorized agent/project knowledge across tasks. |
| How is it used? | Domain commands, recovery, result handoffs, approval/application checks. | Scoped retrieval of relevant evidence into a new task. |
| Can a model rewrite it freely? | No. Domain/operation rules control authoritative transitions. | No. Proposals, validation, provenance, correction, and access rules apply. |
| Can it be approximate? | Required lifecycle/operation records must preserve exact identities and uncertainty. | Summaries are useful, but evidence, limits, and uncertainty remain explicit. |
| What happens later? | Retained/archived/deleted under task, evidence, and recovery policies. | Revalidated, superseded, expired, or deleted according to usefulness and scope. |

A useful test is: “Would this still help a different task after this run ends?” If not, it probably remains execution/working state or diagnostic history. If yes, it is a candidate for reusable knowledge, not automatically a confirmed fact.

## 3. What Counts as Execution State?

Do not put all these items into one giant memory object. Each domain/capability retains its authoritative owner:

| State | Owner | Google-login example |
| --- | --- | --- |
| Request, goal, constraints, completion criteria | WorkflowRun and immutable unit assignment references. | Add Google login while preserving existing login. |
| Plan/version, current position, selected result revisions, pending transitions | WorkflowRun/definition references. | Specification accepted; implementation selected. |
| Step input/status, attempts, typed outcome, error/checkpoint references | StepRun and its coordination records. | First verification execution returned failed checks. |
| Session identity/lifecycle, current phase, selected model, counters | AgenticSession. | Coding session is awaiting a tool result. |
| Conversation/tool-call pairing and pending observations | AgenticSession/checkpoint. | A readFile call must receive its matching result before continuation. |
| Findings, open questions, next actions | DraftNotebook, exposed by scoped WorkingMemory. | Inspect callback configuration next. |
| Started/completed/uncertain external operations and idempotency | Tool/session operation records or publication journal. | File write may have completed before a crash. |
| Baseline, working-copy identity, current source fingerprints | Workspace subsystem. | Edits are in isolated-workspace-42, not the original. |
| Exact check results, guard coverage, report references | Step results and GuardReports. | ESLint report checked source revision code-v2. |
| Model/provider selection, decision outcomes, escalation lineage | Routing/decision/session records. | New recovery session uses the selected stronger profile. |
| Consumed/reserved/unknown usage, deadline, fix/retry counters | Usage ledger and execution-control state. | Remaining capacity must account for an interrupted provider call. |
| Frozen proposal, trusted approval, conflicts, applied operations, receipt | Publication domain/store/journal. | Approval covers changes-42/v2 for the designated target. |

Agent identity, access configuration, and mandatory policies are trusted configuration/control state. They are not facts a model can rewrite by editing a memory entry. Debug events explain operations but are not a substitute for their authoritative records.

## 4. What Counts as Knowledge for Future Tasks?

Use the existing scoped AgentMemory categories:

| Category | Useful retained information | Required qualification |
| --- | --- | --- |
| Episodic | A task was attempted, what actually happened, and supporting outcome/evidence references. | Distinguish success, failure, interruption, and uncertain external effects. |
| Semantic | Supported project/domain facts. | Record source, revision, verification time, scope, and freshness. |
| Procedural | Reusable methods, checklists, and lessons. | Link evidence and validate applicability; it does not grant new executable permissions. |

For example:

```text
Episode:
  A Google-login task encountered a callback URL mismatch and corrected it.
  Outcome/evidence: references to the actual run, checks, and publication receipt.

Semantic fact:
  At inspected revision R, this project used session cookies.
  Evidence: relevant source and verified report references.

Procedure proposal:
  Include callback-configuration checks in authentication changes.
  Evidence: failure, correction, and successful recheck from the task.
```

Explicit user preferences can also be retained through an appropriate scoped, provenance-bearing contract, without making inferred preferences into mandatory instructions. AgentMemory's current semantic/procedural capabilities can represent supported preference knowledge where their contract fits; no new universal preference subsystem is required by this page.

No task is required to create a durable fact or lesson. Some tasks produce only a result and an episode, and some are not retained beyond execution/audit policy.

## 5. Working Memory Is the Bridge, Not a Second Authority

The session notebook can contain observations that later support a proposal. It remains working memory while the task is active, even when checkpointed or archived.

```text
Observation:
  The callback check failed in this fixture run.
          ↓ notebook with evidence reference
Current task action:
  Inspect configuration and fix the mismatch.
          ↓ actual checks/review
Possible durable lesson:
  Authentication changes should include this relevant configuration check.
```

The notebook does not become the source of truth for process completion, approval, token balance, or whether a file write occurred. WorkingMemory adapts the existing DraftNotebook rather than maintaining a second independently mutable copy.

A notebook can say “tests probably pass” while the verification operation is still pending. The authoritative outcome remains pending until the actual capability/result is confirmed. Recovery follows that record, not the note's optimistic wording.

Keep concise findings, sources, open questions, and next actions; do not retain private reasoning transcripts as working or long-term memory.

## 6. How Information Is Promoted

Promotion is an explicit write path, not copying the whole conversation or debug log into a vector store:

1. Observe work and its confirmed outcomes through authorized state/evidence references.
2. Identify a potentially useful episode/fact/procedure, with a bounded summary and scope.
3. Submit a proposal with supporting run/session/source/artifact references and uncertainty.
4. Apply the configured validation/promotion policy. It may confirm, reject, leave unresolved, request evidence, or supersede older knowledge.
5. Persist accepted knowledge with identity/version, provenance, freshness/expiry, and access rules.
6. Record the proposal/validation/persistence outcome in the shared debug timeline.

A trusted coordinator can record an episode from the actual task outcome under its configured policy; semantic/procedural claims need their own evidence and acceptance rules. A human review requirement is a policy option, not a universal extra approval step.

DecisionUnit with JEV or another provider may recommend that an observation is worth proposing. That recommendation does not confirm the fact, broaden its scope, or override the actual result. A stronger planning/review model's assertion also does not automatically become verified knowledge.

Do not generalize “this happened once” into “this is always true.” A failed Google-login attempt can support a factual episode about that attempt without proving a universal authentication procedure.

## 7. How a New Task Reads Knowledge

```text
New assignment
      ↓
Scoped retrieval of relevant episodes/facts/procedures
      ↓
Freshness, scope, contradiction, and evidence checks
      ↓
Bounded summaries/references selected by AgentContextComposer
      ↓
Model input for this call
```

Retrieval is not restoration of the previous run. A new task creates new execution state and does not inherit old approvals, token balances, statuses, pending tool calls, or writable notebooks.

Do not send every stored episode, raw log, or entire report to the model. The composer selects bounded relevant material under context limits; deeper evidence can be read through authorized artifact/workspace tools.

Retrieved knowledge remains evidence to evaluate. It cannot rewrite an immutable assignment, mandatory guard, permitted tool registry, or target publication approval. If source architecture changed, stale knowledge can be flagged/corrected rather than silently applied.

## 8. OOP Boundaries

Reuse the existing objects and contracts rather than introducing a catch-all AgentState/AgentMemoryStore owning everything:

```text
Current task orchestration
  → WorkflowRun / StepRun / AgenticSession / Publication
  → RunRepository / CheckpointStore / operation journals
  → Workspace and usage state

Task evidence
  → ArtifactStore with immutable references and retention rules

Cross-task knowledge
  → Scoped AgentMemory
    → EpisodicMemory / SemanticMemory / ProceduralMemory
    → proposal validation, retrieval, correction, retention policies

Model input
  → AgentContextComposer selects from permitted current state and knowledge
```

A small summary snapshot containing references to these owners can help inspection, but must not become another writable source of truth. Each lifecycle owner validates its own commands and persistence version.

If a coordinator creates a memory candidate from a result, inject the relevant reader, proposal capability, validation policy, and event interface. Keep proposal extraction separate from running the workflow. Use registries/polymorphism for genuinely different policy behavior, not a giant memory-category or run-status switch inside the engine.

An agent-level memory facade exposes scoped capabilities; concrete storage and vector/keyword retrieval remain adapters. The same physical database may hold several kinds of records, but ownership, access, schema, lifecycle, and APIs remain separate.

## 9. Crash Recovery Versus Knowledge Retrieval

| Situation | Correct source | Why |
| --- | --- | --- |
| Did a workspace write actually finish? | Operation/checkpoint records plus current workspace reconciliation. | A remembered claim does not establish side effects. |
| Which result should the next step use? | Accepted StepRun/result revision in the current WorkflowRun. | An old episode may describe a different source revision. |
| Can publication proceed? | Exact immutable proposal, trusted approval, target checks, journal. | Prior user approval for another task is not current authorization. |
| How much budget remains? | Durable usage ledger, including reservations/unknown usage. | Model notes or a previous budget snapshot may be stale. |
| What conventions may help this task? | Authorized, fresh semantic/procedural memories with evidence. | Reusable knowledge guides investigation, not lifecycle mutation. |

A restart resumes the same task from authoritative durable state when permitted. A later task retrieves useful knowledge while starting fresh execution identities. Those operations must not be confused even if both read stored data.

If a session completed but parent persistence failed, reconcile its saved outcome once. If a tool's effect is uncertain, retain/reconcile uncertainty. Neither case is solved by asking a model to recall what it thinks happened.

## 10. Full Example: Google Login, Then Password Reset

### During Google-Login Work

```text
Execution state:
  run-42 active
  investigation/specification results accepted
  sr-implement-2 active in isolated-workspace-42
  session-implement-2 active with its own notebook
  verification operation op-9 pending
  ledger includes consumed usage and outstanding reservations
  no approved publication proposal yet

Notebook:
  Callback route updated.
  Next: wait for actual check result and inspect diagnostics.
```

If the process crashes, restore/reconcile these exact identities and operation outcomes before continuing. Do not assume tests passed because the session generated a plausible summary.

### After Checks and Publication

The actual verification passes on the corrected source, guards/review accept coverage, and the user approves the frozen proposal. Publication applies it and records a confirmed receipt; the publication-inclusive run can complete.

The coordinator records an episode from the confirmed outcome and can propose a source-grounded project fact or reusable callback-check procedure. Optional memory-write failure is tracked/retried independently; it does not undo the published task or rewrite its authoritative result.

### During Password Reset Later

A new run/session/workspace is created. Scoped retrieval may find that the project used session cookies and that authentication changes have a relevant verification procedure. The agent checks current source/freshness and uses that evidence in its new plan.

It does not inherit run-42's active status, pending operation op-9, old approval, or notebook. Those belonged to the old execution. If authentication changed since then, update/supersede the fact with evidence rather than treating old memory as authoritative.

## 11. Retention, References, and Access

Execution state may need retention for recovery, publication reconciliation, or inspection even when it has no cross-task retrieval value. Conversely, a concise fact/procedure may remain useful after bulky task logs expire. Different retention policies apply; neither category must live forever.

Durable memory can cite artifacts without copying them. Ensure supporting evidence has appropriate retention/pins, or explicitly record unavailable evidence and adjust verification status. Deleting a report does not silently prove the remembered claim; deleting a task does not automatically delete every authorized derived entry without a documented policy.

Source records and derived knowledge need coordinated correction/deletion handling, including indexes, artifact references, and tombstones where appropriate. Enforce agent-private/project-shared boundaries when reading both the knowledge and its supporting evidence. A known artifact ID is not authorization.

Do not store credentials, unrestricted environment/output dumps, or private reasoning as useful knowledge. Memory capture is selective and governed by content/access policy.

## 12. Debugging and Verification

The timeline should distinguish execution transition/result persistence from memory retrieval/proposal/confirmation. Record run/step/session references, entry IDs/versions, source/evidence references, selection reason, policy outcome, and safe summaries.

A developer should be able to answer both “Why did the engine resume this operation?” and “Which past fact influenced this model call?” without mistaking diagnostic history for current state.

Standalone tests should verify:

1. Restart preserves authoritative task state, operation uncertainty, and consumed budget without consulting long-term memory as truth.
2. A new task gets new execution/session identities and isolated notebooks while retrieving permitted reusable knowledge.
3. Draft observations do not become confirmed facts automatically; proposals can be rejected or remain unresolved.
4. Actual verification/publication outcomes, not model claims, determine episodes and completion.
5. Stale/conflicting facts, inaccessible evidence, source corrections/deletion, and scoped access remain explicit.
6. Artifact references and memory writes are idempotent under retry; optional memory failure does not falsify the completed run.
7. Model context stays bounded and recorded provenance identifies which current results and past entries were selected.

These checks extend the existing memory/recovery examples. Keep implementation modules under their current owners, exporting supported contracts through index.ts; no new universal memory database or duplicated lifecycle subsystem is required.

[Agent Memory](13-agent-memory.md) · [Recovery and Handoff](05-recovery-and-memory.md) · [State Machines](22-state-machines-and-coordinated-lifecycles.md) · [ArtifactStore](23-artifact-store-and-produced-materials.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## Policies Select; Owners Persist

Input preparation, memory extraction, validation, retrieval, and retention use Policy<TInput, TOutput> implementations called through apply(). A policy can return an evidence-bearing memory proposal or a validated decision; the memory coordinator/store commits it. Workflow state remains owned and persisted through its run/step owners. Record policy identity/version and effective configuration, reconstruct compatible objects after restart, and preserve uncertainty and actual usage. Do not serialize live policy instances or treat a new implementation as permission to reinterpret saved execution state silently.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

