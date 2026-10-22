# One Shared Policy Concept Across the Framework

The proposed kushibot framework uses one OOP contract for configurable selections, decisions, and transformations: **Policy<TInput, TOutput>**. An object receives input, applies its rules, and returns a typed result. Its caller remains responsible for carrying out the resulting work.

This is a design proposal, not an implemented library API. Examples omit supporting domain contracts and integrations where noted.

## The Single Contract

```typescript
// contracts/Policy.ts — exported through the public index.ts
export interface Policy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

TInput is the information this policy receives. TOutput is what it produces. All callers await apply(), even when the implementation only calculates a small object. A policy does not need a model, tools, or a database simply because its method is asynchronous.

Use this contract for executor input selection, unit assignment/output preparation, model-context selection, routing, guard selection/enforcement, retries, transitions, completion, memory validation, provider prompt-cache configuration, sub-agent admission, and other configurable decisions. Do not add competing InputMapper, ContextPolicy, ModelRoutingPolicy, WorkspaceEditPolicy, or SkillPlanningStrategy interfaces. Names such as EditingContextPolicy and BoundedRetryPolicy name concrete implementations, not different base contracts.

One interface does not mean one policy instance or one universal input object. Each policy has task-specific readonly input data, its own configuration, and a precise result type. Different choices are implemented by different classes and injected into their callers. Input data types such as ContextPolicyInput are ordinary data contracts, not additional policy interfaces.

## A Small Input Policy

Think of a policy as the instructions for preparing a student's assignment card. The input policy chooses the useful information; the executor does the assignment.

```typescript
interface InvestigationWorkflowContext {
  readonly request: {
    readonly goal: string;
    readonly workspace: string;
  };
}

interface InvestigationInput {
  readonly goal: string;
  readonly workspace: string;
}

class InvestigationInputPolicy
  implements Policy<InvestigationWorkflowContext, InvestigationInput>
{
  async apply(context: InvestigationWorkflowContext): Promise<InvestigationInput> {
    return {
      goal: context.request.goal,
      workspace: context.request.workspace,
    };
  }
}
```

Supply an object when defining the step:

```typescript
// Builder excerpt; builder and executor are already assembled.
builder.step("investigate", {
  executor: investigationExecutor,
  inputPolicy: new InvestigationInputPolicy(),
})
```

The engine supplies a scoped workflow-data view after required dependencies are accepted and saved. StepRunner applies the policy and invokes the executor:

```typescript
const input = await step.inputPolicy.apply(workflowContext);
executionContext.signal.throwIfAborted();
const result = await step.executor.execute(input, executionContext);
```

StepDefinition holds inputPolicy as Policy<TContext, TInput>. No callback or separate input-mapper interface is needed. The mapper's former data-selection responsibility now belongs to the policy implementation. The engine still coordinates acceptance and persistence of the returned executor result before dependent work.

## The Same Contract for Model Context

```typescript
// Supporting domain types are omitted.
interface ContextPolicyInput {
  readonly material: ContextMaterial;
  readonly budget: ContextBudget;
}

class EditingContextPolicy
  implements Policy<ContextPolicyInput, ContextSelection>
{
  constructor(
    private readonly evidence: Policy<EvidenceSelectionInput, EvidenceSelection>,
  ) {}

  async apply(input: ContextPolicyInput): Promise<ContextSelection> {
    const { material, budget } = input;
    return {
      required: [
        material.assignment,
        ...material.requiredRules,
        ...material.acceptanceCriteria,
      ],
      optional: await this.evidence.apply({
        assignment: material.assignment,
        notebook: material.notebook,
        observations: material.observations,
      }),
      inputTokenLimit: budget.inputTokenLimit,
    };
  }
}
```

AgentContextComposer receives Policy<ContextPolicyInput, ContextSelection> and calls apply({ material, budget }) before each model request. It measures the complete request, preserves valid protocol and required guidance, and uses configured compression when appropriate. A proposed selection does not prove the request fits. If essential material cannot fit safely, return an explicit context-limit outcome.

## Connect Policies to the Agentic Unit

The application's composition root assembles policies and capabilities. This is an illustrative object setup with other required collaborators omitted:

```typescript
const contextPolicy = new EditingContextPolicy(evidencePolicy);
const composer = new AgentContextComposer({
  contextPolicy,
  tokenCounter,
  compression,
});
const runner = new AgenticMindUnitRunner<EditingAssignment, EditingResult>({
  contextComposer: composer,
  completionPolicy,
  // Session factory, provider, tools, budgets, and other collaborators omitted.
});
const unit = new AgenticMindUnit(runner);
```

A model-based executor may receive Policy<EditingInput, EditingAssignment> to prepare the unit assignment and Policy<EditingResult, EditingOutput> to translate its outcome. Both use apply(). The runner's context and completion decisions also use the same Policy contract. Policies can be configured once; invocation-specific conversations, notebooks, pending actions, and counters remain in each session.

AgenticMindUnit keeps its execution capability, such as execute(assignment, context). Executors execute, tools perform authorized operations, stores read/write, providers call external services, and factories assemble capabilities. Those are not renamed apply(): they carry out work rather than expressing a configurable decision. One shared policy concept does not turn every service into a policy.

## Different Policies, Precise Outcomes

| Purpose | Example input | Example output | Caller that enforces or executes it |
|---|---|---|---|
| Input preparation | Selected request and accepted dependencies | Executor input | StepRunner |
| Context selection | Session material and effective size budget | Required/optional material | AgentContextComposer |
| Model routing | Eligible profiles, assignment, limits, evidence | Selected profile or explicit no-selection outcome | ModelRouter and session coordinator |
| Guard selection | Registered guards, requirements, recommendation | Effective guard set | Guard coordinator |
| Guard enforcement | Versioned findings and required coverage | Accept, fix, review, or stop | Workflow/guard coordinator |
| Retry | Failure, attempt history, limits, effect certainty | Retry with bounded delay, reconcile, or stop | Operation owner |
| Transition | Accepted result, allowed graph, remaining allowances | Declared target or terminal/wait outcome | WorkflowEngine |
| Completion | Assignment criteria, proposed result, evidence | Accepted, continue, or unsuccessful outcome | AgenticMindUnitRunner |
| Memory validation | Scoped proposal, provenance, freshness | Confirm, reject, or retain uncertainty | Memory coordinator/store boundary |
| Provider prompt-cache configuration | Trusted configuration, concrete model capabilities, permitted scope | Supported prompt-cache intent; no claim of a hit | Selected provider adapter; composer and adapter preserve stable request structure |
| Sub-agent admission | Child request, registered capabilities, parent allowances | Bounded accepted assignment or rejection | SubAgentCoordinator |
| Workspace editing | Staged candidate, trusted scope, current evidence | Allowed exact candidate or rejection with issues | Workspace tools |
| Skill ordering | Required guidance, capabilities, dependencies | Proposed validatable plan or explicit inability | SkillOrchestrator and engine |

These result names are illustrative domain types. Expected negative decisions should be explicit typed results, not empty successes. Exceptions represent unexpected failures and do not authorize continuation. A Promise does not itself implement timeouts, cancellation, retries, or accounting: those remain explicit responsibilities of the owning runtime and injected collaborators.

## Required Boundaries Still Apply

A policy receives a readonly view and returns a new value. It does not mutate authoritative workflow state through its input. Where it needs cancellation or scoped services, include those explicitly in its typed input or inject narrow collaborators. Do not pass a global unrestricted service object.

Policies may use bounded DecisionUnit recommendations or other injected capabilities. Their calls still consume the applicable budgets. Recommendations cannot override required guards, broaden permissions, fabricate evidence, reset usage, or supply user approval. The caller validates the returned choice against its trusted runtime invariants and acts through domain methods and authorized tools.

Budget admission still uses atomic ledger reservations; a policy's positive recommendation is not a reservation. Publication still checks a trusted approval for the exact immutable proposal; a policy's acceptance is not that approval. Retention policy selects eligible framework-owned material; the retention service applies protection checks and performs cleanup.

## Versions, Recovery, and Files

Place the one shared interface at contracts/Policy.ts and export it from index.ts. Put concrete implementations with their owning modules: workflow input/transition/retry implementations in cohesive policies subfolders, context/completion in agentic/, routing in models/, guards in guards/, and so on. Reuse the shared import; do not copy the interface into each subsystem.

The composition root assigns stable policy identities, versions, and effective configuration alongside the supplied objects. These metadata are not extra methods required on Policy. Record the relevant metadata and decisions in checkpoints/debug events, then reconstruct compatible implementations on recovery. Persist values and identities, not live class instances or callbacks. Changed implementations require compatibility checks and never silently reset limits or approvals.

## Follow One Task

1. The investigation input policy selects the Google-login goal and workspace reference.
2. The executor invokes its configured unit with a bounded assignment.
3. The unit's context policy selects useful material before each model call.
4. The runner applies its completion policy to the proposed findings and evidence.
5. The executor returns its output; the engine accepts and saves it.
6. The specification input policy selects that accepted result for the next worker.
7. Later, guard and transition policies determine permitted corrections from actual check evidence.

The same apply() agreement supports all these configurable choices. Each object remains responsible for its own small part of the process.

[Student explanation](framework-for-students/13-context-choosing-what-the-model-needs-to-see.md) · [OOP architecture](08-oop-architecture-and-design-rules.md) · [Back to the framework overview](harness-workflows-executors-framework-idea.md)

## Prompt-Cache Policy Does Not Replace Stable Construction

A configured prompt-cache policy can express permitted provider controls. Independently of those controls, the composer and provider adapter must preserve stable structure for unchanged request material so provider caching is possible. Automatic caching must not depend on inventing a framework cache service or mandatory cache policy toggle. Only provider reporting establishes actual reused-input usage.

