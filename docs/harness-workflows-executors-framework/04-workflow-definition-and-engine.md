# Workflow Definition and Engine

## First, Describe the Plan

Imagine the user asks, “Add Google login.” The agent needs a process to follow: understand the existing code, prepare a specification, make the change, run checks, and review the result.

A workflow describes that process:

```text
Investigate → Specify → Implement → Verify → Review
```

The workflow definition says which tasks exist, which executor performs each task, and where its input comes from. It can also describe allowed branches, such as returning to implementation when review finds a problem.

The definition is a reusable plan. “Add Google login” and “Add password reset” can follow the same plan while keeping their work and results separate. Each request gets its own WorkflowRun. Finishing one request does not mark the plan itself completed.

This chapter describes the proposed framework API. The implementation has not yet been created.

## Write the Plan as a Class

A FeatureWorkflow class constructs the definition. Its executors are passed into the constructor, so the workflow does not need to create model clients or know how file tools work.

To see the pattern, start with a small version containing only investigation and specification. Supporting imports and request/result types are omitted here:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class InvestigationInputPolicy implements Policy<InvestigationWorkflowContext, InvestigationInput> {
  async apply(context: InvestigationWorkflowContext): Promise<InvestigationInput> {
    const { request } = context;
    return {
      goal: request.goal,
      workspace: request.workspace,
    };
  }
}

class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationInput> {
    const { request, results } = context;
    return {
      goal: request.goal,
      research: results.investigate,
    };
  }
}

class FeatureWorkflow {
  constructor(private readonly executors: FeatureExecutors) {}

  define() {
    return WorkflowBuilder.forRequest<FeatureRequest>("implement-feature", {
      title: "Implement a feature",
    })
      .step("investigate", {
        title: "Investigate the existing code",
        executor: this.executors.investigate,
        inputPolicy: new InvestigationInputPolicy(),
      })
      .step("specify", {
        title: "Prepare a specification",
        executor: this.executors.specify,
        inputPolicy: new SpecificationInputPolicy(),
      })
      .build();
  }
}
```

Calling define() creates the plan; it does not start investigating. WorkflowBuilder collects the step definitions and builds the reusable definition object.

The first step selects the goal and workspace from the request. The second selects the goal and the accepted investigation result. That is how information moves from one assignment to the next.

The full workflow adds implementation, verification, and review before build(). Implementation receives the specification; verification receives the changed-file information; review receives the specification, changes, and check evidence. The builder should check these dependencies through types, and the engine must also check them at runtime.

## Where the Engine Lives and How It Receives the Plan

WorkflowEngine is a separate class provided by the framework. In the proposed implementation folder, the files have different jobs:

```text
src/services/harness/workflow-framework/
├── engine/WorkflowEngine.ts          # Executes workflow definitions
├── workflows/FeatureWorkflow.ts      # Builds the feature-work plan
└── domain/WorkflowDefinition.ts      # Describes the plan returned by define()
```

These are planned file locations, not already implemented classes.

**FeatureWorkflow builds the plan. WorkflowDefinition is the plan it returns. WorkflowEngine executes that plan.**

```text
FeatureWorkflow.define()
          ↓
    WorkflowDefinition
          ↓
     WorkflowEngine
          ↓
Run investigation, specification, and the other defined steps
```

The calling application connects them like this:

```typescript
const featureWorkflow = new FeatureWorkflow(executors);

// Creates the plan. No tasks run yet.
const definition = featureWorkflow.define();

// engine was assembled by composition with StepRunner,
// repositories, policies, and its other collaborators.
await engine.start(definition, {
  goal: "Add Google login",
  workspace: "/my-app",
});
```

This is proposed calling code: start() is an illustrative API name, and executors/engine are injected objects assembled by composition. With the small two-step definition above, the engine executes those two steps; the full feature definition adds the remaining assignments and applicable transitions.

There is no inheritance between the classes. FeatureWorkflow does not extend WorkflowEngine. The engine receives a WorkflowDefinition rather than depending on the FeatureWorkflow class itself.

The same engine can therefore execute a definition built by FeatureWorkflow, DocumentationWorkflow, or another workflow class that supplies a supported definition. Each execution gets its own WorkflowRun; reusing the engine/definition does not share mutable progress between requests.

## The Engine Carries Out the Plan

WorkflowEngine manages the workflow's progress.

**Selecting the next step is one part of its job;** 

it also prepares the available task data, arranges execution, coordinates saved results, and handles what follows.

When Google-login investigation is next, the engine builds a context from that run's request and asks StepRunner to execute the selected step. StepRunner uses the input policy and calls the investigation executor. The executor does the investigation and returns findings.

The engine then coordinates recording that outcome through the run objects and saving it through RunRepository. Once the result is accepted and saved, the specification step can receive it. Returning a value and durably saving it are separate actions; the engine must handle a saving failure before dependent work proceeds.

```text
Workflow definition describes the work
                ↓
Engine selects and coordinates a step
                ↓
StepRunner invokes its executor
                ↓
Engine records the outcome and coordinates saving it
                ↓
Continue, request a fix, wait, stop, or finish under the plan
```

The engine does not implement authentication, model/tool loops, or lint commands. Executors and their injected capabilities perform those jobs. Model-based executors can use AgenticMindUnit; deterministic verification can run directly without an LLM.

## The Run Remembers What Happened

WorkflowRun holds the progress of this request. Each StepRun records one execution of a step. An AgenticSession, when needed, records the model/tool work inside that execution.

For example, investigation may be completed while the run is still implementing the feature. If verification returns failed checks, its checking task may have completed correctly while the code still needs a fix.

The engine asks the owning objects to record valid changes. Those objects protect their rules; the repository saves their accepted state. The engine does not bypass them by directly assigning status fields.

**Saved results and checkpoints allow recovery after interruption.** 

Recovery checks actual pending operations before repeating side effects. A completed investigation does not have to run again merely because the process restarted.

## Decide What Happens After Each Result

**The definition describes the allowed paths, and transition policies choose the applicable path using the result and configured rules.**

After a failed callback check, the workflow can create a bounded fix assignment containing the diagnostic evidence. That correction gets a new StepRun, preserving the earlier result. After new checks and review pass, the process can advance.

**A build-only workflow may finish with reviewed changes in the isolated workspace.** 

A workflow that includes publication continues to a concrete proposal and user approval. Its run stays waiting for approval until the trusted decision arrives, and it completes only after the required publication receipt and other completion rules are satisfied.

These choices are explicit in the plan. The engine coordinates them; an executor's message saying “done” does not finish the whole process.

For the deeper explanations, read [StepRunner and Contexts](10-step-runner-and-contexts.md) and [State Machines](22-state-machines-and-coordinated-lifecycles.md). The [complete Google-login walkthrough](17-google-login-complete-walkthrough.md) follows the full process, including fixes, recovery, approval, and publication.

## Policies Used by the Plan and Engine

Each builder step receives an inputPolicy object implementing Policy<StepWorkflowContext, ExecutorInput>. The concrete classes in this chapter select the same request/results previously described. The engine also receives transition and retry implementations of the shared Policy contract. It awaits apply() with their purpose-specific inputs, then validates and executes the returned decision. A transition policy returns a target or explicit terminal/wait outcome; it cannot invent a step outside the validated definition.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
