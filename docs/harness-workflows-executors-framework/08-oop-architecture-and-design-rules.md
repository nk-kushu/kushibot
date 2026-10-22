# OOP Architecture and Design Rules

Imagine the user asks the agent to add Google login. The framework must investigate the code, prepare a plan, make changes, check them, and remember its progress. If one class tries to do everything, each new feature makes that class harder to understand and change.

Our framework uses object-oriented design from its first version. We give each object a clear job, let it protect the information it owns, and connect it to other objects through small interfaces. This chapter explains what that means in practice. The classes described here are part of the proposed design.

## Give Each Object One Clear Job

The workflow is the plan. WorkflowDefinition describes its steps and allowed transitions, while WorkflowBuilder helps construct a valid definition. The builder checks step identities and dependencies so the plan makes sense before execution.

Each StepDefinition describes one assignment: what it is called, which executor performs it, how its input is prepared, and which policies apply. The investigation step describes the investigation assignment. It does not contain the file-search implementation.

The executor supplies that capability through the shared Executor interface. Investigation, editing, structured-task, and verification executors can therefore perform different work through the same small contract.

WorkflowEngine coordinates the overall process. StepRunner handles execution of the selected step. The engine does not need to know the details of searching files, calling a provider, or formatting a test report. Those details belong to its collaborators.

## Keep the Plan Separate from Its Progress

The plan for implementing a feature can serve many requests. One user might ask for Google login while another asks for password reset. They can use the same immutable workflow definition, but their progress and results must remain separate.

Each request gets its own WorkflowRun. Each execution of a step gets a StepRun with its own outcome, attempts, and checkpoint references. An agentic executor also gets an isolated AgenticSession for its model/tool work. Shared executors and definitions must not hold mutable state that leaks between these executions.

These objects protect their own lifecycle rules. A caller asks a run to accept a result or pause through a public method. It cannot simply assign a new status and pretend the work happened. The object checks whether the change is valid. [State machines](22-state-machines-and-coordinated-lifecycles.md) explain those rules in more detail.

Keep mutable fields private and expose readonly views or snapshots. Restore saved state through validated reconstruction, preserving the same rules. Readonly types and value objects are useful when they protect meaningful information, such as a validated identifier or configuration.

## Let Implementations Be Replaceable

The engine calls executor.execute(input, context). It does not need a separate branch saying “if this is investigation, do this; if this is editing, do that.” Each implementation owns its behavior.

That is polymorphism: different objects answer the same request in their own way. Adding an executor means implementing the contract and connecting it to a step, rather than expanding the engine's behavior-selection switch.

The same principle applies to model providers, decision providers, storage, and policies. The agent can depend on DecisionProvider while JEV is one adapter behind it. Another compatible adapter can replace JEV without rewriting the agent. Registries and factories resolve the configured implementations.

Use policy objects for genuinely different decisions. BoundedRetryPolicy can allow limited retries, NoRetryPolicy can prohibit them, and CheckpointRecoveryPolicy can govern restoration. A normal validation check is still appropriate; the rule is to avoid growing type/provider/status branches that select interchangeable behavior.

## Supply Dependencies Instead of Hiding Them

An executor may need an agentic runtime, workspace tools, and artifact storage. Give it those collaborators through its constructor or a deliberately scoped execution capability. This is dependency injection: the object receives what it needs instead of secretly creating clients or finding them in a global service locator.

A composition root, using factories such as WorkflowFactory, assembles the concrete objects before work starts. It connects the selected model adapter, repositories, clocks, policies, and event publisher. A standalone test can supply fakes through the same interfaces.

Core domain objects and contracts must stay independent of concrete database clients, model SDKs, HTTP handlers, and UI components. Adapters translate those external details into the framework's contracts. Keep interfaces small; an executor should not receive one universal service object exposing the whole application.

RunRepository saves run state, CheckpointStore supports restoration, ArtifactStore keeps produced materials, and WorkflowEventPublisher publishes progress through an adapter. The engine coordinates with these capabilities without taking over their implementations.

## Build Objects from Collaborators

Investigation and editing both use a model, but that does not mean they need a large shared parent class. They can receive the same AgenticMindUnit capability and configure different assignments and tools.

This is composition: combine useful capabilities to create behavior. Prefer it to deep inheritance. A base class is appropriate only when it expresses a real, stable shared lifecycle with meaningful extension points, rather than sharing a few lines.

Keep helper logic used only by one class inside that class as a private method. If it grows into a separate responsibility or gains real independent consumers, extract a collaborator or shared utility. Pure reusable functions and plain readonly data are welcome when a class would add no useful ownership. The goal is clear objects, not the largest possible number of classes.

The fluent workflow builder is simply a readable way to configure those objects. Its input policy objects select data through apply(); task execution and lifecycle behavior still belong to the appropriate classes.

## Extend the Framework Without Rewriting Its Centre

Suppose Google login needs a security-review step. Implement SecurityReviewExecutor against the shared Executor contract and inject its model and evidence-reading capabilities. Assemble it through composition, then add its assignment and input policy through WorkflowBuilder.

StepRunner invokes that executor through the same interface as the others. WorkflowRun records the accepted outcome through its domain methods, and a transition policy determines the permitted next assignment. The engine's coordination algorithm does not need a new security-review branch.

Keep the implementation inside src/services/harness/workflow-framework/. Use matching filenames for principal classes and interfaces, and export the supported public API through index.ts. The [file-organization guide](02-location-and-file-organization.md) describes the full layout, including domain objects, policies, adapters, and composition.

## Check What the Objects Actually Do

Test public behavior: an invalid lifecycle change is rejected, two runs keep independent results, and replacing an executor or policy does not require engine changes. Save and restore state to verify that completed results and recovery decisions survive correctly.

Use injected fake providers, tools, clocks, and stores where appropriate. Test private helpers through the public behavior they support. For the complete Google-login story showing these objects in action, read [Every Framework Feature Together](25-complete-agent-example-all-framework-features.md).

## Use One Policy Interface Across Modules

Define Policy<TInput, TOutput> once in contracts/Policy.ts with apply(input): Promise<TOutput>. Concrete input, context, routing, retry, recovery, completion, guard, memory, provider prompt-cache configuration, sub-agent admission, and planning implementations all follow it. Do not create separate mapper, domain-policy, or selection-policy interfaces for these decisions.

The class name describes its purpose: SpecificationInputPolicy prepares an assignment, EditingContextPolicy selects model material, and BoundedRetryPolicy returns a retry decision. Their consumers depend on the shared interface with precise types. Supply them through constructors or typed builder configuration, and await apply(). Different input/output types keep the responsibilities distinct without separate base contracts. The executor, unit, provider, tool, and store interfaces still express their execution or storage capabilities.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

## Make Stable Model Requests an Architectural Invariant

The composer and provider adapters must cooperate to enable provider prompt caching. The composer preserves stable logical ordering of unchanged instructions, tools, and output contracts. Each adapter preserves stable representation in its provider payload and owns capability-specific controls and usage mapping. Inject these collaborators through existing interfaces rather than adding provider branches in executors. Verify the final serialized requests, not only intermediate objects; cache hits remain provider-controlled.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
