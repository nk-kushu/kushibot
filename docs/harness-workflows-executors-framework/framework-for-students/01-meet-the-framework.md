# 1. Meet the Framework: From a User’s Wish to Finished Work

Imagine you ask a computer assistant:

> Add a “Sign in with Google” button to my application. Keep the existing password login working.

That is a short request. Doing it well takes several kinds of work.

The assistant needs to understand the application, decide what to change, make those changes, and check the result. It also needs to know what it is allowed to do and when to stop.

How do we organize all of that?

That is what our framework, **kushibot**, is designed to help with.

This book explains the proposed design. The examples show how it is intended to work; they do not mean every feature is already implemented.

## Start With a School Project

Suppose your class wants to build a small bridge out of wooden sticks.

Your teacher gives you the goal:

> Build a bridge that can hold a book.

Your group might follow these steps:

1. Learn what makes a bridge strong.
2. Draw a design.
3. Build the bridge.
4. Put a book on it.
5. Fix weak parts if it bends or breaks.

Different students can do different jobs. One researches, another draws, and another builds. Someone keeps track of progress.

The group also has rules: use only the supplied materials, finish before class ends, and actually test the bridge.

A beautiful drawing does not prove the bridge can hold a book. Someone must build it and perform the test.

Our framework organizes computer work in a similar way.

## What Is a Framework?

A **framework** is a reusable structure that helps us organize work.

For this book, think of it as a project organizer with a plan, workers, rules, and a progress record.

Instead of building a completely new organizer for every request, we reuse the same structure. One task might add Google login. Another might fix password reset. Both can follow a similar process, while keeping their own work and results separate.

The framework helps answer practical questions:

- What are we trying to achieve?
- What should happen next?
- Which worker should do it?
- What did that worker produce?
- How will we check the result?
- What should happen if the work fails or stops?

## Where Does the AI Model Fit?

An **AI model** receives information and generates a response. It can help explain code, propose a plan, or suggest the next action.

But a response is not the same thing as an action.

If the model says, “Run the login tests,” the tests have not run yet. A permitted tool must run them and return the actual result.

If the model says, “The task is finished,” the framework still needs to check the required results and evidence.

Here is a small example:

```text
Model suggests: Read the login file.
        ↓
Framework checks whether that tool action is allowed.
        ↓
Tool reads the permitted file.
        ↓
The file content becomes information for the next model response.
```

The model helps choose useful actions. The framework controls how those actions are carried out and recorded. Some work, such as running a configured test command, can happen without asking a model at all.

## Four Words You Will Meet Often

You do not need to memorize every object in the framework. Start with these four words:

| Word | Simple meaning | Google-login example |
| --- | --- | --- |
| Workflow | The reusable plan for doing a kind of work. | Investigate → plan → implement → check. |
| Step | One assignment within that plan. | Find out how login works today. |
| Executor | The worker that knows how to carry out an assignment. | An investigation worker that can search and read source files. |
| Run | One particular time we follow the plan. | Today's work on adding Google login. |

A workflow is like the bridge-building instructions. A run is your group's actual attempt to build a bridge today.

Two groups can follow the same instructions without sharing the same bridge or progress record. In the same way, two framework runs can follow one workflow while keeping their results separate.

We will explore these characters more carefully in the next chapter.

## Follow One Real Request

Let us return to the application.

The user asks:

> Add Google login. Keep password login working. Prepare the changes for review before applying them to my original project.

For this example, the application has been configured with a workflow for changing a feature.

### Step 1: Record the Goal

The framework starts a new run for this request.

It keeps the goal and important requirements together:

```text
Goal: Add Google login.
Must preserve: Password login.
Working boundary: Prepare changes in a separate working copy.
Before applying to the original project: Obtain approval of the prepared changes.
```

This gives the work a clear target. The assistant should not forget password login halfway through.

### Step 2: Understand What Already Exists

The investigation executor examines the allowed files.

It may use a model to help decide which files to inspect. Read and search tools provide the actual source content.

Its result might say:

> Password login already creates a session through the session service. Google login should use that same service after checking the Google response.

The result includes references to the files it inspected. If something remains unclear, it says so.

The framework checks and saves the investigation result before using it in the next step.

### Step 3: Prepare a Plan

The planning executor uses the user goal and investigation findings to describe the intended changes.

For example:

1. Add a Google sign-in button.
2. Add the code that handles the response from Google.
3. Check that the response belongs to the login attempt we started and has not expired.
4. Create a session through the existing session service.
5. Add checks for the new behavior and preserve the password-login checks.

This plan describes work to do. It does not claim the code has already been changed.

### Step 4: Make the Changes

The implementation executor works in the separate working copy.

When a model requests a file edit, the framework checks whether that action is permitted. The editing tool performs the change and returns its result.

The worker then uses the actual updated files and observations to continue.

The original project is still waiting for the agreed review and approval process.

### Step 5: Check What Happened

The verification executor runs the configured checks.

Suppose the new Google-login test passes, but the existing password-login test fails.

The feature is not ready just because part of it works. The failed check gives the next worker a concrete problem to investigate.

If the workflow permits another fix and enough time and budget remain, it can send that problem back for correction. Otherwise, it stops and reports what remains unfinished.

### Step 6: Return a Clear Result

After the required checks and review, the framework returns the prepared changes and their evidence.

A useful report explains:

- What changed.
- Which checks passed or failed.
- What remains uncertain or unfinished.
- Whether applying the changes still needs approval.

In this example, applying the prepared changes to the original project is a separate controlled action after approval. A successful coding step does not grant that approval.

## What If the Computer Stops Halfway Through?

Imagine the application closes after investigation has finished.

With saved progress and a valid recovery record, the framework can determine what finished and what still needs work. Before repeating an action whose outcome is uncertain, it checks what actually happened.

Think of leaving a note beside your bridge:

> The design is finished. The left support is built. Check whether the right support was glued before continuing.

The note helps you resume safely. It does not pretend an unfinished bridge is complete.

We will learn about saved progress and recovery in a later chapter.

## Why Split the Work Into Parts?

Each part has a clear job. That makes it easier to understand a result and locate a problem.

If a test fails, we can inspect the test result. If investigation missed an important file, we can improve investigation. If a different model is suitable for a worker, we can connect it through the framework's supported model interface.

The same organizing structure can support different tasks without mixing up their progress.

For now, you only need this picture:

```text
User gives a goal
        ↓
Workflow supplies the plan
        ↓
Executors carry out the steps
        ↓
Tools produce actual observations and effects
        ↓
Required checks evaluate the results
        ↓
The framework records the outcome and reports what happened
```

Some steps may lead back to earlier work. Others may stop for missing information, approval, cancellation, or a limit. Following a workflow does not guarantee success; it makes progress and unfinished work visible.

## Check Your Understanding

Try answering these questions in your own words:

1. If a model says a file was changed, what evidence would you want before believing it?
2. Can two tasks use the same workflow while having different progress?
3. If Google login works but password login breaks, has this user's goal been met?

Possible answers:

1. A recorded editing result and inspection of the actual file changes.
2. Yes. Each task has its own run and results.
3. No. Keeping password login working was part of the goal.

## Remember These Ideas

- The user supplies a goal and requirements.
- A workflow organizes the work into steps.
- Executors carry out those assignments, sometimes with help from models and tools.
- A run keeps the progress and results of one execution separate from other work.
- Evidence and checks help establish what actually happened.

**Next chapter:** Meet the Main Characters: Agent, Workflow, Step, and Executor.

[Return to the framework notes](../harness-workflows-executors-framework-idea.md)
