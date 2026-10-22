# 7. Sessions and Notebooks: Keeping Each Worker's Work Separate

Imagine two students sharing the same classroom research method.

Maya is investigating bridges. Leo is investigating boats. Both search for information, read it, take notes, and prepare a report.

They can follow the same method, but they need separate folders. Otherwise, Leo might use a bridge drawing as evidence for his boat, and Maya might accidentally overwrite Leo's notes.

The framework needs the same separation when its workers use models and tools.

**This chapter focuses on AgenticMindUnit's working state. Every executor does not need an AgenticSession or a DraftNotebook.**

An **AgenticSession** holds the working state of one AgenticMindUnit invocation. Its **DraftNotebook** holds concise working notes inside that session. WorkflowRun and StepRun track the larger process at different levels; they are not other names for a session or notebook.

This chapter explains the proposed kushibot design through illustrative examples. It does not describe sessions that have already run.

## A Session Is One Unit Invocation's Working Folder

In Chapter 6, we met the model-and-tool loop:

```text
Assignment → Model → Permitted tool → Observation → Model again
```

The session keeps track of that particular execution as the loop progresses.

It holds or references information such as:

- The model conversation and tool-call protocol.
- The session's working notebook.
- Counters and references to applicable usage accounting.
- Pending and completed operation records.
- Its identity and links to the surrounding execution.

A session is not the agent's entire life or the whole workflow. It belongs to one invocation of the unit.

The same runner can coordinate different sessions without sharing their mutable working state. Think of the runner as the reusable research method and the sessions as separate research folders.

## Four Different Records, Four Different Jobs

Imagine a school project folder with assignment sheets inside it. A student doing research also keeps a research folder, with a short notes page inside that folder.

Use that picture to distinguish the framework's records:

| Record             | What it tracks                                                                                                     | When it is needed                                                | Google-login example                                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **WorkflowRun**    | One execution of the whole workflow: goal, accepted results, and overall progress.                                 | When a request is executed through a workflow.                   | The run preparing the Google-login feature.                                   |
| **StepRun**        | One execution of a workflow step: its outcome, attempts, and relevant references.                                  | For each step execution in that run.                             | Investigation execution, implementation execution, or verification execution. |
| **AgenticSession** | One **AgenticMindUnit** invocation's model conversation, tool protocol, notebook, counters, and operation records. | When that capability is invoked, inside an executor or directly. | The investigation's model-and-tool session.                                   |
| **DraftNotebook**  | Concise active findings, evidence references, open questions, and next actions.                                    | As working notes owned by that AgenticSession.                   | “Session creation found; inspect expiry validation next.”                     |

The notebook is part of the session. The session can operate inside a step execution. The step execution belongs to its workflow run.

**A StepRun tracks the assignment's execution. An AgenticSession tracks model-and-tool work used to carry it out. A DraftNotebook is only the notes within that session.**

## Example 1: An Investigation Uses AgenticMindUnit

```text
WorkflowRun: Prepare Google login
    │
    └── StepRun: Investigate existing authentication
            │
            └── Investigation executor invokes AgenticMindUnit
                    │
                    └── AgenticSession
                            ├── Model conversation and tool protocol
                            ├── Counters and operation records
                            └── DraftNotebook
```

Step by step:

1. The engine selects investigation within the Google-login run.
2. The investigation executor starts a unit invocation with its own session.
3. The session records model requests and tool observations. Its notebook keeps useful findings and open questions.
4. The unit returns an outcome to the executor.
5. The executor returns its task result. The framework checks, records, and saves the step outcome before using it in dependent work.

A completed session does not automatically mean the StepRun has an accepted, saved result. Investigation completing also does not mean the whole WorkflowRun is finished.

## Example 2: Verification Can Work Without AgenticMindUnit

A verification executor can directly run configured tests using ordinary code and a check runner:

```text
WorkflowRun: Prepare Google login
    │
    └── StepRun: Verify the prepared source
            │
            └── Verification executor
                    │
                    └── Check runner executes configured tests
                            └── Actual check outcomes and report

No AgenticMindUnit invocation in this example.
Therefore, no AgenticSession or DraftNotebook is needed for this check.
```

The verification execution still needs identity, operation records, limits, cancellation handling, and saved results. Its report may be stored in ArtifactStore. Those responsibilities exist without a model conversation or notebook.

If verification successfully runs a test that fails, the StepRun can record a completed checking assignment whose result contains a failed check. The feature still needs correction under the workflow's rules.

## They Do Not Have a One-to-One Relationship

Do not assume one workflow step always equals one AgenticSession.

- A direct check-running step can use no AgenticSession.
- An investigation step can use one session for its unit invocation.
- An executor that performs several authorized unit invocations can use several separate sessions within the same step execution, such as a supervisor and its sub-agents.
- Trusted application code can invoke AgenticMindUnit directly without a WorkflowRun or StepRun. That invocation still needs explicit identity, limits, and other execution controls.

A change of model starts a new session through the proposed handoff design. It does not automatically create a new workflow step or erase the run's existing usage.

The agent itself has a stable identity and configuration across requests. It is not any one of these execution records.

## The Notebook Is the Short Version of Active Work

A long investigation may produce many search matches and file contents. The worker benefits from short notes about what matters now.

A DraftNotebook might contain:

```text
Current assignment:
  Investigate session handling for Google-login planning.

Finding:
  Password login calls the existing session service.

Evidence:
  Reference to the inspected handler at source revision code-r0.

Open question:
  Where is session expiry checked?

Next action:
  Inspect the referenced validation code.
```

The notebook is useful because it keeps the active work easy to follow. It records concise findings, uncertainty, references, and next actions.

It is not a private reasoning transcript. It also does not turn a tentative finding into a confirmed fact merely by storing it.

## The Notebook Does Not Own the Rules

Suppose the notebook says:

> Next: edit the login handler.

**That note does not grant editing permission.** A read-only investigation session still has only its permitted capabilities.

Likewise, a note saying “tests passed” cannot replace an actual test report. A note saying “user approved” cannot create trusted approval.

Authoritative requirements, permissions, execution records, and acceptance rules remain with their proper owners. The notebook helps the worker navigate its assignment; it cannot override those controls.

## Follow Two Separate Assignments

Project Helper receives two requests:

> Add Google login while preserving password login.

And:

> Investigate why password-reset emails are delayed.

The requests have separate runs. Each starts an investigation session when admitted under the configured limits. They may progress at different times; isolation matters whether or not they run concurrently.

### Step 1: Create Separate Identities

Each investigation executor in this example invokes AgenticMindUnit, so the framework creates a separate investigation session for each invocation:

| Session | Assignment | Notebook focus |
| --- | --- | --- |
| login-investigation-1 | Understand authentication for Google login | Session creation and password-login behavior |
| reset-investigation-1 | Investigate delayed reset emails | Email delivery and queue observations |

**The IDs are illustrative labels. Their purpose is to connect operations and results to the correct execution.**

### Step 2: Record Observations Under the Correct Session

The login investigator reads authentication source. Its tool observations belong to `login-investigation-1`.

The reset investigator inspects permitted email-delivery evidence. Its observations belong to `reset-investigation-1`.

The sessions may read some of the same authorized files, but each conversation, notebook, and operation history stays separately owned.

### Step 3: Update the Correct Notebook

The login notebook might record:

> Session creation is shared by existing login paths. Inspect expiry validation next.

The reset notebook might record:

> A queue delay is visible in the supplied evidence. Determine whether retries explain it.

Neither finding should silently appear in the other's notebook. If information is useful elsewhere, it must be selected and passed through an authorized handoff or retrieval path.

### Step 4: Return Separate Results

Each investigation produces its own report, with source references and limitations.

The Google-login specification step receives selected accepted login findings. The password-reset task receives its own accepted investigation result.

One completed investigation cannot be mistaken for the other task's completion.

## Separate Sessions Do Not Automatically Mean Separate Files

**Two folders of notes do not prevent two students from drawing on the same physical sheet.**

Similarly, isolated sessions do not by themselves prevent file conflicts. Editing boundaries come from the workspace configuration and tool permissions.

Concurrent editing requires separate workspace isolation or explicit coordination. A separate notebook is not a substitute for either.

In our Google-login example, editing takes place in the authorized working copy. The session records that worker's activity; workspace controls determine where its file tools can operate.

## What Does the Model Actually See?

The session can retain more information than fits in the next model request.

Before a model call, **AgentContextComposer** prepares a useful view from the assignment, required instructions, notebook, selected evidence, and relevant observations.

For example:

```text
Required goal:
  Preserve password login while preparing Google-login changes.

Current finding:
  Existing login uses the session service.

Open question:
  Expiry validation has not been established.

Recent observation:
  The handler refers to a validation module.
```

Omitting an old file excerpt from that request does not necessarily delete it from storage. Required rules still need to be represented clearly enough for the model to act correctly.

We will explore context selection in a later chapter.

## What Can Move to the Next Session?

When investigation ends, implementation **does not need to inherit its entire live conversation.**

The next assignment can receive the accepted report, relevant source references, requirements, and unresolved questions. **If a longer report is needed, it can be retrieved through authorized artifact access.**

The new session starts with its own notebook and operation state. It does not mutate the previous session's notes as if they were one shared scratchpad.

A change of model also uses an explicit handoff into a new session under the proposed routing design. That handoff does not reset the run's consumed budget or enlarge permissions.

## A Notebook Is Not Long-Term Memory

Different stores answer different questions:

| Information | Question it helps answer |
| --- | --- |
| DraftNotebook | What matters in this active session? |
| Run records | What happened in this workflow execution? |
| ArtifactStore | Where is the produced report or other material? |
| AgentMemory | What supported knowledge may help future tasks? |
| Checkpoint | What execution state is needed for safe restoration? |

A useful notebook finding can become a proposal for durable memory through the configured validation process. It is not automatically promoted into a permanent fact.

Source references and freshness matter. A finding about `code-r0` may need checking again after the source changes to `code-r1`.

## Why Saving the Notebook Is Not Enough for Recovery

Suppose an editing session has this note:

> Next action: save the callback handler.

The framework dispatches a write, and the process stops before its response is recorded.

Did the write happen? The note cannot answer that.

Safe recovery needs more than notebook text:

1. Restore the relevant saved conversation and execution state.
2. Identify the pending operation and its recorded identity.
3. Reconcile whether the file effect happened.
4. Continue under the remaining permissions and budget.

The framework must preserve valid tool-call/result pairing as part of recovery. It recreates live services rather than treating a saved notebook as a running client.

A checkpoint supports restoration; operation records help establish what happened. The notebook supplies useful working context, but it does not replace either.

## Shared Configuration, Separate Session Information

Configured policies can be reused, but they receive the current invocation's own information. Their apply() method must not mix one session's notebook or conversation with another. Policy objects configure choices; AgenticSession owns the working state. Step input policies prepare assignments even for executors that use no model session.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Can two sessions use the same runner while keeping separate notes?
2. Does a notebook entry grant a new tool permission?
3. Does session isolation alone prevent concurrent file edits from conflicting?
4. Does every stored observation need to appear in every model request?
5. Can a notebook alone establish whether an interrupted write succeeded?
6. Does a verification executor that directly runs tests need an AgenticSession?
7. Does one StepRun always contain exactly one AgenticSession?

Possible answers:

1. Yes. The reusable runner coordinates separately owned session state.
2. No. Trusted configuration and execution controls supply permissions.
3. No. Workspace isolation or explicit coordination is also needed.
4. No. The composer selects a useful view within the applicable limits.
5. No. Recovery needs execution records and reconciliation of the actual effect.
6. No. It still needs its execution controls, operation records, and results, but it does not need a model-and-tool session for that direct check.
7. No. Depending on its implementation, a step execution can use zero, one, or several unit invocations with separate sessions.

## Remember These Ideas

- WorkflowRun tracks the whole workflow execution; StepRun tracks one step execution.
- AgenticSession and DraftNotebook belong specifically to AgenticMindUnit work, not to every executor.
- Each unit invocation has its own session, conversation, notebook, counters, and operation records.
- A notebook contains concise working findings and next actions, with uncertainty preserved.
- Required rules and actual execution evidence remain authoritative.
- Workers exchange selected authorized results rather than sharing one mutable notebook.
- Session isolation, workspace isolation, long-term memory, and recovery solve different problems.

**Next chapter:** Tools: How an Agent Reads, Searches, and Changes Things.

[Previous: AgenticMindUnit: The Worker That Uses a Model and Tools](06-agentic-mind-unit-the-worker-that-uses-a-model-and-tools.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
