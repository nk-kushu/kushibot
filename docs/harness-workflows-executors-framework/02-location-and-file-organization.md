# Framework Location and File Organization

## Where the Framework Lives

The proposed implementation belongs in **src/services/harness/workflow-framework/**. Keep its source, adapters, tests, examples, and documentation together there.

The files in **/Users/niki/Notes/harness-workflows-executors-framework/** are the design notes. They describe the planned implementation; they are not the framework code.

Build the framework independently. Existing AI Harness code, routes, UI, and application tables remain unchanged.

## Main Folders

```text
src/services/harness/workflow-framework/
├── index.ts             # Public API used by applications and examples
├── contracts/           # Shared interfaces: Policy, Executor, ExecutionContext, stores
├── domain/              # Workflow/step definitions and run/step execution state
├── builder/             # Constructs valid, typed workflow definitions
├── engine/              # WorkflowEngine and StepRunner
├── policies/            # Input, transition and retry policy implementations
├── recovery/            # Restoring and reconciling interrupted work
├── executors/           # Default and custom task implementations
├── workflows/           # Reusable workflow definitions
├── agentic/             # AgenticMindUnit, sessions, notebook, model/tool loop
├── models/              # Model profiles, selection, adapters/factories, handoffs
├── decisions/           # System 1 DecisionUnit and interchangeable providers
├── guards/              # Skill instructions, rules, guard selection and checks
├── memory/              # Agent memory, retrieval and knowledge proposals
├── workspaces/          # Isolated copies, proposals, approval and publication
├── usage/               # Shared token/call budgets and durable accounting
├── execution-control/   # Deadlines, admission and concurrency controls
├── persistence/         # Storage initialization and concrete storage adapters
├── events/              # Structured debug events and timeline inspection
├── composition/         # Creates implementations and connects dependencies
├── tests/               # Behavior tests and controlled fake providers/tools
├── examples/            # Runnable standalone demonstrations
├── docs/                # Implementation guides
└── README.md            # Getting started
```

Model-call interfaces and provider translation belong to agentic/model/; models/ selects profiles and supplies the configured adapters. There should be one ModelGateway contract, not two competing versions.

## One Policy Contract and Module-Owned Implementations

Define Policy<TInput, TOutput> once in contracts/Policy.ts and export it through index.ts. Its single method is apply(input): Promise<TOutput>. Concrete input, context, routing, retry, guard, completion, provider prompt-cache configuration, memory, sub-agent admission, and skill-planning policies all import this contract.

Place implementations with the module that owns the decision. policies/ contains workflow input/transition/retry implementations; agentic/ owns context/completion policies; models/ owns routing policies; guards/ owns guard policies. Do not add separate mapper or domain-policy interfaces. Types describing policy input and output remain ordinary domain data contracts. See [the shared policy design](31-shared-policy-concept.md).

## Important Rules

- **Use index.ts as the public entry point.** External consumers should not need internal file paths.
- **Give each responsibility one owner.** Run/step state belongs to domain objects, session state to agentic/, and publication state to workspaces/. The engine coordinates them through their methods.
- **Use interfaces and dependency injection.** Concrete model services, decision providers such as JEV, and storage backends can be replaced without rewriting workflows.
- **Keep core logic independent of SDKs, database clients, and UI.** Concrete adapters handle those details; composition/ connects the implementations.
- **Keep class-owned helpers private.** Prefer small cohesive classes and composition. Do not create empty classes or split every small data type into its own file.
- **Avoid duplicate state and contracts.** Share the existing notebook, artifact interface, debug recorder, and usage ledger instead of creating a separate copy for every module.

## Persistence and Verification

The persistence configuration selects PostgreSQL or SQLite, initializes the framework-owned tables through versioned schema setup, and supplies the repositories/stores. Domain objects and executors continue using interfaces. Artifact bytes can use configured database or file/object storage with explicit durability rules.

Use fake models/tools for deterministic offline tests and a durable adapter to verify restart/recovery. Examples should run without changing the current AI Harness or requiring paid model calls.

## Further Reading

- [Core concepts](01-core-concepts.md): what the objects mean.
- [Executors and contracts](03-executors-and-contracts.md): the default capabilities.
- [State machines](22-state-machines-and-coordinated-lifecycles.md): who owns each lifecycle.
- [Persistence explanation](09-core-concepts-explained-with-example.md): PostgreSQL/SQLite configuration and saved data.
- [First-version scope](07-first-version-scope.md): what must be delivered.

## Place Prompt-Cache Responsibilities at Existing Boundaries

Stable context composition belongs with AgentContextComposer. Stable provider serialization, supported cache controls, and cached-input usage mapping belong inside registered provider adapters. Export shared configuration contracts through the normal public API. Do not introduce a response-cache subsystem: the architecture must enable the provider to cache input computation. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

[Back to table of contents](harness-workflows-executors-framework-idea.md)
