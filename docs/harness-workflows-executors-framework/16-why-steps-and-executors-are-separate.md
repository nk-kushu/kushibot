# Why Have a Step When We Already Have an Executor?

## When a Step Is Useful

If all you need is “call this executor,” you do not need a Step abstraction.

A Step becomes useful when the framework needs to manage that executor's place in a larger process. **The executor owns a reusable capability; the step identifies one assignment that uses it within a workflow.**

## Example: One Email Executor, Two Workflow Steps

Imagine an executor that sends emails:

```typescript
class SendEmailExecutor {
  execute(input: EmailInput): Promise<EmailResult> {
    // Sends an email through an injected email capability.
  }
}
```

This is a responsibility sketch, not a compilable implementation: `EmailInput`, `EmailResult`, the injected capability, and the method body are omitted. A framework executor would also accept the shared execution context.

A registration workflow uses that capability twice:

```text
Create account
      ↓
Send welcome email       ← Same executor
      ↓
Wait for verification
      ↓
Send activation email    ← Same executor
```

This is an illustrative process, not an expansion of the first-version scope to include external-event waiting. **Its purpose is to show two positions in a plan using one executor.**

The executor knows how to send an email. It cannot know:

- **Which of these two workflow tasks is currently running.**
- Where that task's input comes from.
- Which earlier tasks must finish first.
- Which task should follow it.

Those are workflow concerns. A Step **identifies one use of a capability within the plan:**

```typescript
// Supporting EmailWorkflowContext and EmailInput contracts are omitted.
class WelcomeEmailInputPolicy implements Policy<EmailWorkflowContext, EmailInput> {
  async apply(context: EmailWorkflowContext): Promise<EmailInput> {
    return { to: context.results.createAccount.email, template: "welcome" };
  }
}

class ActivationEmailInputPolicy implements Policy<EmailWorkflowContext, EmailInput> {
  async apply(context: EmailWorkflowContext): Promise<EmailInput> {
    return { to: context.results.createAccount.email, template: "activated" };
  }
}

const welcomeStep = new StepDefinition(
  "send-welcome",
  "Send welcome email",
  emailExecutor,
  new WelcomeEmailInputPolicy(),
);

const activationStep = new StepDefinition(
  "send-activation",
  "Send activation email",
  emailExecutor,
  new ActivationEmailInputPolicy(),
);
```

The snippets use the proposed `StepDefinition` constructor from the [core concepts walkthrough](09-core-concepts-explained-with-example.md). Supporting types and context annotations are omitted; the typed builder must preserve valid dependencies and input/output contracts in the implementation.

The two objects share `emailExecutor` **but have different identities and input policies**. The workflow definition and transition policies determine their ordering; their positions are not hidden inside the email executor.

## What This Enables

The framework can record separate execution state:

```text
✓ send-welcome       completed
● send-activation    failed
```

**It can identify the failed task, inspect its input and result, and decide how to resume without confusing it with the welcome email.**

Safe repetition still depends on checkpoint, idempotency, and recovery rules. A named step alone does not guarantee that an email will be sent exactly once. A crash after sending but before recording success can leave an uncertain outcome requiring reconciliation.

Step identity also provides an anchor for dependency references, debug events, duration measurements, and step-specific policy configuration without adding those workflow responsibilities to the reusable executor.

## The Same Idea in an Agent Workflow

```text
Step: “Investigate authentication”
  Executor: Agentic investigation capability
  Input: Authentication goal and workspace

Step: “Investigate billing”
  Executor: Same capability
  Input: Billing goal and workspace
```

The investigation executor configures and invokes `AgenticMindUnit`. It **does not need a separate implementation merely because the subject changed from authentication to billing.** Each invocation creates isolated session state and returns its own result.

### The Step is the named position in the plan. The Executor is the reusable implementation used there.

## Keep the Step Small

`StepDefinition` should contain i**dentity, title, input policy, executor, and applicable configuration.** It should not grow into another implementation of the task or own mutable execution results.

The related objects have separate jobs:

| Object | Responsibility |
| --- | --- |
| `StepDefinition` | Describes a reusable assignment in the workflow. |
| `Executor` | Implements the capability used by that assignment. |
| `StepRunner` | Prepares and invokes the selected assignment under execution policies. |
| `StepRun` | Records what happened in one execution of that assignment. |
| `WorkflowEngine` | Coordinates the overall plan and its transitions. |

## When to Skip Steps

For a standalone `AgenticMindUnit` invocation, call the unit directly with its assignment, tools, limits, and execution context. You can also invoke an executor directly when no managed multi-step process is needed.

Workflows and steps are useful when you want to compose multiple tasks and manage their identities, dependencies, recorded outcomes, and transitions. They should not be mandatory wrappers around every model call or tool invocation.

[Core concepts](01-core-concepts.md) · [StepRunner and contexts](10-step-runner-and-contexts.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## A Step Holds an Input Policy

Both email policies implement the same Policy<EmailWorkflowContext, EmailInput> contract. StepRunner awaits step.inputPolicy.apply(context), then invokes the shared email executor. A different policy object prepares the input for each workflow position without moving workflow state into the executor. Transition and retry decisions use the same Policy interface with different typed data and outcomes.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

