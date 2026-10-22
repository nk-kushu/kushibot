# 4. Workflows: The Plan That Connects the Steps

Suppose your class is building the wooden bridge from Chapter 1.

Your teacher writes a plan on the board:

```text
Research → Draw → Build → Test
```

Then the teacher adds:

> If the bridge cannot hold the book, repair it and test it again. You have enough materials for two repair rounds.

Now the plan explains more than the order of the jobs. It also explains what to do when something goes wrong and when to stop trying.

A **workflow** serves a similar purpose in kushibot. It connects assignments into an organized process, including the allowed paths after their results arrive.

This chapter explains the proposed design. The examples are teaching examples, not claims that these workflows have already run.

## A Workflow Answers Three Questions

A useful workflow explains:

1. **What work exists?** Investigate, specify, implement, verify, and review.
2. **How is the work connected?** Specification uses investigation findings; implementation uses the specification.
3. **What can happen after a result?** Continue, correct a problem, wait, stop, or finish.

A simple feature workflow might start with this path:

```text
Investigate → Specify → Implement → Verify → Review
```

Each name represents a step with an assignment, expected result, input policy, and assigned executor. We learned about steps and executors in Chapter 2.

The workflow connects those pieces. It does not contain the implementation of source searches, file edits, or test commands. Those jobs belong to the executors and their permitted capabilities.

## The Plan and Today's Progress Are Different

Imagine printing bridge-building instructions for two groups.

One group has finished its design. The other is already testing. Neither group's progress changes the printed instructions.

The same distinction matters in the framework:

| Reusable workflow definition | One particular run |
| --- | --- |
| Describes the assignments and allowed connections | Records which assignments have executed |
| Says verification follows implementation | Holds the actual verification report |
| Describes a permitted fix path | Records whether this task used that path |
| Can serve many requests | Belongs to one execution of a request |

“Add Google login” and “Add password reset” can use the same workflow. They have separate runs with different source references, reports, and progress.

Finishing Google login does not mark the reusable workflow itself as finished.

## The Engine Follows the Plan

The **workflow engine** coordinates an actual run using the definition.

Think of a class organizer checking the project instructions and arranging the next assignment. The organizer does not personally perform every research, building, and testing job.

For one step, the framework roughly does this:

```text
Engine selects a step permitted by the plan.
        ↓
StepRunner prepares its input and invokes the executor.
        ↓
The executor performs the assignment and returns an outcome.
        ↓
The framework checks the result and records valid progress.
        ↓
The result and progress are saved.
        ↓
The engine follows the applicable next path.
```

The run objects protect their own rules about progress. A repository saves their accepted state. The engine coordinates those collaborators rather than directly declaring every object complete.

If saving a required result fails, the engine must handle that failure before dependent work proceeds. A report returned by a worker is not automatically a report safely recorded for later use.

## Connections Also Carry Information

An arrow between steps means more than “do this afterward.” The next assignment needs the right information.

For example:

```text
Investigation result:
  Password login uses the existing session service.
  Evidence: inspected source references.
        ↓
Specification input:
  User goal + selected accepted investigation findings.
```

The workflow defines how the next step's input is prepared from available data. It does not automatically copy every file, conversation, or permission into the next worker.

A missing required result cannot be replaced with invented findings. The framework needs to report the problem or follow a configured recovery path.

## A Transition Is a Choice of Next Path

The word **transition** simply means moving from one point in the process to another.

After verification, several outcomes are possible:

| Outcome | Example next path, if configured |
| --- | --- |
| Required checks pass | Continue to review. |
| Checks run and find a code problem | Prepare a fix assignment if permitted. |
| A required checking tool is unavailable | Follow a bounded retry or stop with the missing evidence stated. |
| User cancels | Stop according to cancellation rules. |
| Time or budget is exhausted | Stop and report the available progress. |

The definition supplies the allowed paths. A **transition policy** applies configured rules to the actual outcome and determines the applicable path.

The model may help explain a problem. It cannot make a forbidden path valid simply by asking to skip required checks.

## A Failed Check Is Different From a Check That Never Ran

These two reports mean different things:

```text
Report A:
  Test ran.
  Expired login attempt was accepted.
  Expected rejection.
```

```text
Report B:
  Test could not start because its required service was unavailable.
  No behavior result is available.
```

Report A supplies evidence of a code problem. Report B supplies evidence of a blocked check, not proof that the behavior passed or failed.

The workflow should preserve that distinction. Blindly editing code after Report B may fix nothing because the code has not yet been checked.

## Fix Loops Need Boundaries

A workflow can return to implementation when checks or review find a problem.

```text
Implement → Verify
               ├── checks pass → Review
               └── code problem + fix permitted → Fix
                                                    ↓
                                                  Verify
```

The loop is useful, but it needs a stopping rule. Otherwise, the agent might keep making changes without reaching a useful result.

For our teaching example, suppose the host allows at most two correction rounds, subject to the remaining time and shared budget. Two rounds are a ceiling, not a promise that both will always be available.

Each correction gets its own step-execution record. The original failure stays in the run history. A technical retry, such as retrying a permitted failed connection, is a different event from another code-correction round.

If corrections do not solve the problem within the applicable limits, the workflow stops honestly with the remaining failures and evidence.

## Follow One Google-Login Workflow

The user asks:

> Prepare Google-login changes for review. Preserve password login and reject expired login attempts.

The host selects a feature-preparation workflow. Follow its decisions:

### 1. Investigation Produces Findings

The investigation executor inspects the permitted source and returns supported findings. The framework accepts and saves them.

**Next path:** specification, using the goal and relevant findings.

### 2. Specification Describes Expected Behavior

The specification executor explains how login attempts should be validated and how existing sessions should be created. It identifies required checks.

**Next path:** implementation, after the specification satisfies its acceptance rules.

### 3. Implementation Prepares the Code

The implementation executor edits the authorized working copy and returns references to the changed source.

**Next path:** verification of that prepared source.

### 4. Verification Finds an Expiry Bug

The password-login check passes. The expiry check runs but fails: an expired attempt can still create a session.

**Next path:** a focused fix, because a correction round is permitted and enough allowance remains.

### 5. A Fix Produces a New Source Revision

The worker corrects validation order and returns the updated source references.

**Next path:** verification again. Earlier passing tests alone do not establish that the changed source is correct.

### 6. Verification and Review Accept the Updated Work

Required checks run against the updated source, and review evaluates the proposal against the assignment and evidence.

**Next path:** finish preparation only if the configured completion criteria are satisfied. Any missing mandatory evidence keeps the work unfinished.

### 7. The Run Delivers the Agreed Result

This workflow ends with reviewed changes, check evidence, and a clear report of limitations. It does not include applying the changes to the original project.

A workflow that includes publication needs additional steps for a concrete proposal, trusted approval, actual application, and its recorded outcome. It must wait when required approval has not arrived. Preparing a feature does not imply deployment.

## Why Not Let Each Executor Choose Everything?

Imagine the bridge researcher deciding that no strength test is necessary, while the builder decides the project is finished as soon as the glue dries.

The group would lose its shared process.

Keeping the workflow outside the individual workers makes the agreed requirements easier to follow. The same investigation executor can participate in a feature workflow or an explanation-only workflow. Each plan decides how its findings fit the larger task.

Workers perform assignments. The workflow defines the process, and the engine coordinates its execution.

## Policies Prepare Inputs and Choose Allowed Paths

An input policy prepares each step's assignment. A transition policy considers the actual result and chooses an allowed next path. Both use the same Policy agreement and apply() method, but receive and return different kinds of information. The engine checks and carries out the choice; the policy cannot add an unknown step or erase a required check.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does completing a run change the reusable workflow into a completed plan?
2. What information should a specification step receive from investigation?
3. Is “test unavailable” the same outcome as “test ran and found a bug”?
4. Should a workflow keep fixing forever if checks still fail?
5. Can a preparation-only workflow claim that deployment happened?

Possible answers:

1. No. Completion belongs to that particular run.
2. The selected accepted findings and evidence needed for its assignment.
3. No. They provide different evidence and may need different next paths.
4. No. Corrections remain subject to explicit limits and stopping rules.
5. No. Deployment requires its own actual execution and evidence.

## Remember These Ideas

- A workflow connects assignments, information, and permitted next paths.
- The workflow definition is reusable; each run owns its progress.
- The engine coordinates execution, recording, and saving results.
- Actual outcomes determine which configured transition applies.
- Fix loops have limits, and completion depends on the agreed deliverable.

**Next chapter:** Executors: The Workers That Carry Out Assignments.

[Previous: Follow One Task Through the Framework](03-follow-one-task-through-the-framework.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
