# 13. Context: One Policy Concept, Used Everywhere

**Our framework has one policy concept: give a policy some information, call apply(), and get a result.**

We use this same idea to prepare an executor's input, choose what a model sees, select a model, and decide what should happen next.

A policy is a code object containing rules for one particular choice. Different policy objects do different jobs, but they all follow the same agreement.

This chapter explains the proposed framework design. The code shows the intended API, not an implemented library.

## One Interface for Every Policy

```typescript
interface Policy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

Read this as:

> “Receive this kind of information and return this kind of result.”

**TInput describes what goes in.** 
**TOutput describes what comes out.** 

Promise means the caller waits for the result with await; the policy can still be ordinary code without a model call.

We define this interface once in the framework. Every policy class uses it.

| Policy's job | Information it receives | Result it returns |
|---|---|---|
| Prepare executor input | Request and accepted earlier results | An assignment for the executor |
| Choose model context | Current assignment, rules, notes, and observations | Information to include in a model request |
| Choose a model | Task requirements and eligible models | A model choice or an explicit problem |
| Decide the next step | Actual results and allowed workflow paths | Continue, fix, wait, or stop |

**One concept means one interface. It does not mean one object that makes every decision.** Each policy object has one clear job.

## Example: Prepare a Worker's Assignment

Suppose the investigation has finished. The next worker needs the goal and the accepted findings to write a specification.

Its input policy selects those values:

```typescript
// Supporting task-data types are omitted to keep the example small.
class SpecificationInputPolicy
  implements Policy<SpecificationContext, SpecificationInput>
{
  async apply(context: SpecificationContext): Promise<SpecificationInput> {
    return {
      goal: context.request.goal,
      findings: context.results.investigate.summary,
    };
  }
}
```

The class contains the selection rules. It follows the shared Policy interface; it needs no separate mapper interface.

The workflow step receives an instance of that class:

```typescript
const specificationStep = {
  inputPolicy: new SpecificationInputPolicy(),
  executor: specificationExecutor,
};
```

StepRunner uses it like this:

```typescript
const input = await step.inputPolicy.apply(workflowContext);
const result = await step.executor.execute(input, executionContext);
```

First the policy prepares the assignment. Then the executor performs it. The engine ensures earlier results are accepted and saved before dependent work proceeds.

## Context Selection Uses Exactly the Same Idea

**Model context is the information shown to the model in one request.**

Imagine a student with a desk and a cupboard. The desk holds the pages needed now. The cupboard holds other material that may be useful later.

**The framework can store more information than the model sees. A context policy chooses what goes on the model's “desk.”**

An **EditingContextPolicy also implements the shared Policy interface.** Its input contains available session material and the context-size budget. **Its output describes the selected material.**

The application supplies that policy to AgentContextComposer when assembling the executor's model capability:

```typescript
// Setup excerpt; other required collaborators are omitted.
const composer = new AgentContextComposer({
  contextPolicy: new EditingContextPolicy(evidencePolicy),
  tokenCounter,
  compression,
});
```

Before every model call, the composer calls the policy:

```typescript
const selection = await this.contextPolicy.apply({ material, budget });
```

**The policy chooses material. The composer builds and measures the model request. AgenticMindUnitRunner asks it to do this before each model call.**

After a tool returns new information, the composer applies the policy again. The configured object can stay the same while the information it receives changes.

That is rolling context: updating the model's working view as the task progresses.

## Where Do We Put Each Policy?

The developer creates policy objects in application setup and supplies them to their consumers.

| Consumer | Policy it uses | When it applies it |
|---|---|---|
| StepRunner | The step's input policy | Before invoking its executor |
| AgentContextComposer | A context policy | Before each model request |
| ModelRouter | A model-selection policy | When selecting a model for a new session |
| WorkflowEngine | A transition policy | When deciding the next allowed step |

They all call **await policy.apply(input)**. The supplied class determines the behavior, and the input/output types describe the information involved.

AgenticMindUnit uses the same policy concept for its configurable decisions, such as context selection and completion. The unit still performs the model-and-tool work. Each invocation keeps its own session and notebook.

## What Must Context Selection Preserve?

A model request needs the current assignment, required rules, relevant acceptance criteria, and enough current evidence to work correctly. Open questions must remain open until evidence resolves them.

When material becomes too large, suitable older observations can be shortened. This is **compression**. **Required instructions and important uncertainty must survive**. If essential material still cannot fit safely, the framework reports a context-limit outcome.

Stored material is available to the model only when it is included in a request or retrieved through permitted tools. A report reference alone does not reveal its contents.

ExecutionContext supplies runtime services such as cancellation and progress reporting; it is separate from the information shown to the model. The runtime still enforces permissions and budgets. A policy's result does not prove an operation happened or supply user approval.

## Follow the Idea Through One Task

1. An input policy selects the goal and investigation findings for the specification executor.
2. The executor gives its assignment to AgenticMindUnit.
3. Before each model call, the composer applies a context policy to select the useful information.
4. After the executor returns, the engine accepts and saves the result.
5. A transition policy helps choose the next allowed step.

**Different jobs, different policy objects, one shared Policy interface and one apply() method.**

For the full technical design and additional examples, read [One Shared Policy Concept](../31-shared-policy-concept.md).

**Next chapter:** [Better Context: Give the Model the Right Information](14-better-context-give-the-model-the-right-information.md).

[Previous: Model Routing: Choosing a Suitable Model for the Job](12-model-routing-choosing-a-suitable-model-for-the-job.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
