# 6. AgenticMindUnit: The Worker That Uses a Model and Tools

Imagine asking a student:

> Find out how our classroom bridge was built. Read the project notes, inspect the drawing, and explain what you discovered.

The student does not know the answer immediately. They look for the notes, read them, notice a missing detail, inspect the drawing, and then prepare an answer.

Work often takes several small actions rather than one response.

An **AgenticMindUnit** supports that kind of work in the proposed kushibot framework. It combines one clear assignment, a model, permitted tools, working notes, and rules for continuing or stopping.

The name is long, but the basic idea is simple:

> Work toward a goal by asking for useful actions, examining what actually happened, and continuing within the allowed boundaries.

This chapter is a teaching example of the proposed design. The source files and findings below are illustrative.

## Why One Model Response May Not Be Enough

Suppose the assignment is:

> Explain how password login creates a session in this application.

A model cannot reliably know the current contents of the application just from that sentence. It needs evidence.

It might need to:

1. Search for login code.
2. Read the matching file.
3. Follow a reference to the session service.
4. Read that service.
5. Prepare findings supported by the inspected source.

The **next useful action** depends on what the previous action reveals. That is why the unit uses a loop.

A **loop** simply means repeating a process while there is more permitted work to do.

## The Model-and-Tool Loop

Here is the basic shape:

```text
Assignment and selected information
                 ↓
          Model responds
                 ↓
      Requests a tool action?
        ├── Yes → Validate request and check execution limits
        │                        ↓
        │               Run permitted tool
        │                        ↓
        │               Record observation
        │                        ↓
        │               Prepare next model request
        │                        └────────→ Model responds again
        │
        └── Proposes final result → Validate and apply completion rules
                                           ↓
                                  Return result or explicit stop
```

Cancellation, errors, deadlines, and exhausted limits can also stop the loop. A final result does not bypass those controls.

The model requests actions. The framework decides whether those requests are valid and allowed. Tools perform the actual operations and return observations.

An **observation** is information returned from an operation, such as search matches, file contents, or a tool error.

## Four Parts to Recognize

You do not need to memorize the implementation names, but knowing their jobs makes the story easier:

| Part                  | Simple job                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------ |
| AgenticMindUnit       | The public capability used to pursue one bounded assignment.                               |
| AgenticMindUnitRunner | **Coordinates** the reusable model-and-tool loop.                                          |
| AgenticSession        | Keeps the conversation, working state, counters, and operation records for one invocation. |
| DraftNotebook         | Holds concise working findings, references, open questions, and next actions.              |

Two assignments can use the same runner implementation while having different sessions and notebooks.

Think of a teacher reusing the same research method with two students. Each student still has a separate assignment folder.

## Give the Unit a Clear Assignment

The **investigation executor from Chapter 5 prepares a task like this:**

```text
Goal:
  Explain how password login creates and validates sessions.

Permitted tools:
  Search authorized source.
  Read authorized source.
  Update this session's working notes.

Boundary:
  Do not edit source files.

Expected result:
  Findings with source references and unresolved questions.

Limits:
  Stay within the configured calls, tool operations, time, and usage budget.
```

The host supplies the selected model gateway and registered tools through configured collaborators. Trusted execution controls determine the real access boundaries.

The model cannot add a write tool simply by saying it needs one. It also cannot increase its budget or silently replace the user goal.

## Follow One Investigation Turn by Turn

Before coding Google login, Project Helper needs to understand the existing session behavior. Follow the investigation unit inside that assignment.

### Turn 1: Ask Where Login Lives

The unit prepares a model request containing the assignment, mandatory instructions, available tool definitions, and selected context.

The model responds with a request such as:

```text
Requested action:
  Search the authorized source for password-login handling.
```

The framework validates the tool name and arguments, checks scope and limits, and dispatches the permitted search.

The tool returns:

```text
Search observation:
  A matching password-login handler was found.
  Source reference: auth/passwordLogin.ts
```

The observation is recorded and paired with its tool request. It becomes available for the next model request.

### Turn 2: Read the Handler

Using that observation, the model requests a read of the handler.

The read tool returns the actual permitted file content. In our example, it shows that successful password validation calls the session service.

The unit can now record a concise notebook entry:

```text
Finding: Successful password login calls the session service.
Evidence: Inspected handler source reference.
Next: Inspect session creation and validation.
```

These are useful working notes. They are not a transcript of private reasoning or automatically accepted long-term knowledge.

### Turn 3: Follow the Session Reference

The model requests the relevant session-service source. The framework checks and performs the read.

The observation explains how the session is created and provides a reference to validation behavior. The unit follows the relevant permitted reference if the assignment still needs it and allowance remains.

The model's understanding changes because it received new evidence. It does not need to guess based only on the filename.

### Turn 4: Deal With Something Missing

Suppose a referenced file is unavailable in the authorized source view.

The tool reports that limitation. The model may request a different permitted search to locate the behavior. If it cannot find supporting evidence, the final report must keep the question unresolved.

An unavailable file does not prove that validation is absent. The unit should distinguish “I did not establish this” from “the application does not do this.”

### Turn 5: Propose the Final Report

When enough supported information is available, the model proposes a final result:

```text
Summary:
  Password login creates a session through the existing session service.

Sources:
  References to the handler and session code inspected during this assignment.

Implication for Google login:
  Reuse the existing session-creation path after the new login flow is validated.

Open question:
  A referenced validation path could not be fully inspected.
```

The report must match what was actually inspected. A useful implication is still a proposal to consider, not proof that Google login has been implemented.

## How Does the Unit Know It Can Finish?

A model saying “done” is a proposal to finish. The framework checks the result contract and applies the configured completion policy.

For this investigation, it might require a summary, evidence references, and an explicit account of unresolved questions.

If complete validation behavior was mandatory and remains unknown, the unit cannot claim the assignment is complete. It may continue within policy and limits or return an explicit unsuccessful outcome with available findings.

If the assignment permits a bounded report with stated uncertainties, that report may be acceptable. Acceptance depends on the actual criteria.

A report passing its shape checks does not prove every statement is true. Evidence review and later verification retain their own jobs.

## Return Through the Executor

The unit returns a completed result or an **explicit failed, stopped, cancelled, or interrupted outcome.**

The executor maps that outcome into its own task result. **StepRunner returns it to the engine**, which coordinates acceptance, recording, and saving before dependent workflow work proceeds.

```text
Unit completes its bounded investigation
                 ↓
Investigation executor returns its task result
                 ↓
Framework accepts and saves the step outcome
                 ↓
Workflow may continue to specification
```

Completing the unit does not automatically complete the workflow step, and completing investigation does not complete the user's whole feature.

The unit can also be used directly by trusted application code without creating a workflow. Its limits and permissions still apply.

## What Stops an Endless Loop?

Useful work needs boundaries. The unit checks cancellation and applicable limits before further operations.

For example, the **framework can limit calls, tool operations, iterations, time, and total usage.** An iteration is a unit of progress through the loop under a documented counting rule; it is not automatically equal to one tool call.

If the model repeatedly searches without finding new information, **a configured no-progress policy can stop or escalate the work**. Creating another session does not erase consumed run-wide usage.

A stopped outcome should explain the reason and preserve useful evidence. It should not pretend that an unfinished investigation succeeded.

## What If an Operation Is Interrupted?

Suppose an editing unit requested a file write just before the process stopped. The write might have happened even if its response was not recorded.

**Recovery needs the session's operation records and protocol state** as well as working notes. The framework checks the uncertain effect before repeating it.

A notebook entry saying “edit next” is not enough to establish whether the edit already occurred.

For our read-only investigation, recovery can restore valid saved state and continue according to policy. Later chapters explain sessions and checkpoints in more detail.

## The Same Loop Can Serve Different Jobs

An investigator can use the unit with read and search tools. An editor can use the same loop design with explicitly permitted write tools in its working copy. A structured task can use it to prepare a specification from selected evidence.

The common loop is reusable. Assignments, tools, result contracts, and execution boundaries vary with the job.

That is why the executor uses this capability instead of implementing another model-and-tool loop for every kind of task.

## The Unit Uses the Same Policy Helpers

AgenticMindUnit runs the assignment. Its context policy chooses what the model sees; its completion policy checks whether a proposed final result is acceptable. Both follow Policy<TInput, TOutput> and apply(). The unit's runner calls the appropriate helper and enforces the session's limits. A new invocation gets its own session even when it reuses configured policy objects.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does requesting a file edit mean the model has changed the file?
2. Why does the next model request include tool observations?
3. Do two invocations using the same runner share one notebook?
4. Can “done” override missing mandatory evidence?
5. Is the notebook alone enough to recover an uncertain file write?

Possible answers:

1. No. A permitted tool must perform the operation, and its actual effect needs evidence.
2. So the model can choose its next response using what actually happened.
3. No. Each invocation has isolated session state.
4. No. Completion still depends on the result contract and acceptance rules.
5. No. Recovery also needs operation records and relevant execution state, followed by reconciliation of uncertainty.

## Remember These Ideas

- AgenticMindUnit pursues one clear assignment using a model and permitted tools.
- The runner coordinates the loop; each invocation has its own session.
- Tools return observations that inform the next model request.
- Working notes preserve useful findings without replacing evidence or run state.
- Completion, stopping, and recovery follow framework rules rather than a model's claims alone.

**Next chapter:** Sessions and Notebooks: Keeping Each Worker's Work Separate.

[Previous: Executors: The Workers That Carry Out Assignments](05-executors-the-workers-that-carry-out-assignments.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
