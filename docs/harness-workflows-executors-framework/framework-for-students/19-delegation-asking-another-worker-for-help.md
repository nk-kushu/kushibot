# 19. Sub-Agents: Asking Another Worker for Help

Imagine your class is designing the wooden bridge.

Maya is responsible for preparing the design, but she needs to know which supports worked in earlier tests. She asks Leo:

> Read the earlier test reports. Tell me which support shapes were tested, what happened, and where the evidence is. Do not change the design yet.

Leo receives a focused assignment. **He uses his own notes and returns findings.** Maya then uses those findings to continue her design.

That helper is a **sub-agent**: a separate agent instance that receives a bounded assignment, works in its own session, and returns an outcome to its parent agent.

**The framework must support sub-agents.** A parent **AgenticMindUnit** can request a child AgenticMindUnit with its own session, conversation, notebook, permitted tools, model selection, and result contract. This chapter explains that design using illustrative assignments and outcomes, not an actual execution.

## The OOP Capability Is Sub-Agent Support

The proposed public names make this explicit:

| Object | Responsibility |
| --- | --- |
| spawnSubAgent / SpawnSubAgentTool | Let an authorized parent request a sub-agent with a focused assignment. |
| SubAgentCoordinator | Validate runtime boundaries, record parent/child identity, coordinate construction, and deliver the outcome. |
| BoundedSubAgentPolicy | Apply configured admission rules through the shared Policy contract. |
| AgenticUnitFactory | Assemble the child AgenticMindUnit from registered models, tools, result contracts, and a separate session. |

A sub-agent runs the reusable model/tool loop on its own assignment; it is more than an extra prompt or a plain function call. **The parent receives its bounded result rather than sharing mutable conversation state.** A distinct session does not require a separate operating-system process or a newly generated class.

These names describe the intended framework design, not already implemented exports. Editing sub-agents sharing a workspace run one at a time by default. Concurrent execution requires explicit scheduling; concurrent editing additionally requires workspace isolation or reliable coordination.

## Parent and Child Describe a Relationship

The supervising unit is called the **parent**. The sub-agent unit is called the **child**.

These names describe how their assignments are linked. They do not mean the child has unrestricted access to the parent's state or **that the parent can grant arbitrary powers.**

```text
Supervisor pursues its assignment
                ↓
Requests a focused child assignment
                ↓
Framework validates and constructs the permitted child
                ↓
Child investigates in its own session
                ↓
Validated outcome returns to the supervisor
                ↓
Supervisor continues its own work
```

The framework assembles existing registered capabilities. The model does not invent executable classes or install new tools at runtime.

## Why Use Sub-Agents?

A **focused helper can investigate one question** while keeping its own conversation and notebook separate from the supervisor's broader task.

For example, a planning supervisor preparing Google login might need two investigations:

1. How does the existing application create and validate sessions?
2. Which authentication tests exist, and which behaviors remain uncovered?

Those **findings can inform a specification**. **The supervisor still needs to combine them** with the user's requirements and produce its own result.

The framework provides sub-agent support; each parent receives the spawnSubAgent tool only when its trusted configuration permits it. A unit without that tool remains valid. Creating a child also adds coordination and usage costs, so it should serve a useful bounded purpose.

## Write a Clear Child Assignment

A request for “help with login” is too vague. A useful sub-agent assignment explains the goal, scope, expected evidence, and completion criteria.

An illustrative request is:

```text
Purpose:
  Investigate existing session handling for Google-login planning.

Goal:
  Explain how password login creates and validates a session.

Completion criteria:
  Identify relevant source.
  Support findings with inspected source references.
  State unresolved questions explicitly.

Requested capabilities:
  Registered workspace-read-only tool set.
  Registered investigation model role.
  Registered investigation-findings result contract.

Local limit:
  At most six iterations, within the inherited allowance.
```

Requested names refer to trusted registrations. **They are not permission to create arbitrary tools or define a new executable validator.**

The host supplies the actual authorized workspace and identity. A project name written by the model cannot redirect the child into another project's files.

## The Framework Checks Before Starting a Child

A proposed **SubAgentCoordinator** receives the request through the permitted sub-agent tool. Its policy checks matters such as:

- Whether the request meets its input contract.
- Whether the requested tools, model role, and result contract are allowed.
- Whether the assignment stays within the parent's authorized scope.
- Whether child count, nesting depth, concurrency, deadline, and budget limits permit it.

If accepted, the framework records a stable sub-agent identity before dispatching work. If rejected, the parent receives an explicit reason rather than a pretend child report.

A read-only planning parent cannot gain editing powers simply by requesting an editing child. Child limits can narrow inherited limits; they cannot enlarge them.

## Follow Google-Login Planning Step by Step

The user asks:

> Prepare a specification for Google login. Preserve password login and reject expired login attempts. Do not publish changes.

### Step 1: Start the Supervisor

The specification executor starts a supervising AgenticMindUnit session with its assignment, relevant instructions, permitted capabilities, and expected specification contract.

Its tool registry includes the optional sub-agent capability. The selected source view is a fixed snapshot for this example, so the investigation evidence stays tied to an identifiable version.

### Step 2: Request Session Investigation

The supervisor requests the bounded session-handling investigation described above.

The framework validates the request and records a sub-agent ID linked to the parent tool-operation identity.

AgenticUnitFactory resolves the eligible model, permitted read/search tools, and registered result contract. It creates a fresh child session using the existing unit implementation.

### Step 3: Let the Child Work Separately

The child receives selected assignment context and inherited constraints. It has its own conversation, DraftNotebook, counters, and operation records.

Its tools inspect the authorized source. Suppose it finds that password login creates a session through an existing service and identifies the relevant validation path.

The child records evidence references and any open questions in its own notebook. It does not edit the parent's notebook or promote observations into confirmed long-term memory automatically.

### Step 4: Record the Parent's Wait

In this initial sequential design, the parent waits for the child's outcome before continuing its model loop.

Waiting is recorded as a pending operation. The parent does not keep a model-call execution slot that would prevent the child from acquiring the same capacity. No database transaction stays open throughout the investigation.

A simple first version can admit one child at a time and forbid sub-agents from spawning further sub-agents.

### Step 5: Return a Validated Report

The child proposes its final report. The framework applies the registered runtime contract and applicable completion rules.

It saves the outcome and any full report artifact, then delivers a bounded observation to the parent:

```text
Sub-agent: session-investigation-1
Outcome: Completed
Source: The assigned fixed source snapshot
Summary: Existing password login uses the session service.
Evidence: Inspected handler and session-code references
Open questions: Listed explicitly in the report
Full report: Authorized artifact reference
```

A valid report shape does not prove every conclusion. The supervisor can inspect the evidence through permitted access when needed.

### Step 6: Investigate Existing Tests

The supervisor requests a second bounded child to inspect authentication tests. It starts only after the first child finishes under this sequential policy.

Suppose the child finds password-login regression coverage but no expiry test for a Google-login callback that has not yet been implemented.

It reports what it actually inspected and proposes needed cases. It cannot claim those proposed tests already ran.

The second child receives only selected permitted references from earlier findings when useful, not unrestricted access to the first child's notebook.

### Step 7: Produce the Supervisor's Own Result

The supervisor combines the reports with the authoritative assignment and rules.

Its specification can now explain session reuse, expiry handling, required regression coverage, and unresolved configuration needs.

The supervisor returns its own result. The executor maps the unit outcome into its task contract. The engine coordinates acceptance and saving before the next declared workflow transition.

Two child investigations have supported one specification step. They have not automatically created two additional workflow steps or completed implementation.

## A Failed Child Must Remain a Failed Child

A child can fail, stop at a limit, be cancelled, or be interrupted. Its outcome should preserve the reason and available evidence.

For example:

```text
Outcome: Stopped
Reason: Required validation source could not be inspected within the allowance.
Available evidence: Session creation findings and inspected references.
Unresolved: Session validation behavior.
```

The parent may continue with explicitly permitted uncertainty, request another bounded assignment if allowed, or stop. It must not interpret an empty or unsuccessful report as confirmed findings.

Child success also does not prove parent success. The parent's own completion criteria still apply.

## All Workers Share the Applicable Allowance

**Parents and children consume the shared run and agent budget**, with local limits inside it. Routing calls, model calls, tools, retries, and report handling still count.

**Creating a new child does not reset consumed usage or escape workflow correction limits.**

The framework bounds child count, depth, concurrent children, context and report sizes, and repeated sub-agent requests without progress. More helpers are not an unlimited source of free work.

## Why Separate Sessions Do Not Separate Files

A session keeps a sub-agent's conversation, notebook, and progress separate. It does not automatically give that sub-agent a separate copy of the project files.

Imagine two sub-agents sharing the same working workspace:

1. Sub-agent A reads `login.ts` to add Google login.
2. Sub-agent B reads the same version of `login.ts` to fix password login.
3. A saves a version containing its Google-login changes.
4. B saves its version based on the earlier file. That save could overwrite A's changes.

Their conversations were separate, but their edits targeted the same file. Separate session IDs do not prevent this conflict.

## Default: Editing Sub-Agents Work One at a Time

**Sequential editing is the default for editing sub-agents that share a working workspace.** The framework admits one editing sub-agent at a time, even if assignments mention different files. Other editing sub-agents wait before reading the source they will use for their edits.

For the same `login.ts` example:

1. The parent requests sub-agent A to add Google login and sub-agent B to fix password login. Both assignments explicitly permit changes to `login.ts` within the parent's allowed scope.
2. SubAgentCoordinator starts A and queues B. B does not prepare edits from an old copy while waiting.
3. A reads the current file, makes its permitted changes, and finishes. The framework records its actual outcome and reconciles any unfinished write operations before releasing the workspace for the next editor.
4. B starts afterward, reads the updated `login.ts`, and prepares its fix using A's changes as the starting point.
5. B saves its fix. The resulting file can contain both changes, subject to the usual review and verification.

```text
Shared working workspace

A: read current login.ts → add Google login → save → finish
                                                        ↓
B:                                                read updated login.ts
                                                        ↓
                                                  fix password login
                                                        ↓
                                                  save → finish
```

The order must be enforced by a workspace-scoped scheduler or editing gate, coordinated through SubAgentCoordinator, rather than by asking models to take turns. All editing sub-agents targeting that workspace use the same gate. The parent must also avoid concurrent writes there; other framework-managed writers must participate in the same coordination. External edits require source-change detection before applying a stale write.

**Explicitly permitted scope** means stating which files or paths an editing sub-agent may change. For example, A can be allowed to edit `login.ts` while changes to deployment configuration remain forbidden. Working one at a time does not grant broader permissions.

A failed, cancelled, or interrupted editor must have pending write effects reconciled before the next editor proceeds. The next sub-agent reads the actual current source; a failed editor may have left partial changes that need review or cleanup.

This default prevents overlapping framework-managed editors, but does not prove that the code is correct. Applicable checks and review still run against the resulting source.

Concurrent editing is a future explicit option requiring separate working copies with controlled merging, or another reliable coordination mechanism. Read-only investigations can be considered for parallel scheduling separately; if editing is happening, they need a fixed snapshot or source-version checks so their reports describe identifiable evidence.

## Recover Without Starting the Same Child Twice

Suppose the child finishes and its outcome is saved, but the process stops before the parent receives it.

Recovery looks up the recorded sub-agent and pending parent tool operation. It can attach the stored outcome without launching a duplicate investigation or adding duplicate observations to the conversation.

If work was still pending or an effect is uncertain, recovery reconciles that state before resuming. Stable operation identities distinguish a repeated delivery from a genuinely new assignment.

Parent cancellation propagates to active children, followed by the required effect reconciliation. A child's own failure does not automatically cancel unrelated work unless policy says it should.

## Sub-Agents Do Not Replace Approval or Evidence

A child saying “publish the feature” does not authorize publication. A child saying “tests passed” needs actual applicable check evidence.

Provider prompt caching may reuse supported input computation inside child model calls. Each request still reaches the provider and generates a new response. This optimization does not complete the sub-agent lifecycle or prove that a tool action executed.

The coordinator remains responsible for controlled construction, outcome delivery, accounting, and recovery.

## SubAgentPolicy Uses the Shared Policy Contract

The sub-agent admission policy receives a child request, allowed capabilities, parent limits, and depth. It returns an accepted bounded assignment or rejection through apply(), using the common Policy agreement. The coordinator records and starts the child, supplies its separate session, and delivers its outcome. The policy cannot expand the parent's allowance.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Can a parent grant forbidden write access by requesting a child with write tools?
2. Does a child share the parent's mutable notebook?
3. Does a completed investigation child mean Google login is implemented?
4. Does another child receive a fresh run-wide budget?
5. After a crash, should a completed child automatically be launched again?
6. What is the default when two editing sub-agents share a workspace?

Possible answers:

1. No. The framework validates inherited permissions and scope.
2. No. It has its own session state and receives selected context.
3. No. It completed only its bounded investigation.
4. No. Shared consumption and parent limits remain in force.
5. No. Recover and deliver its stored outcome when valid instead of duplicating work.
6. Run them one at a time. The next editor reads the current files after the previous editor finishes and its pending writes are reconciled.

## Remember These Ideas

- A sub-agent is a child AgenticMindUnit with a focused assignment and its own execution session.
- The framework validates the request and assembles registered capabilities.
- Children have isolated sessions, inherited boundaries, and shared accounting.
- Separate sessions do not isolate shared files. Editing sub-agents use sequential editing by default, within explicit permitted paths.
- The parent receives a validated outcome and still owns its own assignment.
- Recovery, cancellation, and actual effects remain controlled execution responsibilities.

## Build Requests So the Provider Can Reuse Preparation

The framework must enable provider prompt caching by keeping unchanged instructions, tools, and answer requirements in a stable order and representation. The request composer builds that structure, and the provider adapter preserves it in the request it sends. Changing evidence still belongs in the correct current context; summaries or model changes may reduce reuse. Each request generates a new answer, and the provider decides whether cached input computation can be used. See [chapter 18](18-caching-reusing-work-when-it-is-still-useful.md).

**Next chapter:** Budgets and Limits: Knowing When to Continue or Stop.

[Previous: Caching: Reusing Work When It Is Still Useful](18-caching-reusing-work-when-it-is-still-useful.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
