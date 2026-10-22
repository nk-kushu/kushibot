# Executors and Contracts

## The Object That Does the Task

Imagine asking an agent to add Google login. Before changing files, it needs to understand the current authentication code.

The workflow contains a step called “Investigate authentication.” That step is the assignment. The **executor is the object that knows how to carry it out**.

The step supplies the goal and workspace. The executor searches and reads the permitted files, gathers evidence, and returns what it found. The workflow can then use those findings to prepare a specification.

This page explains the proposed framework design. These executors are planned built-in components; the framework has not yet been implemented.

## The Four Executors You Start With

The framework provides four default executor implementations so an application can use common capabilities without writing each one from scratch.

**WorkspaceInvestigationExecutor** understands an existing workspace. In our example, it reads authentication files and returns findings with source references. Its investigation tools allow reading and searching; changing the code belongs to a different assignment.

**StructuredTaskExecutor** produces a result with an agreed shape. After investigation, it can prepare a specification containing requirements and acceptance criteria. Later, another configured instance can review the changes and return a decision with concrete issues. The same capability serves different tasks through its input and configuration.

**WorkspaceEditingExecutor** makes changes in an isolated working copy. It receives the specification, edits the relevant files, and returns a summary and change references. Applying those files back to the original workspace happens later through user-approved publication.

**VerificationExecutor** runs actual checks, such as tests, lint, or type checks. It returns what those checks reported. It usually runs ordinary code and tools without needing a model to decide whether the checks passed.

These are reusable defaults, not a closed list. You can supply a custom executor through the same contract.

## One Common Contract

Every executor follows the same basic agreement: **receive an input, perform a task, and return an output**.

```typescript
interface Executor<TInput, TOutput> {
  execute(
    input: TInput,
    context: ExecutionContext,
  ): Promise<TOutput>;
}
```

Here, TInput means “this executor's input type,” and TOutput means “this executor's result type.” Promise means the task completes asynchronously. An investigation executor and a verification executor can use the same interface while receiving and returning different data.

The input describes the assignment. ExecutionContext supplies services and controls for the current execution: reporting progress, observing cancellation, saving artifacts, and recording debug events. For example, context.progress("Reading authentication files") reports what the executor is doing.

An executor is normally a class implementing this interface. Its external collaborators are supplied through its constructor. That lets you replace a model, workspace tool, or check runner without rewriting the workflow. A model-based executor delegates repeated model/tool work to AgenticMindUnit rather than implementing another copy of that loop.

## Follow the Investigation Result

Suppose investigation finds that login uses session cookies. The executor can return:

```typescript
return {
  summary: "Authentication uses session cookies.",
  sources: ["auth/login.ts", "auth/session.ts"],
};
```

This is a TypeScript/JavaScript object. It is not a JSON string, and the executor does not need to call JSON.stringify() before returning it. Other executors can return different shapes, including a string or a boolean where that makes sense.

The result travels through StepRunner to WorkflowEngine. The engine coordinates checking and recording it through the run objects, then RunRepository saves it with the step's execution record. The selected storage adapter handles serialization. Persisted results need a supported serializable shape; live clients and functions do not belong in them.

```text
Investigation executor returns findings
                  ↓
Engine records and saves the step result
                  ↓
Specification step can use those findings
```

The executor does not mark the whole workflow completed. Investigation has finished, but specification, implementation, checks, and review still remain. If saving the result fails, the engine must handle that failure before treating the result as durably available to dependent steps.

## How the Next Step Receives the Findings

When specification is ready, the engine prepares a context containing the request and accepted investigation result. The specification step's input policy selects what its executor needs:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationInput> {
    const { request, results } = context;
    return {
      goal: request.goal,
      findings: results.investigate.summary,
      sources: results.investigate.sources,
    };
  }
}

const stepConfiguration = { inputPolicy: new SpecificationInputPolicy() };
```

This policy object is configured on the workflow step. It produces a new input object. The specification executor receives the goal, findings, and sources; it does not need access to the entire run or the investigation session's conversation.

It returns its own specification result. The framework records and saves that result in the same way, ready for implementation. Each step turns selected information from earlier work into a new useful result.

## When the Result Includes a Detailed Report

A short summary fits naturally in the step result. A detailed report can be saved separately in ArtifactStore.

For example, investigation saves its report and returns a summary plus the report's reference. The engine stores that small result. The specification executor can read the referenced report through its authorized artifact reader when it needs more detail.

```text
ArtifactStore keeps the full investigation report.
Step result keeps the summary and report reference.
Next executor reads the report if its task needs it.
```

Saving the report does not save the whole workflow, confirm a long-term memory, or publish source changes. Those actions have their own responsibilities. The [ArtifactStore chapter](23-artifact-store-and-produced-materials.md) provides the full save/read code examples.

## A Returned Result Can Still Describe a Problem

Verification might return passed: false with a summary saying the callback-configuration check failed. The executor successfully performed its checking task and produced evidence, even though the code needs correction.

The workflow's policies can use that result to request a bounded fix. A check that could not run is a different outcome and must be reported honestly. Likewise, a model's claim that tests passed does not replace actual check evidence.

The same distinction applies throughout: the executor performs its assignment and returns the outcome; the engine coordinates what happens next. Guards add skill guidance and rule checks, while approved publication controls changes to the original workspace.

For the next level of detail, read [StepRunner and Contexts](10-step-runner-and-contexts.md). To follow the entire task, read the [complete Google-login walkthrough](17-google-login-complete-walkthrough.md).

## Configure Executors with Shared Policies

StepDefinition supplies inputPolicy: Policy<TContext, TInput>. StepRunner awaits its apply() result before calling the executor. A model-based executor can also receive Policy<TInput, UnitAssignment> and Policy<UnitOutcome, TOutput> for assignment and output preparation. These are all uses of the same interface; no separate mapper contract is required. The unit's context/completion policies follow the same convention. The executor remains responsible for performing its task and returning its outcome, while the engine accepts and saves the step result.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
