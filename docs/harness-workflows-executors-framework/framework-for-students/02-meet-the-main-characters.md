# 2. Meet the Main Characters: Agent, Workflow, Step, and Executor

In the first chapter, we followed a user's request from an idea to checked results. Now let us meet the main parts that make this possible.

Start with four questions:

```text
Agent: Who is the configured assistant?
Workflow: What plan do we follow?
Step: What assignment needs to be done here?
Executor: What worker knows how to do that assignment?
```

These names describe responsibilities in the proposed kushibot framework. The examples explain the design, rather than presenting APIs that are already implemented.

## Return to Our Bridge Project

Remember the class building a bridge out of wooden sticks?

Imagine your group is called the Bridge Club. The club has members, materials, and rules about how it works. It can complete many projects over the school year.

For this project, the group follows a plan:

```text
Research → Design → Build → Test
```

“Find a strong bridge shape” is one assignment in that plan. A student who knows how to research can carry it out.

Now connect the story to the framework:

| In the school story | In the framework |
| --- | --- |
| The Bridge Club, with its identity and agreed capabilities | Agent |
| The reusable research, design, build, and test plan | Workflow |
| The assignment “Find a strong bridge shape” | Step |
| The worker who performs the research | Executor |

The analogy helps us get started. In software, these are cooperating objects and configured capabilities, rather than people in a classroom.

## Agent: The Configured Assistant

An **agent** has an identity and configuration for doing work.

Imagine an agent called Project Helper. The application configures it with permitted capabilities, rules, and access to useful knowledge.

For example:

```text
Agent: Project Helper
Purpose: Help with software changes.
Available capabilities: Inspect source, prepare changes, run permitted checks.
Rules: Respect the assigned workspace and the user's requirements.
```

The agent can receive many requests over time:

- Add Google login.
- Fix password reset.
- Explain the checkout code.

Those requests do not all share one progress record. Each managed workflow execution gets its own run.

An agent is also different from an AI model. A model helps generate responses. The configured assistant connects that help to tools, rules, and the process for doing the work. Changing a model does not automatically change the agent's identity or permissions.

## Workflow: The Reusable Plan

A **workflow** describes how a kind of work should proceed.

A feature-change workflow might say:

```text
Investigate → Prepare specification → Implement → Verify → Review
```

It also defines permitted paths after results arrive. For example, a failed check may lead to a bounded fix, while missing information may require the work to stop.

Think of a workflow as a reusable set of project instructions. The instructions describe the process, but they do not contain today's completed work.

The same workflow can help with Google login and password reset. Each request supplies different details and produces different results.

The **workflow engine** is the coordinator that follows this plan. It arranges execution and uses the configured rules to decide which declared step comes next.

You do not need to learn the engine's internals yet. Just remember that the plan and the coordinator following it have different jobs.

## Step: One Clear Assignment

A **step** describes what must be accomplished at a particular point in the workflow.

For example:

```text
Assignment: Investigate existing login.
Input: The user's request and permitted source references.
Expected result: Findings, supporting source references, and open questions.
Assigned executor: Investigation executor.
```

A useful step has a clear purpose and expected result.

“Do something helpful” leaves too much uncertainty. “Explain how password login creates a session, using source references” gives the worker a concrete assignment.

A step can also explain which earlier results become its input. The specification step can receive accepted investigation findings instead of rediscovering everything from the beginning.

## Executor: The Worker That Knows How

An **executor** provides the behavior needed to carry out an assignment.

An investigation executor knows how to organize an investigation. An implementation executor knows how to organize permitted changes. A verification executor knows how to run configured checks and report their results.

An executor may use a model and tools. It may also perform ordinary programmed work without a model. Running a known test command does not require an AI judgment about every instruction.

The executor receives the assignment and the capabilities permitted for that execution. It returns a result or an explicit unsuccessful outcome, such as failure or cancellation.

It does not get to declare the entire user task complete just because its own assignment finished. The framework still records and evaluates that result within the larger process.

## Why Are Step and Executor Separate?

Imagine two assignment cards:

```text
Card A: Investigate login and explain how sessions work.
Card B: Investigate checkout and explain how payment totals are calculated.
```

These are different assignments. But a worker with a general source-investigation capability may handle both.

That is why we separate the step from its executor:

- The step describes the particular job and expected output.
- The executor supplies the behavior for doing that kind of job.

One executor can serve several steps and workflows, as long as its capabilities and result contract fit their assignments.

Reuse does not mean mixing up working notes. Each execution keeps the state that belongs to its own assignment.

## A Run: Today's Actual Work

We met the word **run** in Chapter 1. It connects the reusable plan to one real request.

Suppose Project Helper receives two requests:

| Request | Workflow | Separate run |
| --- | --- | --- |
| Add Google login. | Feature-change workflow | Google-login run |
| Add password reset. | Feature-change workflow | Password-reset run |

Both follow the same process. However, the Google-login run might be implementing changes while the password-reset run is still investigating.

The workflow definition does not become “half finished.” Each run records its own progress. The execution of a particular step has its own record too; later chapters explain that in more detail.

## Follow the Characters Through Google Login

Let us put these roles together with a concrete request:

> Add Google login and preserve password login. Prepare the changes for review.

### 1. The Agent Receives the Request

Project Helper receives the goal. The application selects its configured feature-change workflow and creates a run for this request.

The agent's permitted capabilities and the user's requirements remain part of the execution boundaries.

### 2. The Workflow Supplies the First Assignment

The engine selects the investigation step.

That step says what to inspect and what kind of result is needed. It points to the investigation executor.

### 3. The Executor Performs the Investigation

The investigation executor uses its permitted capabilities to inspect source files. It may ask a model to help choose useful searches, while tools return the actual file contents.

It produces findings such as:

> Password login uses the existing session service. Google login should create a session through the same service after validating the Google response.

It includes supporting references and states what remains unknown.

### 4. The Framework Records the Result

The result is checked against the required output contract and acceptance rules. A correctly structured report can still contain uncertain conclusions, so required review and evidence checks continue to matter.

The engine records and saves the accepted result. It can then follow the declared transition to specification.

### 5. The Next Worker Receives the Next Assignment

The specification executor receives the goal and selected investigation findings. It prepares the proposed changes and checks.

Later, the implementation executor makes permitted edits. The verification executor runs actual checks. Each has a different responsibility within the same run.

### 6. The Outcome Determines What Happens Next

If verification reports that password login broke, the task has not met its requirements.

The engine follows the workflow's configured rules: perhaps another permitted fix and verification cycle, or an honest stopped outcome when limits prevent further work.

The implementation executor cannot turn a failed verification result into success simply by saying the feature is finished.

## One Small Picture

```text
Project Helper                         ← agent
    │
    └── Uses feature-change plan       ← workflow
            │
            └── Investigate login      ← step
                    │
                    └── Investigation executor
                            │
                            └── Findings and evidence

The Google-login run records this particular execution.
The engine coordinates progress through the plan.
```

## The Same Policy Idea Across the Characters

A policy is a helper object that takes information and returns a choice or a prepared value. All policy helpers follow one agreement, Policy<TInput, TOutput>, with a method named apply(). Different classes handle different jobs: selecting an assignment, choosing model context, or deciding the next allowed step. Workers still do the work; policies help configure how it is prepared and controlled.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Can the same workflow be used for Google login and password reset?
2. Is “Investigate existing login” the step or the executor?
3. Can an executor do useful work without asking a model?
4. If investigation finishes, does that mean the entire feature is complete?

Possible answers:

1. Yes. Each request gets its own run and results.
2. It is the assignment described by the step. The investigation executor carries it out.
3. Yes. An executor can perform programmed work, such as running configured checks.
4. No. Later required steps still need their own results.

## Remember These Ideas

- **Agent:** the configured assistant with an identity and permitted capabilities.
- **Workflow:** the reusable plan for a kind of work.
- **Step:** one assignment in that plan.
- **Executor:** the worker that knows how to carry out an assignment.
- **Run:** the progress and results of one execution of the plan.

**Next chapter:** Follow One Task Through the Framework.

[Previous: Meet the Framework](01-meet-the-framework.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
