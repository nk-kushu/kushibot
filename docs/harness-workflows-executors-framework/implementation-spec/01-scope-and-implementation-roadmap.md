# 01. Scope and Implementation Roadmap

## Status and Purpose

**Library:** kushibot  
**Document type:** Implementation scope and delivery roadmap  
**Status:** Initial specification; describes required behavior, not completed implementation.

This document defines what the standalone framework must deliver, what remains outside its scope, and the order in which its components should be implemented and verified. Later documents define the detailed contracts, classes, persistence models, and acceptance scenarios for their own areas.

The framework turns a user goal into controlled, observable work. A workflow defines the plan, a step defines an assignment, an executor performs that assignment, and a run records one execution. Model-backed work uses AgenticMindUnit; focused child AgenticMindUnits are sub-agents.

This specification describes future implementation.

## How Workflows, Steps, and Executors Fit Together

Think of a workflow as a recipe, a step as one instruction in that recipe, and an executor as the worker capable of carrying out that instruction.

| Concept | Meaning |
| --- | --- |
| WorkflowDefinition | The reusable plan: steps, dependencies, and allowed transitions, including bounded correction paths. |
| StepDefinition | One assignment: which executor to use, how to prepare its input, and what result and acceptance rules apply. |
| IExecutor | The shared capability contract. A concrete executor performs an assignment through execute(input, context). The same implementation can serve different steps. |
| WorkflowRun / StepRun | The records of one actual execution and its step executions, keeping results, attempts, status, and evidence separate from the reusable plan. |
| WorkflowEngine / StepRunner | The engine coordinates the plan; the runner prepares and executes a selected step, validates its outcome, and coordinates durable acceptance. |

For example, a Google-login workflow can contain:

```text
Investigate existing login → Write specification → Edit code → Verify changes
```

1. The engine selects the investigation step whose dependencies are satisfied.
2. StepRunner prepares its assignment from the user request and accepted inputs, then invokes **WorkspaceInvestigationExecutor** through IExecutor.
3. The executor returns evidence-backed findings. The framework validates and saves the accepted outcome before dependent work uses it.
4. **A structured-task executor uses those findings to prepare the specification**. An editing executor then changes the working copy, and a verification executor runs actual checks.
5. If checks fail, an allowed correction transition may revisit editing within the remaining limits. If work stops, the run records partial progress and unresolved requirements rather than pretending every step completed.

**The step describes what is needed; the executor implements how to do it.** 

A model-backed executor can use AgenticMindUnit and sub-agents internally. A verification executor may instead run a local process. The workflow engine uses the same executor contract for both and does not duplicate their internal logic.

## Implementation Boundary

**The standalone kushibot library must be created in this project root:**

```text
/Users/niki/PersonalProjects/KushiBot
```

Framework source, tests, adapters, examples, and implementation documentation belong inside that project. Read its applicable project instructions before implementing the library.

This absolute location supersedes earlier references to src/services/harness/workflow-framework/ in the design notes and package-layout specification. Treat those documents' module layouts as guidance for organization within KushiBot, not as instructions to create the library inside another application's Harness directory.

The files in this Notes folder are design and specification documents, not runtime source code.

The standalone implementation must:

- Expose its supported public API through index.ts.
- Keep core domain logic independent of model SDKs, database clients, HTTP routes, and UI components.
- Use application-owned composition code to assemble concrete providers, stores, policies, tools, and workflows.
- Initialize only framework-owned storage through versioned schema setup.
- **Run deterministic demonstrations without paid model calls or credentials.**

Existing AI Harness behavior, application routes, UI, application-wide schemas, and unrelated database tables are outside this implementation boundary. **Integrating the completed framework into an existing application requires a separately scoped task.**

## Required Capability Scope

The initial standalone release includes the following bounded capabilities. Delivery can be incremental, but the framework **must not be described as complete** while a required capability or its acceptance evidence remains missing.

| Area                               | Required result                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public contracts and OOP structure | Small interfaces, cohesive classes, constructor injection, explicit ownership, and one shared IPolicy contract.                                                                          |
| Definitions and execution          | Validated workflow and step definitions, reusable executors, isolated run state, StepRunner, and WorkflowEngine.                                                                         |
| Persistence and artifacts          | Framework-owned run/session/operation records, checkpoints, usage records, scoped memory storage, and referenced artifacts. SQLite and PostgreSQL adapters share the relevant contracts. |
| Model operations                   | A replaceable IModelGateway, registered provider adapters, validated results, and honest provider usage mapping.                                                                         |
| Decisions and routing              | Bounded DecisionUnit calls, eligible model selection, explicit abstention/failure outcomes, and recorded session handoffs.                                                               |
| Tools and workspaces               | Registered tools with validated inputs and scoped capabilities; isolated working copies and controlled file operations.                                                                  |
| Context and prompt caching         | Context-policy selection, AgentContextComposer, stable final provider requests, and supported provider prompt-cache controls and accounting.                                             |
| Agentic execution                  | Session-owned conversation, DraftNotebook, bounded model/tool loop, completion evaluation, and structured outcomes.                                                                      |
| Sub-agents                         | Parent-requested child AgenticMindUnits with separate sessions, selected context, inherited constraints, and durable outcome delivery.                                                   |
| Guards and skills                  | Mandatory guidance and checks, optional bounded selection, validated dependency ordering, and explicit unresolved coverage.                                                              |
| Limits and partial work            | Shared reservations/accounting, local caps, deadlines, cancellation, and explicit stopped outcomes retaining supported partial work.                                                     |
| Recovery and lifecycle             | Validated restoration, effect/usage reconciliation, duplicate-delivery handling, and owned-resource shutdown.                                                                            |
| Memory                             | Scoped retrieval and validated knowledge proposals, distinct from session notes, execution records, and artifacts.                                                                       |
| Review and publication             | Source-bound verification/review, exact change proposals, trusted approval, target checks, and publication records.                                                                      |
| Examples and verification          | Offline public-API examples, focused behavior tests, storage contract checks, and interruption/recovery scenarios.                                                                       |

Detailed public names **are finalized in their owning specifications**. Existing notes contain illustrative APIs; implementation must consolidate those into one coherent set of contracts rather than copy competing examples verbatim.

## Architectural Requirements

### One Shared IPolicy Contract

All configurable selections, decisions, and transformations use:

```typescript
interface IPolicy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

**Input preparation, context selection, routing, completion, retries, transitions, recovery decisions, guard selection, memory validation, sub-agent admission, and skill planning use purpose-specific input/output types under this interface.** Do not introduce parallel mapper or domain-policy base interfaces.

**Policies return decisions or transformed data.** 

Executors execute, tools perform operations, stores persist, and coordinators enforce runtime invariants. A policy decision does not reserve capacity, grant access, start a child, or prove an action happened.

### One Class or Interface Per File

**Every class must be declared in its own file.** 
**Every interface must also be declared in its own file,** separately from any implementing class or other interface. 

**This applies to public and internal declarations, abstract classes, adapters, factories, test fakes, and example implementations.**

Interface names must begin with capital I followed by a PascalCase descriptive name: IPolicy, IExecutor, IModelGateway, IDecisionProvider, and IArtifactStore. Class names remain descriptive PascalCase without an interface prefix, such as WorkflowEngine and AgentContextComposer.

The filename must exactly match the declaration: IPolicy.ts declares IPolicy; AgentContextComposer.ts declares AgentContextComposer. index.ts re-exports these declarations rather than defining them inline. Do not bypass this rule through local, nested, or anonymous class declarations.

This convention is authoritative for implementation and subsequent specifications. Earlier design notes using names such as Policy or ModelGateway refer to the same intended contracts, now named IPolicy and IModelGateway; do not create parallel prefixed and unprefixed interfaces.

### Object Ownership and Replaceable Behavior

- Domain objects protect their lifecycle invariants through methods and validated restoration.
- Immutable definitions can be reused; mutable state belongs to each run, step execution, session, or operation.
- Provider, executor, store, and policy behavior is replaceable through interfaces and registered implementations. Avoid growing switches that select interchangeable behavior by provider, kind, or status.
- Class-specific helpers remain private. Plain data and reusable pure functions do not require artificial wrapper classes.
- Inject clocks, identifiers, provider clients, stores, and runtime collaborators as appropriate; do not hide external dependencies in global state.

### Enable Provider Prompt Caching by Construction

**The framework must preserve the opportunity for provider prompt caching, not build its own answer cache.**

The context policy selects current authorized material. 

**AgentContextComposer arranges unchanged instructions, tool definitions, and output requirements consistently while preserving message authority.** 

The provider adapter preserves their stable representation in the final request and applies supported provider controls and usage mapping.

Changing task evidence must remain current. Compression may change a prefix when needed for correctness or capacity. Every new model request still makes a provider call and generates a new answer. Only provider reporting can establish actual cached-input reuse; neither tests with fake providers nor stable payloads guarantee a real hit.

### Sub-Agents Are a Framework Capability

An authorized parent can request a sub-agent through the proposed spawnSubAgent capability. SubAgentCoordinator coordinates admission, identity, construction, lifecycle, and outcome delivery using the existing AgenticMindUnit runtime and factory.

Each sub-agent **has its own session, assignment, conversation, notebook, and local counters.** Selected tools, models, context, and limits stay inside inherited scope and shared allowances. A new child cannot reset consumed budget or create publication authority.

**Sequential editing is the default for editing sub-agents sharing a workspace.** One workspace-scoped gate coordinates all participating framework-managed writers, including the parent. **The next editor reads current source only after the previous editor's writes are settled or reconciled.** Separate sessions alone do not isolate files. External changes require detection before stale edits are applied.

Read-only sub-agent execution can begin sequentially. Parallel scheduling and concurrent editing are not required to demonstrate initial sub-agent support.

### Limits Preserve Useful Partial Work

When an assignment cannot continue under its effective hard limits, stop new admission, settle or reconcile started operations, **and preserve supported findings, artifacts, actual changes,** unresolved requirements, and source references within storage bounds.

Return an explicit stopped outcome with **partial-progress information.** A parent may use supported findings under its remaining allowance and acceptance rules; it cannot treat missing evidence as completed work. A global exhausted budget also prevents further parent model calls.

An extra model-generated closing summary requires capacity reserved beforehand. Bounded bookkeeping capacity does not authorize additional generation. Persistence failures and uncertain effects must remain visible.

### Evidence, Approval, and Durable Truth

**A model's statement that a test passed is not test evidence.** 

A report's valid shape does not establish its conclusions. Checks and review remain tied to the source they evaluated.

Work occurs in an isolated working copy. Publishing changes to the designated original target requires trusted approval bound to the exact proposal and target, followed by current target checks. A child or model response cannot grant that approval.

Recovery restores compatible recorded execution and reconciles uncertain actions. It must not blindly replay file writes, duplicate sub-agents, reset usage, or reinterpret completed work as a fresh execution.

## Delivery Phases and Exit Criteria

The file numbering provides the main implementation sequence. **Interfaces needed by an earlier milestone may be declared before their full implementations.** End-to-end wiring follows the dependency phases below; cross-cutting controls are introduced early and completed with their concrete owners.

Testing accompanies each phase. The final examples phase integrates already verified behavior rather than postponing correctness checks until the end.

| Phase | Owning specification files | Required exit evidence |
| --- | --- | --- |
| A. Foundations | [02](02-package-structure-and-oop-conventions.md)–[04](04-configuration-and-dependency-injection.md) | Public module boundary, shared contracts, composition dependencies, and configuration validation are defined without requiring live external services. |
| B. Durable execution foundations | [05](05-execution-identities-and-state-machines.md)–[09](09-budgets-limits-and-partial-outcomes.md) | Invalid lifecycle transitions are rejected; saved records restore; artifacts remain scoped; reservations cannot double-spend; partial outcomes preserve supported work. |
| C. Models, tools, and workspace boundaries | [10](10-model-gateway-and-provider-adapters.md)–[15](15-rules-skills-and-guards.md) | Replaceable providers, bounded decisions/routing, validated tool operations, isolated workspace edits, sequential writer admission, and required guards work through contracts. |
| D. Context and agent runtime | [16](16-context-policy-and-agent-context-composer.md)–[20](20-sub-agents-and-parent-child-coordination.md) | Final payloads preserve unchanged shared material; compression preserves requirements; agent loops respect limits; sub-agents use separate sessions and shared accounting. |
| E. Workflow execution | [21](21-executors-and-result-contracts.md)–[23](23-workflow-engine-and-transitions.md) | Built-in executors run through StepRunner; results are validated and durably accepted before dependent steps proceed; transitions and fix rounds stay bounded. |
| F. Recovery, knowledge, and host lifecycle | [24](24-cancellation-checkpoints-and-recovery.md)–[27](27-startup-resource-ownership-and-shutdown.md) | Interruption/cancellation reconciles effects; memory proposals retain provenance; publication requires exact approval; startup/shutdown respects resource ownership. |
| G. Integrated demonstration | [28](28-end-to-end-examples-and-acceptance-checks.md) | Standalone examples exercise success, stopped partial progress, sub-agents, sequential editing, approval waiting, and recovery without paid calls or existing Harness changes. |

Recovery-aware operation identities, cancellation checks, source references, and accounting cannot be retrofitted only in Phase F. Their contracts and records begin in Phase B; Phase F verifies coordinated behavior across the completed runtime.

Configuration contracts begin in Phase A. Concrete resource acquisition, startup rollback, admission, and shutdown are completed in Phase F after the owning components exist.

### Built-In Executors

Phase E must provide the four default executors already described in the framework notes:

1. **WorkspaceInvestigationExecutor**: read/search and evidence-backed findings.
2. **StructuredTaskExecutor**: configured specification, review, or other structured model-backed work.
3. **WorkspaceEditingExecutor**: explicitly scoped edits in the isolated working workspace.
4. **VerificationExecutor**: actual bounded checks and their reported outcomes.

Additional application executors use the same contract. They must not require new branches in the engine.

### Storage and Provider Delivery

Use deterministic fake stores/providers to establish contracts and offline scenarios. Add a durable SQLite implementation for local restart demonstrations, then verify PostgreSQL implementations against the same relevant storage contracts before claiming both backends are supported. Concurrent reservation and delivery semantics must be tested against the actual backend guarantees.

Concrete SDK integrations live in provider adapters. The selected initial provider/model and supported API options must be documented in spec 10 during implementation planning; this scope document does not invent an SDK contract or guarantee support for every provider. Capability coverage and integration checks must distinguish an illustrative adapter, an offline fake, and a working external integration.

Offline acceptance must not depend on a real provider cache hit. Optional live checks require separately configured credentials and permitted external calls; their cost and usage remain accounted for.

## Out of Scope for the Initial Standalone Release

- Existing Harness integration, UI screens, HTTP endpoints, production deployment, or unrelated application-schema changes.
- A framework response cache, semantic answer reuse, cached DecisionUnit answers, or merged model requests substituting one generation for multiple callers.
- Training models or treating provider cache retention as durable memory.
- Arbitrary model-generated executable classes, dynamically installed tools, or unvalidated executable plans.
- Concurrent editing sub-agents by default, automatic conflict-free merging, or distributed multi-host scheduling guarantees.
- Unlimited nested sub-agents, retries, correction rounds, or budget resets.
- Automatic publication based on a model review, generic approval text, or another source version's approval.
- A promise to implement every provider, tool integration, or artifact-storage backend. Supported adapters must be named and verified explicitly.

These exclusions do not remove required extension interfaces. Additional implementations can be added through those boundaries in separately scoped work.

## Release Acceptance Checklist

The initial standalone framework is ready only when the following observable behaviors are demonstrated:

- [ ] A consumer uses index.ts to assemble and run a workflow with injected collaborators.
- [ ] Every class and interface has its own matching file; every interface name begins with capital I followed by a descriptive PascalCase name.
- [ ] Two runs of one definition do not share mutable execution/session state.
- [ ] Each built-in executor performs its stated capability through the common contract.
- [ ] Results, evidence, and artifacts are validated and persisted before dependent work treats them as durable inputs.
- [ ] Both supported database adapters satisfy their storage contracts; restart examples restore compatible state.
- [ ] Concurrent budget reservations do not spend the same remaining allowance twice; unknown usage is retained for reconciliation.
- [ ] Repeated compatible model requests preserve stable final shared input while changed evidence is included correctly.
- [ ] Unsupported provider-cache controls do not fabricate cache hits or bypass normal generation/accounting.
- [ ] A parent starts a genuine child AgenticMindUnit with separate state and receives an explicit validated outcome.
- [ ] Editing sub-agents sharing a workspace take turns; the next editor sees the current source and unresolved writes block unsafe continuation.
- [ ] A stopped sub-agent preserves partial evidence and open questions; the parent does not silently promote it to a completed report.
- [ ] Mandatory guards and required checks cannot be dropped by a model-generated plan or exhausted allowance.
- [ ] Cancellation and restart do not duplicate child creation, replay uncertain writes blindly, or reset consumed usage.
- [ ] Publication waits for trusted approval of the exact current proposal/target and records its actual outcome.
- [ ] Shutdown closes owned resources without closing externally owned clients or losing unresolved-effect records silently.
- [ ] Deterministic examples and required behavior checks run without paid model calls or changes to existing Harness behavior.

A milestone report must identify implemented capabilities, verification performed, incomplete items, and known limitations. Passing a fake-provider demonstration does not establish real-provider compatibility; a SQLite example does not establish PostgreSQL support.

## Concrete End-to-End Scenario

Use Google login as a teaching fixture, not as authorization to modify a real application's authentication code.

1. The application assembles fake model/decision providers, framework stores, scoped workspace tools, policies, guards, and the four executors through the public API.
2. Investigation reads a controlled source fixture. A supervisor requests a sub-agent to inspect session handling.
3. If that child reaches its local iteration limit, it returns Stopped with partial findings and unresolved questions. The parent uses only supported evidence and continues only where allowance and acceptance rules permit.
4. Specification produces requirements that preserve password login. Accepted findings and source references become inputs to editing.
5. Editing sub-agent A updates login.ts. Editing sub-agent B waits, reads A's resulting file, then applies its separately scoped fix. Their conversations remain separate and their writes are serialized.
6. Across model calls, AgentContextComposer and the selected adapter keep unchanged shared instructions/tools/output contracts stable while including each current assignment and source version.
7. Verification runs real local fixture checks. A configured review evaluates the resulting source; any correction requires remaining allowance and new applicable checks.
8. The framework creates a source-bound change proposal and waits for trusted approval. No model output substitutes for approval.
9. An interruption restores recorded state and reconciles pending operations without rerunning a completed child or charging settled usage twice.
10. If approved and the target still matches, the publication component applies the exact proposal to a disposable fixture target and records a receipt. Without approval, the example remains waiting and demonstrates that no publication occurred.

## How the Remaining Specifications Will Be Written

Each owning specification should define its purpose, public contracts, class responsibilities, dependencies, state/persistence rules, normal flow, negative and partial outcomes, extension boundaries, and concrete acceptance scenarios. Do not fill a document with proposed class names without specifying observable behavior.

Record unresolved implementation choices explicitly in the owning document. Storage schemas belong to persistence specifications, provider API details to adapter specifications, and runtime algorithms to their component specifications. Shared terms and ownership must stay consistent across documents.

Some design notes reference 07-first-version-scope.md, which is currently absent. Do not treat that missing reference as an additional hidden requirement. This document supplies the implementation scope; any later recovered conflicting requirement must be reconciled explicitly before it changes delivery commitments.

## Design References

- [Framework overview](../harness-workflows-executors-framework-idea.md)
- [Location and file organization](../02-location-and-file-organization.md)
- [OOP architecture](../08-oop-architecture-and-design-rules.md)
- [Executors and contracts](../03-executors-and-contracts.md)
- [Shared policy contract](../31-shared-policy-concept.md)
- [Configuration and startup](../26-framework-configuration-and-startup.md)
- [Provider prompt caching](../27-llm-cache-and-safe-response-reuse.md)
- [Sub-agents](../framework-for-students/19-delegation-asking-another-worker-for-help.md)
- [Limits and partial outcomes](../framework-for-students/20-budgets-and-limits-knowing-when-to-continue-or-stop.md)
- [Skills and execution ordering](../30-skill-ordering-and-smart-orchestration.md)

**Next specification:** [02. Package Structure and OOP Conventions](02-package-structure-and-oop-conventions.md)
