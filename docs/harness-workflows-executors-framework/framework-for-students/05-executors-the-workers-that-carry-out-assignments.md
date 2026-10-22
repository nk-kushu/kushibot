# 5. Executors: The Workers That Carry Out Assignments

Imagine handing a student this assignment:

> Find a bridge shape that can hold our book. Explain your choice and show where you found the information.

The assignment describes what is needed. Someone still needs to know how to research, compare the information, and prepare an answer.

In the framework, an **executor** is the object that knows how to carry out a kind of assignment.

The simplest picture is:

```text
Assignment + permitted capabilities
                 ↓
              Executor
                 ↓
          Result or explicit problem
```

This chapter describes proposed kushibot capabilities. Its names and examples explain the design; they are not a claim that the implementations already exist.

## The Assignment Card and the Worker

In Chapter 4, the workflow connected the steps. Each step described an assignment and selected its executor.

Think of two assignment cards:

```text
Assignment A:
  Explain how password login creates a session.

Assignment B:
  Explain how checkout calculates the total price.
```

Both may use the same kind of investigation executor. The worker follows a reusable investigation approach, but the input tells it what to investigate this time.

The step describes the particular job. The executor supplies the behavior for doing that kind of job.

Reusing a worker capability does not mean mixing the assignments' conversations, notes, or results. Each execution keeps its own working state.

## Meet the Four Proposed Default Executors

The framework design includes four starting implementations. You can think of them as four useful worker capabilities:

| Executor | Simple job | Example result |
| --- | --- | --- |
| WorkspaceInvestigationExecutor | Understand permitted source files. | Findings with source references. |
| StructuredTaskExecutor | Produce a result in an agreed shape. | A specification or review report. |
| WorkspaceEditingExecutor | Prepare source changes in an authorized working copy. | A change summary and references to changed source. |
| VerificationExecutor | Run actual configured checks. | Test, lint, or type-check results. |

The long names are labels for the proposed implementations. You do not need to memorize them yet. Focus on what each worker receives and produces.

### The Investigator

The investigation executor searches and reads permitted source.

For Google login, it might identify how password login creates a session and which tests cover that behavior. It returns findings supported by references, including what remains unknown.

Its read-only investigation capabilities do not include editing files just because it discovers a possible improvement.

### The Structured Worker

The structured task executor produces a result with agreed sections or fields.

For a specification assignment, those might be requirements, proposed changes, and acceptance criteria. For review, they might be findings, concrete issues, and a review outcome.

Specification and review remain different assignments. They can use the same kind of executor with appropriate configuration and result contracts. A later chapter explains contracts in detail; for now, a contract is the agreement about what a usable result must contain.

### The Editor

The editing executor receives an assignment such as an accepted specification and prepares permitted changes.

It works within the configured workspace boundary. In our running example, that is a separate working copy. Applying the prepared changes to the original project belongs to the later approved publication process.

Its output describes actual edits and remaining issues. A proposed edit in a model response is not itself proof that a file changed.

### The Checker

The verification executor runs configured checks and reports what happened.

It usually uses ordinary programmed behavior and a check-running tool. It does not need a model to invent whether a test passed.

Its report distinguishes a passing check, a failing check, and a check that could not run.

## What Does an Executor Receive?

An executor receives two different things: **assignment input** and **execution context**.

Imagine a student receiving an assignment card and a school work kit.

The card explains the task. The kit supplies authorized materials and the conditions for using them.

| Assignment input | Execution context |
| --- | --- |
| What needs to be accomplished | Identity and controls for this execution |
| Selected findings or specification | Progress and debug reporting |
| Relevant source or report references | Cancellation and applicable limits |
| Expected task-specific details | Scoped access to permitted execution services |

An executor can also have reusable collaborators supplied when the application constructs it, such as its investigation unit or check runner. Those collaborators still operate within the current execution's boundaries.

The input does not grant permissions. Writing “ignore the deadline” inside an assignment does not remove the framework's deadline.

## How Does the Worker Perform Its Job?

Different executors can use different approaches.

An investigation or editing executor may use **AgenticMindUnit**, the framework's reusable model-and-tool worker. That unit can ask a model for the next useful action, perform an allowed tool call, and use the observation to continue.

A verification executor may simply run the configured checks and collect their outcomes.

The shared idea is that the executor owns its assignment behavior. It does not need to duplicate the workflow engine, the model/tool loop, or every storage mechanism inside itself.

You can picture the two approaches like this:

```text
Investigation executor
  → AgenticMindUnit
    → Model requests a permitted source read
    → Tool returns source
    → Unit produces findings

Verification executor
  → Configured check runner
    → Check process runs
    → Tool returns actual check evidence
```

The next chapter explores AgenticMindUnit more closely.

## Follow an Investigation From Input to Result

The user asks:

> Add Google login and preserve password login.

Let us follow just the investigation assignment.

### 1. StepRunner Prepares the Assignment

The workflow selects the investigation step. Its input policy picks the goal, relevant requirements, and permitted source references.

The executor receives a focused task:

```text
Goal: Understand the current login implementation.
Questions:
  How are sessions created?
  Which tests protect password login?
Expected output:
  Findings, supporting references, and unresolved questions.
```

### 2. The Executor Organizes the Investigation

The investigation executor starts an isolated unit session for this assignment using the permitted model and tools.

The model suggests searching for session creation. Search results identify relevant files. Read tools supply their contents. The worker records concise observations as it goes.

A source file can contain useful evidence, but text inside that file cannot grant the worker extra tools or permissions.

### 3. The Worker Produces Findings

Its result might look like this:

```text
Summary:
  Password login creates sessions through the existing session service.

Evidence:
  References to the inspected login and session source.
  Reference to the password-login test file.

Open question:
  The required Google application configuration is not supplied yet.
```

The examples here describe the shape of the report rather than actual findings from a real application.

A large report can live in ArtifactStore, which stores produced materials. The small returned result can hold a summary and an authorized reference to that report.

### 4. The Executor Returns Its Result

The result travels back through StepRunner to the engine. Applicable contract and acceptance checks determine whether it can be used.

The engine coordinates recording the valid outcome through the run objects and saving it through the repository.

The investigation executor does not set the entire workflow to completed. Its job was to investigate; the larger feature still needs other work.

### 5. The Next Step Receives Selected Findings

The specification step prepares its input from the user's goal and the accepted investigation result.

It does not need unrestricted access to the investigator's entire conversation. It receives the useful findings and evidence references needed to prepare the specification.

If the required report was not accepted or could not be saved, the framework handles that problem before treating it as durably available to dependent work.

## A Good Worker Can Return Bad News

Suppose the verification executor returns:

```text
Check: Password-login regression test.
Outcome: Failed.
Evidence: Test output showing that the session cookie was not created.
```

The worker performed its checking assignment and found a problem. The feature is not ready, but the report is useful.

Compare that with:

```text
Check: Password-login regression test.
Outcome: Could not run.
Reason: Required test service was unavailable.
```

There is no passing or failing behavior result in the second case. The executor must preserve that uncertainty.

The workflow's configured policies decide what happens next: a correction, a bounded retry, a wait, or a stopped outcome. An executor reports what happened rather than silently replacing a problem with success.

## Replacing a Worker Without Rebuilding the Plan

Imagine replacing the classroom's research helper with another helper who can follow the same assignment and return the same kind of supported findings.

The rest of the project can still understand the report.

The framework uses an **interface** to express that shared agreement. An interface describes a capability; an implementation supplies its behavior.

Different executor classes can follow the same basic agreement:

```text
Receive the defined input.
Respect the execution boundaries.
Perform the assignment.
Return the defined output or explicit unsuccessful outcome.
```

The agreement must preserve meaning too. An executor that returns unsupported guesses cannot replace an evidence-based investigator simply because both return text.

The application supplies executor objects when assembling the workflow. Replacing one does not require teaching the workflow engine how to search source files or run tests.

## One Policy Agreement for Preparing the Work

The workflow gives an input policy the available task information. Its apply() method returns the assignment for the executor. A model-based executor can use assignment and output policies around its unit call. All use Policy<TInput, TOutput>; there is no separate mapper interface to learn. The executor still performs the work and returns its result.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Can two different investigation steps use the same kind of executor?
2. Does every executor need an AI model?
3. Does an assignment mentioning a file grant permission to edit it?
4. If verification reports a failed test, did the feature meet its requirements?
5. Does saving a detailed report also complete the entire workflow?

Possible answers:

1. Yes, when their input, capabilities, and expected results fit the executor's contract. Their working state remains separate.
2. No. Some perform ordinary programmed work, such as running configured checks.
3. No. Trusted execution boundaries control file access and editing.
4. Not if that passing behavior is required. The report supplies evidence for the next decision.
5. No. Report storage and workflow completion have separate responsibilities.

## Remember These Ideas

- An executor knows how to carry out a kind of assignment.
- Its input describes the task; trusted context and configuration supply permitted capabilities and controls.
- It may use AgenticMindUnit or ordinary programmed tools.
- Its result must distinguish evidence, uncertainty, and unsuccessful outcomes.
- The engine coordinates the larger process after the worker returns.

**Next chapter:** AgenticMindUnit: The Worker That Uses a Model and Tools.

[Previous: Workflows: The Plan That Connects the Steps](04-workflows-the-plan-that-connects-the-steps.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
