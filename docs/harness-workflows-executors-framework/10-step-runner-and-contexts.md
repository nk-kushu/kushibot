# StepRunner and Contexts Explained

Imagine the user asks, “Add Google login.” The workflow begins by investigating the existing authentication code. It already has an executor that knows how to investigate. Before calling that executor, the framework must prepare its assignment and supply the services it can use while working.

This is where StepRunner and the two contexts fit. Workflow context contains available task data. An input policy selects the executor's assignment from that data. ExecutionContext supplies identity and scoped services while the executor performs it.

The examples describe the proposed framework API, not existing implementation code. The workspace path represents the isolated working copy, not permission to edit the original application directly.

## Start with the Request

The original request could look like this:

```typescript
const request = {
  goal: "Add Google login",
  workspace: "/my-app",
};

const investigationContext = { request };
```

The engine prepares investigationContext from the request recorded in the run. At this first step there are no earlier findings to include.

We call this available data the workflow context. A type such as FeatureContext describes its shape. It does not fetch information or run anything by itself. Other workflows can use different shapes; we do not need one enormous universal context.

The investigation step's input policy selects the values its executor needs:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class InvestigationInputPolicy implements Policy<InvestigationWorkflowContext, InvestigationInput> {
  async apply(context: InvestigationWorkflowContext): Promise<InvestigationInput> {
    return {
      goal: context.request.goal,
      workspace: context.request.workspace,
    };
  }
}

// The input policy object configured on the investigation step.
const stepConfiguration = { inputPolicy: new InvestigationInputPolicy() };
```

The executor therefore receives `{ goal: "Add Google login", workspace: "/my-app" }`. The context is the available data; the input is the selected assignment. At this early stage they contain nearly the same information, but later steps make the distinction clearer.

## Follow the Result into the Next Step

The investigation executor returns findings:

```typescript
const investigationResult = {
  findings: "Login uses session cookies.",
  sources: ["auth/login.ts", "auth/session.ts"],
};
```

The engine accepts the result through the run's domain objects and saves it through RunRepository. Only then does the specification step receive it as an accepted dependency.

To prepare that next assignment, the engine combines the original request with the saved investigation result:

```typescript
const specificationContext = {
  request,
  results: {
    investigate: investigationResult,
  },
};
```

This is the connection between FeatureContext and a later type such as SpecificationContext: the engine constructs different data views as results become available. The names themselves do not connect the objects automatically.

The specification step selects its input:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationInput> {
    return {
      goal: context.request.goal,
      findings: context.results.investigate.findings,
      sources: context.results.investigate.sources,
    };
  }
}

const stepConfiguration = { inputPolicy: new SpecificationInputPolicy() };
```

Its executor now receives:

```typescript
{
  goal: "Add Google login",
  findings: "Login uses session cookies.",
  sources: ["auth/login.ts", "auth/session.ts"],
}
```

It gets no workspace or unrelated results unless the input policy explicitly includes them. In the actual workflow, the builder checks types and dependencies, and the engine checks that the selected result really exists and is accepted. TypeScript types alone cannot make an unfinished result available.

```text
Request → investigation input → investigation executor
                                         ↓
                                  accepted saved result
                                         ↓
Request + findings → specification input → specification executor
```

These snippets illustrate values and builder policy objects; the real executors are injected objects. Treat context data as readonly views, copying or freezing nested data where needed. Executors return new results instead of modifying the run through shared context.

## Supply Services Separately with ExecutionContext

The assignment explains what to do. ExecutionContext explains which execution is active and provides the permitted services for doing it:

```typescript
interface ExecutionContext {
  readonly runId: string;
  readonly stepId: string;
  readonly signal: AbortSignal;

  progress(message: string): void;
  readonly artifacts: ArtifactStore;
  readonly debug: ScopedDebugRecorder;
}
```

The types ArtifactStore and ScopedDebugRecorder are shared framework contracts. For the investigation, runId might be run-42 and stepId might be investigate.

The executor calls progress() to report “Reading authentication files.” It uses debug to record structured operations and outcomes in the same timeline. It can save a detailed report through artifacts and return a reference in its result. The [ArtifactStore chapter](23-artifact-store-and-produced-materials.md) explains that process.

The signal carries cancellation. The executor and its tools must check or forward it; a signal alone cannot forcibly stop arbitrary work. If a file write has an uncertain outcome, cancellation does not prove it was undone.

Readonly prevents ordinary TypeScript code from reassigning these properties. It does not freeze every object or make ArtifactStore read-only. A component that needs only artifact reads can receive the narrower ArtifactReader interface.

Trusted composition creates these scoped capabilities. ExecutionContext should stay small, rather than becoming a global object exposing every database, provider, or application service. Executor-specific collaborators remain constructor-injected where appropriate.

## Let StepRunner Make the Call

The engine chooses the next step. StepRunner prepares and invokes that selected assignment. Its central operation is small:

```typescript
// Simplified class; shared StepDefinition/ExecutionContext imports are omitted.
class StepRunner {
  async execute<TContext, TInput, TOutput>(
    step: StepDefinition<TContext, TInput, TOutput>,
    workflowContext: TContext,
    executionContext: ExecutionContext,
  ): Promise<TOutput> {
    executionContext.signal.throwIfAborted();
    const input = await step.inputPolicy.apply(workflowContext);
    executionContext.signal.throwIfAborted();
    return step.executor.execute(input, executionContext);
  }
}
```

The three type parameters let the runner work with different context, input, and result shapes. It does not need separate branches for investigation, editing, and verification.

The complete runner also uses injected policies for limits, permitted retries, and recovery. The class above shows only the essential call path. A failed edit cannot be repeated blindly just because a retry is available.

StepDefinition owns the assignment and its input policy. StepRunner owns execution mechanics. The executor owns the task-specific capability. WorkflowRun and StepRun protect recorded execution state, while the engine coordinates accepted results and persistence through their public methods and repositories. There should be one explicit persistence coordinator, not two components independently declaring the same step completed.

## Keep Model Context and Recovery in Their Own Places

Workflow context is not the model's conversation or token window. AgentContextComposer builds model context separately from the assignment, selected notebook entries, recent observations, and permitted memory. It includes only what fits the configured limits.

Likewise, an in-memory context is not a durable checkpoint. Save the request, accepted results, and required session/protocol state through their owners. On resume, rebuild workflow views and recreate live signals, callbacks, stores, and recorders. Do not serialize those live service objects into a checkpoint.

Concurrent runs receive separate execution state and scoped contexts. A fix can create a new StepRun and select a newer result without rewriting completed history. The [state-machines chapter](22-state-machines-and-coordinated-lifecycles.md) explains those boundaries.

Test the runner through its public behavior: did it map the right input, forward the scoped execution context, return the outcome, and respect cancellation/policy? Test restoration and isolation separately with injected fakes.

For the detailed saved-result flow, read [Executors and Contracts](03-executors-and-contracts.md). To follow all these objects through the full task, read [Every Framework Feature Together](25-complete-agent-example-all-framework-features.md).

[Core concepts walkthrough](09-core-concepts-explained-with-example.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## The Shared Policy Contract

StepDefinition exposes inputPolicy: Policy<TContext, TInput>, using the single shared interface whose method is apply(input): Promise<TOutput>. StepRunner awaits that policy with the selected workflow-data view. Types and runtime dependency validation still ensure accepted results exist before selection. Input preparation can now be asynchronous; cancellation must be observed again before dispatching the executor. Context/completion/retry policies use the same contract with their own typed inputs and outputs, rather than creating new mapper or policy interfaces.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

