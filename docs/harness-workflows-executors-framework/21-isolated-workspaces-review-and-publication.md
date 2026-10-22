# Isolated Workspaces, Review, and Approved Publication

## 1. The Idea

The framework must support working on an isolated copy of a codebase and publishing a reviewed change set back to the original workspace only after explicit user approval.

```text
Original workspace
       ↓ capture baseline + create isolated copy
Working workspace
       ↓ agent edits, checks, guard review
Immutable proposed change set
       ↓ user reviews and approves this version
Publisher validates target and approval
       ↓ apply approved additions, edits, and deletions
Original workspace updated + publication receipt
```

“Publish” here means applying approved file changes to the designated local target workspace. Remote Git push, merging a pull request, and deployment are separate capabilities and are not implied by local publication approval.

This is a proposed standalone framework feature. Examples use fixture source/working/target directories and do not change the current AI Harness or a real repository merely by documenting this design.

## 2. Workspace Concepts

| Concept | Meaning |
| --- | --- |
| Source workspace | The original codebase from which the task starts. |
| Baseline snapshot | Immutable identity/manifest of the initial file state used for comparison, including explicit handling of dirty/untracked files. |
| Working workspace | Isolated writable environment in which the agent performs the task. |
| WorkspaceHandle | Scoped identity, root/capabilities, baseline reference, provider, and lifecycle state. |
| ChangeSet | Immutable, versioned proposal describing exactly which target paths and contents will change. |
| Review bundle | ChangeSet plus diff, checks, guard coverage, provenance, and remaining issues. |
| PublicationApproval | Trusted approval bound to a particular proposal, target, and scope. |
| PublicationPlan | Validated, conflict-checked operations prepared for applying that approved proposal. |
| PublicationReceipt | Durable record of which operations actually applied, outcome, target fingerprints, and recovery references. |

A workspace is not the agent's memory, notebook, or model context. It is a scoped environment for file/tool operations. The notebook can reference workspace artifacts but does not replace source state.

## 3. OOP Interfaces and Objects

| Object | Responsibility |
| --- | --- |
| WorkspaceManager | Coordinates creation, attachment/resume, and lifecycle through providers. |
| WorkspaceProvider | Interchangeable isolated-workspace creation/capability contract. |
| GitCloneWorkspaceProvider | Builds an independent Git checkout/copy under explicit source-state rules. |
| GitWorktreeWorkspaceProvider | Creates a separate working tree where sharing repository metadata is acceptable. |
| DirectoryCopyWorkspaceProvider | Creates an isolated ordinary-directory snapshot under configured inclusion rules. |
| WorkspaceBoundary | Enforces permitted roots, path mapping, symlink rules, and tool access. |
| ChangeSetBuilder | Compares the frozen baseline and working state and creates an immutable proposal. |
| WorkspaceReviewService | Associates checks/guards and evidence with the exact proposal version. |
| PublicationApprovalStore | Stores approvals/rejections from the trusted user/host boundary. |
| WorkspacePublisher | Orchestrates validation and approved application through injected interfaces. |
| ConflictDetector | Detects source/target divergence and incompatible additions/edits/deletions. |
| PublicationJournal / RecoveryService | Records staged operations and reconciles interruption or partial application. |
| WorkspaceRetentionPolicy | Selects preserve/remove decisions for framework-owned temporary material; the retention service performs protected cleanup. |

Use small interfaces, constructor injection, private helpers, and registries/factories for provider behavior. WorkspacePublisher must not contain a growing switch for Git, directory, or transport variants. The list shows possible providers; the first implementation can supply one correct standalone provider plus fakes for the contract tests.

Contract sketch, with supporting types omitted:

```typescript
interface WorkspaceProvider {
  create(request: WorkspaceCreationRequest): Promise<WorkspaceHandle>;
}

interface WorkspacePublisher {
  prepare(request: PublicationRequest): Promise<PublicationPlan>;
  publish(
    plan: PublicationPlan,
    approval: PublicationApproval,
  ): Promise<PublicationReceipt>;
}
```

The caller/model cannot construct a trustworthy approval merely by filling an object. The publication boundary authenticates and resolves the approval against its trusted store, identity, target, exact proposal digest, and policy. The sketches describe capabilities rather than a full implementation.

## 4. Creating the Isolated Workspace

Before editing, capture an explicit source baseline. Record the source root, selected revision where applicable, included files/types/modes, content fingerprints, and snapshot identity. If the source changes while being copied, validate/retry a stable snapshot or fail clearly; do not call an inconsistent copy a valid baseline.

An ordinary Git clone of a repository revision does not automatically include its uncommitted modifications or untracked files. The creation contract must choose and display the source state:

- Selected committed revision, explicitly requested/configured.
- Current working state, including approved dirty/untracked files captured in the manifest.

Do not silently discard local work or stage/commit the user's repository to create a baseline. The provider documents submodule/nested-repository behavior. Unsupported boundaries are explicit rather than silently copied with incorrect semantics.

Copy/include/exclude policies bound the workspace. Caches, generated files, dependencies, secrets, and environment files are included or excluded deliberately. Excluded files do not become deletion proposals merely because they are absent from the working copy. The environment may receive runtime configuration through a separate scoped mechanism rather than publishing credentials.

Filesystem isolation limits the edited paths but is not a complete process sandbox: commands with network/database credentials can affect external systems. Capabilities and execution adapters must separately control such side effects. A Git worktree also shares repository metadata; providers must state that boundary honestly.

## 5. Give Agent Tools the Working Workspace

A workflow run records its workspace identity. Step/executor inputs use the working-workspace reference, and composition injects file, command, search, verification, and guard capabilities rooted there.

```text
AgenticMindUnit assignment:
  Goal: Add Google login.
  Workspace: isolated-workspace-42.
  Permissions: read/write/check inside the approved working boundary.
  Publication capability: not included.
```

The model does not get raw unrestricted access to the original root. WorkspaceBoundary verifies canonical paths and parent components to prevent traversal or symlink escapes, and applies an explicit policy for links and unsupported file types. Resolving a path once is insufficient if links can change before access; concrete adapters must protect the actual operation boundary.

The same workspace can be shared by the run's sequential steps while each AgenticSession keeps isolated loop state. Concurrent edits require coordination; separate runs should normally use separate working workspaces. Model handoffs preserve the workspace reference and current revision/fingerprint, not a blind copy of stale content.

## 6. Build a ChangeSet, Not a Whole-Directory Replacement

Compare the working state against its captured baseline:

| Operation | Publication meaning |
| --- | --- |
| Modify | Replace an approved existing path's content/mode with its reviewed version after baseline/conflict checks. |
| Add | Create an approved new path only when the target's current state permits it. |
| Delete | Remove an explicitly listed baseline path after approval and conflict checks. |
| Rename | Apply an explicit rename where supported, or visible linked add/delete operations. |

Only included managed paths participate. Preserve unrelated target files, excluded content, Git metadata, and paths outside the proposal. Never synchronize an entire cloned directory over the original with deletion of everything absent.

A ChangeSet records stable proposal/version/digest, baseline and source scope, target identity, per-path before/after fingerprints and expected existence/type/mode, immutable proposed content/artifact references, operation kind, and relevant validation/report references. Binary data and executable bits need exact handling. A symlink target must not be dereferenced as an ordinary file replacement.

Once a proposal is prepared for review, freeze its content. Continued edits create a new proposal version; the publisher applies stored approved content, not whatever happens to be on disk later in the working directory.

## 7. Review and Approval

The user receives a concrete bundle:

```text
Proposal: changes-42/v3
Target: original shop workspace

Modified: auth/login.ts
Added: auth/googleCallback.ts
Added: tests/auth/googleCallback.test.ts
Deleted: none

Verification: recorded results for the reviewed source snapshot
Guards: OOP and ESLint reports with rule/configuration versions
Remaining issues: explicitly listed
Diff/artifacts: inspectable references
```

The approval specifies the proposal digest/version, target, approved operation/path scope, and trusted approver. Rejection or a request for changes leaves the target unchanged and the work reviewable.

There is no approval requirement for every draft edit inside the authorized isolated workspace. Approval is the final publication gate, after work and checks make the proposed result concrete. The agent cannot self-approve, and a System 1 decision cannot substitute for the user's approval.

If the proposal changes after approval, that approval does not cover the new version. Do not apply a partially approved mixture of versions. Subset publication, if supported, is an explicit new proposal with appropriate dependency/verification checks and approval, not silent omission of difficult paths.

## 8. Original-Workspace Changes and Conflicts

The user can continue editing the original while the agent works. Before publication, compare each target path to the expected baseline state and check the validation snapshot's relevant context.

```text
Baseline: auth/login.ts = A
Working proposal: auth/login.ts = B
Current target: auth/login.ts = C

C differs from A → conflict, not permission to overwrite C.
```

If the current target already equals the approved after-state, record that operation as already applied only after validating publication identity/state; do not infer that the whole proposal was published.

An add conflicts when a different file now exists. A delete conflicts when the target was modified or its type changed. A rename checks both paths. Unrelated files remain untouched, but changes to dependencies/configuration can make previously passing checks stale even when changed-path application itself is conflict-free. Track a review/validation context fingerprint and revalidate where required.

Conflict resolution can produce a three-way merge candidate from baseline, proposal, and current target. The merge changes the reviewed content/context and therefore requires new checks and a new explicit approval; do not overwrite user edits or silently publish a newly merged result under the old approval.

## 9. Applying Approved Operations

1. Resolve the trusted approval and verify proposal/target identity and digest.
2. Confirm required verification/guard coverage against the approved content and applicable policy.
3. Acquire scoped publication coordination and recheck current target state just before application.
4. Stage the exact approved content and record a durable journal of intended operations, before-state references, and expected outcomes.
5. Apply validated operations using provider-specific safe primitives and record operation results.
6. Verify applied fingerprints and persist a receipt with complete, conflict, failed, or partial/uncertain outcome.
7. Release coordination and retain evidence/recovery data under policy.

A framework publication lock only coordinates cooperating writers. Other editors may still write. Use the adapter's actual conditional-write or exclusive-access guarantees; if those cannot protect the target boundary, detect conflicts and stop rather than promise conflict-free concurrent replacement.

An ordinary directory does not provide an atomic multi-file transaction merely because each file can be staged and renamed atomically. The provider must declare its guarantees. If partial application is possible, journal it and expose partial/uncertain outcomes instead of reporting success. A snapshot/swap or transactional provider can offer stronger semantics only where those mechanisms are actually supported.

Rollback/recovery restores a path only when its current content still matches the publisher's recorded applied state. It must not overwrite a new user edit made after partial application. Retain the original snapshot/references and require reconciliation when safe rollback cannot be established.

Publication has its own domain lifecycle, distinct from workspace existence and the parent workflow run. Prepared/approved does not mean published; confirmed receipts and partial/conflict outcomes coordinate parent completion through explicit domain rules. See [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md) for transitions, ownership, and approval/recovery examples.

## 10. Recovery, Approval Waiting, and Cleanup

Persist workspace identity/provider/baseline, proposal snapshots, approval state, journal operation IDs, and receipts. A process restart resumes inspection/reconciliation; it does not obtain fresh approval or repeat a side-effecting operation blindly.

Waiting for approval is an explicit workflow/publication state. Release expensive execution resources while waiting and keep the proposal durable. Existing absolute deadlines continue according to the configured limits policy; approval does not automatically renew an expired run. A separately authorized publication operation can have its own bounded scope referencing the same immutable proposal and valid approval.

A duplicate publish request uses a stable idempotency key and receipt/journal lookup. Report completed, partial, or uncertain prior work before deciding which remaining operations are safe.

Cleanup applies only to framework-owned working copies and artifacts. Preserve review proposals, necessary recovery references, and user work under retention policy. Never delete the original workspace as cleanup. Failed/rejected proposals can remain inspectable according to configured retention and storage quotas.

## 11. Guards, Memory, Models, and Limits

OOP/ESLint guards are selected through System 1 as designed, then run against the working snapshot. Reports record workspace/proposal/source identities. Publication checks report freshness and coverage; a passing old report does not certify edited proposal content or a changed target context.

Models work only within the configured working capabilities. DecisionUnit can classify task relevance and optional review needs but cannot approve publication, waive target conflicts, or grant broader paths. Agent memory can reference proposal/receipt evidence; drafted changes are not recorded as successfully published outcomes until confirmed.

Bound clone/copy time and bytes, disk usage, file count, diff/artifact size, command resources, retained snapshots, review bundle size, pending proposals, and publish operations/time. Keep bounded finalization/recovery capacity and emit explicit quota/deadline failures. Publication journal/storage exhaustion must not be hidden behind a success status.

## 12. Debug Events

Use the shared recorder for workspace.created/snapshot.captured, workspace.change_set.prepared, workspace.review.ready, publication.approval.requested/recorded, publication.preflight, publication.conflict, publication.operation.started/completed/failed, publication.completed/partial, publication.recovery, and workspace.cleanup.

Correlate workspace/baseline/proposal/version/digest, trusted target identity, run/step/session, approval reference, operation IDs, path-safe summaries, before/after fingerprints, validation/guard references, durations, and reasons. Store large diffs as access-controlled artifacts. Do not put secrets or unrestricted source content into the timeline.

## 13. Example: Google Login

1. Capture the approved current state of /projects/shop, including explicitly included local modifications, as baseline-42.
2. WorkspaceProvider creates working-workspace-42 under framework-owned storage.
3. Investigation, planning, coding, verification, and guards operate there. Original files remain untouched by those scoped editing capabilities.
4. ChangeSetBuilder freezes changes-42/v1 with two edits and one new test file, plus exact content and evidence references.
5. The user inspects the diff/checks and requests a correction. The agent edits the isolated copy and produces changes-42/v2; v1 is not silently changed.
6. After checks, the user approves v2 for the original shop target.
7. WorkspacePublisher checks that target paths and required validation context still match. If the user changed auth/login.ts meanwhile, it reports a conflict and leaves conflicting work unapplied under preflight policy.
8. The resolved candidate gets new checks and approval if needed. A conflict-free approved plan applies only its listed paths and verifies final fingerprints.
9. The receipt records actual publication. The workflow/agent reports completion and can retain a supported episode of the published outcome.

## 14. Files and First-Version Acceptance

Add workspaces/ inside the dedicated framework folder with contracts, domain objects, provider adapters, baseline/change-set builders, publication/approval/recovery services, and policies. Export supported APIs through index.ts. Reuse artifact, usage, checkpoint, event, guard, and execution-control capabilities rather than cloning those subsystems.

The first version demonstrates isolated creation from a clearly defined current-state baseline, edits/checks in that copy, immutable review bundles, trusted user approval, conflict-aware changed-file application, durable receipts/journaling, and recovery/cleanup. One correct directory-snapshot provider can establish semantics; Git clone/worktree adapters are interchangeable implementations with explicitly documented source-state guarantees.

Tests cover modifications/additions/deletions, excluded-file preservation, dirty/untracked baseline policy, binary/mode/type changes, unsafe paths/symlinks, source drift during copy, stale checks, missing/forged/wrong-target approval, changed proposal after approval, target conflicts, idempotent publication, partial failure/crash reconciliation, rollback conflict, quotas/deadlines, and retained original/user data. Use isolated fixture directories and fake approval sources; no real repository must be published to verify orchestration.

[Guards](20-guards-skills-rules-and-system-one-selection.md) · [Limits](18-limits-budgets-and-execution-control.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## Workspace Policies Use the Same Contract

Source-state, candidate-edit, conflict, and retention choices use implementations of Policy<TInput, TOutput> and apply(). WorkspaceRetentionPolicy describes an implementation role, not another base interface. For editing, Policy<WorkspaceEditPolicyInput, WorkspaceEditDecision> receives a staged candidate and trusted scope and returns allowed or rejected with issues. The workspace tool checks the result and commits only the exact permitted candidate against the expected revision. Publication still authenticates exact approval and reconciles actual effects; policy acceptance cannot substitute for user approval.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

