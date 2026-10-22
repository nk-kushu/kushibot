# 02. Package Structure and OOP Conventions

## Status and Purpose

**Library:** kushibot  
**Document type:** Package structure and object-oriented implementation conventions  
**Status:** Initial specification; defines required structure, not completed implementation.

This specification defines where framework code belongs, which module owns each responsibility, how dependencies cross module boundaries, and how the public API remains independent of infrastructure. It is part of Phase A in the [implementation roadmap](01-scope-and-implementation-roadmap.md).

The structure must make providers, stores, policies, and executors replaceable without rewriting the engine. A folder tree alone does not satisfy this requirement: the implementation must enforce the ownership and dependency rules below.

The source layout is a planned implementation target. These Markdown files remain specifications in Notes; populating this document does not create runtime code or establish that any listed class is already implemented.

## Implementation Root and Package Boundary

All framework-owned source, adapters, tests, fixtures, examples, and implementation documentation belong under:

```text
/Users/niki/PersonalProjects/KushiBot
```

This **is the required standalone library project root,** consistent with specification 01. Read the applicable instructions in KushiBot before implementation. All module paths below are relative to this root; do not nest the library inside an existing application's Harness directory.

The framework is a standalone library project at this location. This specification does not require publication to npm or a particular build system. Inspect KushiBot's existing TypeScript, module, lint, test, and package configuration before choosing or adding project tooling. Reuse compatible setup already present there and record any required packaging choices. Do not inherit another application's source-tree layout as the library root.

Applications and standalone examples consume the supported API through the root index.ts. HTTP handlers, UI code, application composition, and workflows outside the library must not import private implementation files.

## Required Module Layout

Create modules when their owning capability is implemented; do not generate empty classes or speculative files simply to fill this tree.

```text
/Users/niki/PersonalProjects/KushiBot/
├── index.ts
├── contracts/
│   ├── IPolicy.ts
│   └── runtime/                  # Shared clock, identity, cancellation contracts
├── domain/                       # Definitions and workflow/step run invariants
├── builder/                      # Validated workflow construction
├── engine/                       # WorkflowEngine and StepRunner
├── policies/                     # Workflow input, transition, and retry policies
├── executors/                    # Four built-in executors and their assembly
│   └── contracts/               # IExecutor.ts and IExecutionContext.ts
├── workflows/                    # Reusable, application-neutral workflow definitions
├── agentic/
│   ├── model/                    # Normalized model data and provider adapters
│   ├── context/                  # Context selection and AgentContextComposer
│   ├── sessions/                 # AgenticSession state and restoration
│   ├── notebook/                 # DraftNotebook and session notes
│   ├── tools/                    # Tool contracts, registry, dispatch coordination
│   ├── sub-agents/               # Child admission, lifecycle, outcome delivery
│   └── runtime/                  # AgenticMindUnit and its model/tool runner
├── models/                       # Profiles, routing, gateway factories, handoffs
│   └── contracts/               # IModelGateway.ts
├── decisions/                    # DecisionUnit and decision-provider adapters
├── guards/                       # Rules, skills, required checks, ordering
├── artifacts/                    # Artifact contracts, references, scope semantics
├── memory/                       # Scoped retrieval and validated knowledge proposals
├── workspaces/                   # Copies, file tools, editing gate, publication
├── usage/                        # UsageLedger contracts, reservations, settlement
├── execution-control/            # Admission, deadlines, cancellation coordination
├── recovery/                     # Checkpoints and effect/usage reconciliation
├── persistence/
│   ├── sqlite/                   # SQLite implementations and owned schema setup
│   └── postgresql/               # PostgreSQL implementations and owned schema setup
├── errors/                       # One custom class per file, each extends Error
├── events/                       # Event contracts and safe tracing/recording
├── composition/                  # Explicit factories and resource assembly
├── tests/
│   ├── unit/
│   ├── contracts/
│   ├── integration/
│   ├── acceptance/
│   ├── fakes/
│   └── fixtures/
├── examples/                     # Offline consumers of the root public API
├── docs/                         # Implementation and extension guides
└── README.md
```

Module names are placement rules, not promises that every module needs a public class of the same name**. Each class and interface has its own matching file.** Related type aliases, constants, or pure functions may be grouped where appropriate, but no grouping may introduce a second class or interface declaration into a file.

## Contract Ownership and One Source of Truth

Use one authoritative declaration for each concept. Re-exporting a contract does not create a second owner.

| Contract or concept                                          | Owning location                         | Consumers                                                    |
| ------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------ |
| IPolicy<TInput, TOutput>                                     | contracts/IPolicy.ts                    | All modules with configurable decisions or transformations.  |
| Shared clock, identifier generation, cancellation capability | contracts/runtime/                      | Runners, coordinators, providers, and stores as needed.      |
| WorkflowDefinition, StepDefinition, WorkflowRun, StepRun     | domain/                                 | Builder, engine, repositories, and recovery.                 |
| IExecutor and IExecutionContext                              | executors/contracts/                              | **Built-in and consumer-provided executors; StepRunner.**    |
| IModelGateway | models/contracts/IModelGateway.ts | Agentic runtime, provider adapters, and model-gateway assembly. |
| Normalized model request/result contracts | agentic/model/ | Gateway contract, provider adapters, and agentic runtime. |
| Model profile, routing inputs/outcomes, handoff records      | models/                                 | **Routing and session coordination.**                        |
| IDecisionProvider and structured decision contracts          | decisions/                              | DecisionUnit and registered provider implementations.        |
| Tool definitions and operation input/output contracts        | agentic/tools/                          | Tool dispatch, workspace tools, and sub-agent tools.         |
| Context-policy input/selection and composed context          | agentic/context/                        | AgentContextComposer and the model/tool runner.              |
| Session state and notebook contracts                         | agentic/sessions/ and agentic/notebook/ | Agentic runtime, persistence, and recovery.                  |
| Sub-agent request, admission, and delivery contracts         | agentic/sub-agents/                     | Parent tools, SubAgentCoordinator, and stores.               |
| Artifact references and IArtifactStore                       | artifacts/                              | Evidence-producing and evidence-consuming modules.           |
| Usage reservations and UsageLedger                           | usage/                                  | **All operations that consume shared allowance.**            |
| Workspace scope, writer admission, and publication contracts | workspaces/                             | Editing tools, executors, and publication coordination.      |
| Run/session/checkpoint repository contracts                  | contracts/ storage-related files        | Runtime owners, recovery, and concrete persistence adapters. |

IExecutor and IExecutionContext are owned by executors/contracts/. StepRunner and executor implementations import those authoritative contracts internally; external consumers use their re-exports from the root index.ts. Do not duplicate either interface in the top-level contracts/ folder.

Module-specific policies use the shared IPolicy interface with their own input and result types. Do not add independent IInputMapper, IContextPolicy, ISubAgentPolicy, or routing-policy base interfaces. Names such as EditingContextPolicy and BoundedSubAgentPolicy identify concrete implementations or roles.

The detailed signatures, outcome variants, and runtime validation rules belong to [specification 03](03-core-contracts-and-shared-policy.md) and each component's owning specification. This page fixes placement and ownership without inventing competing versions of those contracts.

## Dependency Direction

This section explains **which parts of the framework are allowed to know about other parts**. In code, knowing about another part usually means importing it or receiving it as a collaborator.

The main idea is: **give an object a capability through an interface, instead of making it depend on one specific implementation.**

For example, StepRunner needs an executor:

```text
StepRunner uses IExecutor
                     ↑ implements
           WorkspaceEditingExecutor
```

StepRunner calls execute() through IExecutor. It does not need to know whether that executor edits files, investigates code, or runs tests. The engine does not gain a new branch for each executor implementation.

The same pattern applies elsewhere:

| Object | What it knows | Details kept elsewhere |
| --- | --- | --- |
| Workflow engine | Steps, executor contracts, and results | How files are edited or tests are run. |
| Agent runtime | IModelGateway and its normalized requests/results | How a specific provider's SDK works. |
| Repository consumer | A storage interface | SQLite or PostgreSQL queries and connection types. |
| Domain object | Its state and valid operations | Database connections, provider SDKs, HTTP requests, and UI components. |

### Composition Code Connects the Objects

Composition code is the setup code that chooses concrete implementations and passes them into the objects that need them:

```text
Composition chooses an OpenAI adapter
                ↓
Passes it to the agent runtime as IModelGateway
                ↓
Agent runtime uses it without knowing OpenAI-specific details
```

The runtime still calls the real adapter; the interface describes the capability it uses. The composition code may import concrete classes to construct them. The runtime and domain objects must not call back into composition to look up dependencies.

### Rules to Follow

- **Keep one definition of each interface.** IExecutor belongs in executors/contracts/IExecutor.ts, alongside IExecutionContext in its own file. Import these authoritative contracts instead of creating copies.
- **Keep model selection separate from model calls.** models/ selects eligible profiles and supplies registered factories. The single IModelGateway contract belongs in models/contracts/IModelGateway.ts. **Provider adapters implement it**; the runtime and factories depend on that same interface. The interface may reference normalized request/result data owned by agentic/model/, without depending on concrete adapters or runtime implementations. The agent runtime uses it without constructing SDK clients or choosing database backends.
- **Keep database details in storage adapters.** Concrete database implementations belong in persistence/. Their consumers use repository, IArtifactStore, memory, or ledger contracts. SQL queries and connection types do not belong in workflow definitions or domain objects.
- **Keep file operations behind workspace and tool capabilities.** The engine coordinates work; workspace tools perform permitted edits and publication components apply approved changes. The engine must not apply file patches or publish changes itself.
- **Keep core objects independent of application infrastructure.** domain/ and core contracts must not import concrete provider SDKs, database clients, HTTP handlers, UI components, or host application services.
- **Keep dependencies one-way.** Composition constructs and connects objects. Those objects use the capabilities supplied to them rather than importing composition/ to find collaborators.
- **Avoid circular imports.** If A imports B and B imports A, reconsider who owns their shared responsibility or introduce the narrow interface the consumer needs. Re-exporting files through an index does not fix the underlying cycle.
- **Keep provider-specific formats inside adapters.** Workflow definitions and normalized model results must not contain provider payload or database connection types. An explicitly supported adapter configuration may expose the specific type it needs, but that detail stays at the integration boundary.
- **Use direct imports inside the framework.** Internal files import the specific owning files they need, such as executors/contracts/IExecutor.ts. They must not import their own root index.ts. That root file is the public entrance for applications and examples; importing it internally can pull unrelated modules back into the dependency chain.

### Practical Example: Replace a Provider or Database

1. The application starts with an **OpenAI model adapter** and a **SQLite repository implementation.**
2. The agent runtime calls IModelGateway, while the engine uses repository contracts. Neither contains provider-specific API calls or SQL queries.
3. To use another supported provider or PostgreSQL, composition supplies compatible implementations and their configuration.
4. **The engine and domain logic keep using the same contracts.** The new adapters must still satisfy the required capabilities, storage guarantees, usage mapping, and acceptance checks; replacing an implementation does not automatically prove compatibility.

This structure keeps changes near the object that owns the detail. A provider API change belongs in its adapter; a workflow transition belongs in workflow/domain coordination.

## Public API and Import Rules

The root index.ts explicitly **exports supported contracts, domain capabilities, builders, runtime entry points, built-in executors, configuration types, and supported adapter/composition entry points as their owning specifications become implementable.**

Use named exports and export type for type-only declarations where the KushiBot toolchain supports it. Do not use unrestricted export-star chains that accidentally expose schema internals, private helper classes, provider payload types, or test fakes.

Public adapter imports must not open connections, read credentials, create tables, start timers, or make provider calls. Resource acquisition occurs only through explicit startup/assembly. Optional infrastructure must not become a mandatory initialization dependency merely because a consumer imports the public API; use an appropriate lazy assembly boundary when necessary.

Adding an executor or registered provider must not require a new engine branch. Its supported factory or constructor can be exported explicitly, and application composition supplies it through the existing contract.

Tests may import internals when testing their owning module. Public-API examples must consume index.ts and must not rely on tests/fakes/ through unpublished paths. Example-specific fake implementations can implement exported interfaces within examples/; examples are never production dependencies.

## OOP Class and File Conventions

### Cohesive Objects and Private State

Use a class when it owns a meaningful capability, invariant, or lifecycle. **Every class and every interface must have its own file.** A file containing a class **must not also declare an interface or another class**; **a file containing an interface must not also declare another interface or a class.** This includes internal declarations, abstract classes, test fakes, example implementations, and local or nested declarations. Use named classes rather than anonymous class expressions that bypass file ownership.

**Every interface name begins with capital I followed by a descriptive PascalCase name.** Examples are IPolicy, IExecutor, IModelGateway, IDecisionProvider, IArtifactStore, and IExecutionContext. Concrete class names use descriptive PascalCase without an interface prefix: WorkflowEngine, AgentContextComposer, and SubAgentCoordinator.

Filenames match their declaration exactly: IPolicy.ts contains IPolicy; IExecutor.ts contains IExecutor; WorkflowEngine.ts contains WorkflowEngine. The I prefix applies to data interfaces as well as behavioral interfaces. Type aliases and enums do not require an I prefix. Do not replace a meaningful interface with a type alias simply to evade the convention.

Use lowercase descriptive module directories and follow KushiBot's established suffix convention for tests. Test and example classes/interfaces belong in separate named files under their respective support directories. Test-case files import them. Documentation may display several labeled file snippets together, but must make their separate source-file boundaries explicit.

For example:

```text
contracts/
└── IPolicy.ts                    # Only interface IPolicy
executors/contracts/
├── IExecutor.ts                  # Only interface IExecutor
└── IExecutionContext.ts          # Only interface IExecutionContext
models/contracts/
└── IModelGateway.ts              # Only interface IModelGateway
agentic/model/
└── ExampleModelGateway.ts        # Only class ExampleModelGateway
agentic/context/
├── AgentContextComposer.ts       # Only class AgentContextComposer
└── LoginReviewContextPolicy.ts   # Only class LoginReviewContextPolicy
```

**ExampleModelGateway** implements the interface imported from models/contracts/**IModelGateway**.ts; it does not declare a second gateway interface in agentic/model/. External consumers use the supported root index.ts re-export.

**LoginReviewContextPolicy** imports **IPolicy** from contracts/IPolicy.ts; it does not redeclare that interface alongside the class. index.ts re-exports supported declarations from their owning files and defines no classes or interfaces itself.

This convention supersedes the unprefixed interface names and combined teaching snippets in older design notes for implementation purposes. Consolidate those sketches into the single prefixed contract rather than creating both Policy and IPolicy, for example.

Keep mutable state private. **WorkflowRun, StepRun, and AgenticSession expose operations and readonly views or snapshots instead of writable status fields**. Restoration goes through validated reconstruction; loading a stored object must not bypass lifecycle rules.

Readonly TypeScript declarations alone do not protect runtime arrays or nested objects. Do not expose mutable internal references through snapshots. Copy or freeze data where required by the object's actual ownership boundary.

Immutable definitions and stateless executor instances may be reused. Invocation-specific conversation, notebook entries, counters, pending operations, and results belong to their run/session/operation. A singleton executor must not retain the current user's assignment between calls.

### Composition and Constructor Injection

Inject clients, repositories, policies, clocks, identifier generators, and factories through constructors or explicitly scoped execution capabilities. A class receives what it needs; it does not receive a universal service locator exposing the entire host.

Reusable construction configuration and invocation-specific authority are separate. A configured tool can be reused, but the current workspace scope, identity, deadline, budget, and cancellation come from the trusted invocation context. Model text cannot manufacture that authority.

Constructor injection does not mean constructors perform network or database work. Use explicit resource acquisition in composition and startup. Clearly identify whether a resource is owned by the framework or borrowed from the host.

### Polymorphic Behavior and Registries

When a branch selects interchangeable behavior by provider, executor kind, backend, or policy type, implement a small contract with registered implementations or a factory. Unknown registrations produce explicit errors or negative outcomes before dispatch; they never fall back silently to broader capabilities.

For example, StepRunner invokes executor.execute through the shared contract. An executor registry resolves a configured executor identity; the engine does not grow a switch containing investigation, editing, verification, and every future executor.

Ordinary validation guards and data inspection remain appropriate. Lifecycle objects may check permitted transitions without creating a class for every status. A boolean or state check does not require polymorphism unless it is choosing replaceable behavior.

### Helpers and Data Types

A helper used only by one class belongs inside that class as a private method. Extract it when it gains a genuine shared purpose or independent responsibility. Do not make private implementation steps public merely to test them.

Plain readonly records, discriminated outcome data, and reusable pure functions are allowed. Do not wrap each field, identifier, or array operation in an artificial class. Use value objects where validation or invariants justify them.

Async methods expose the real operation outcome; returning Promise does not itself enforce timeout, cancellation, transactional durability, or accounting. Those guarantees require the owning runtime and its collaborators.

## Placement of Cross-Cutting Requirements

### Provider Prompt Caching

agentic/context/ owns policy-driven selection and stable logical arrangement of current authorized material. agentic/model/ provider adapters preserve stable final representation and translate supported cache controls and reported usage. models/ owns selection, not a second prompt builder.

Across compatible calls, unchanged instructions, tool definitions, and output requirements retain consistent ordering and representation where message authority and provider protocol permit. Current evidence still changes. Do not create a response-cache module or store cached decisions to answer new requests.

Stable logical context is insufficient if the adapter shuffles definitions or injects changing metadata into the shared prefix. Acceptance checks compare final provider requests. Only provider reporting can establish a real cache hit.

### Sub-Agents and Sequential Editing

agentic/sub-agents/ owns **SubAgentCoordinator**, admission policy implementations, parent/child identities, and durable outcome delivery. The existing session factory and AgenticMindUnit runtime create and execute the child. Do not duplicate the model/tool loop inside the coordinator.

workspaces/ owns a workspace-scoped editing gate. Parent writers and editing sub-agents sharing that workspace use the same gate. Sequential editing is the default: the next editor reads current source after the prior editor's writes are settled or reconciled. A separate conversation is not a separate filesystem.

### Limits, Partial Outcomes, and Recovery

usage/ owns reservation and settlement contracts; execution-control/ owns operation admission and runtime boundaries; recovery/ coordinates recorded-state reconciliation. Domain/session owners retain their lifecycle decisions and validated restoration.

When a hard limit stops work, the owning runner returns an explicit stopped outcome with supported partial findings, source/artifact references, and unresolved requirements. Stores persist it through shared contracts. Do not create separate budget counters or partial-result stores for every executor.

Bookkeeping preserves recorded work within bounded storage. It does not authorize an extra provider generation after exhaustion. A parent may use a child's partial evidence only within its own remaining allowance and acceptance rules.

### Infrastructure and Evidence

Database schema initialization belongs to versioned framework-owned persistence setup. Artifact bytes may use a separately configured storage adapter; IArtifactStore remains the same consumer contract. Provider adapters report normalized usage and operation identities without capturing private reasoning traces.

Actual tool execution, tests, review, and publication keep their own evidence. No policy, cached prefix, valid JSON report, or sub-agent recommendation grants publication authority.

## Concrete Extension Walkthrough

Suppose Google login needs a new security-review executor:

1. Define the bounded review input and result data next to the executor and its contract usage. Reuse the existing shared policy and artifact/evidence contracts.
2. **Implement SecurityReviewExecutor against the public IExecutor interface**, injecting an agentic capability and only the evidence access it needs. Do not add a second model/tool loop.
3. Supply the appropriate context policy to AgentContextComposer. The selected model adapter preserves the shared request structure and includes current source evidence.
4. Register the executor in application composition and reference its identity in a workflow step. The builder validates the definition; StepRunner invokes it through the existing contract.
5. If the executor requests a sub-agent, the existing SubAgentCoordinator creates a separately scoped session. Any editor uses the workspace gate; read-only review does not gain write access.
6. Persist accepted outcomes and source references through repositories and artifacts. If allowance is exhausted, return stopped partial progress and missing review coverage.
7. Extend the explicit public exports only if this is a supported library executor; an application-only executor stays in application-owned composition/source.

The engine algorithm, database selection, and provider-selection logic do not gain security-review branches. Tests verify the new executor through the same extension boundary.

## Custom Error Classes

All framework-defined custom errors belong in the library's root-level errors/ folder:

```text
/Users/niki/PersonalProjects/KushiBot/errors/
├── InvalidTransitionError.ts
├── UnknownRegistrationError.ts
└── PersistenceError.ts
```

These are example names; introduce a concrete error when its owning capability needs it. **Every custom error must be a named class that directly extends the built-in Error class and lives in its own matching file.** Do not define errors inline inside services, combine multiple error classes in one file, or introduce a required intermediate framework base class.

Class names end in Error and use PascalCase. Set name to the concrete error name so diagnostics identify the failure. Add stable machine-readable codes and safe readonly details where callers need them. Error classes are classes, so their names do not receive the interface I prefix.

**File: errors/UnknownRegistrationError.ts**

```typescript
export class UnknownRegistrationError extends Error {
  readonly code = "UNKNOWN_REGISTRATION";

  constructor(readonly registrationId: string) {
    super(`Unknown framework registration: ${registrationId}`);
    this.name = "UnknownRegistrationError";
  }
}
```

**File: errors/PersistenceError.ts**

```typescript
export class PersistenceError extends Error {
  readonly code = "PERSISTENCE_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "PersistenceError";
  }
}
```

For example, a registry can throw UnknownRegistrationError when trusted configuration names an unregistered executor. The operation boundary records that failure and reports the appropriate unsuccessful outcome. It must not silently select a different executor.

Error classes must stay independent of provider SDKs, database clients, and composition code. Infrastructure adapters translate their failures into the appropriate framework errors while preserving diagnostic causes where supported by the chosen TypeScript/runtime target. Messages and exposed details must not leak credentials, raw prompts, or sensitive database contents.

Expected policy rejection, ordinary cancellation, and hard-limit exhaustion still use explicit typed outcomes where specified. They do not require throwing an exception simply because custom error classes exist. At runtime boundaries, normalize relevant exceptions into safe error records; do not persist or serialize a live Error object as an execution result. A failure does not prove that an earlier file write or remote call had no effect.

Internal consumers import the specific class from errors/. Explicitly re-export supported public error classes through index.ts so application code can identify documented errors without importing private files. Do not classify errors by matching their human-readable message text.

## Negative Outcomes and Structural Violations

| Situation | Required handling |
| --- | --- |
| Unknown executor, tool set, provider, or policy registration | Fail validation or return the owning component's explicit rejection; no arbitrary construction. |
| Core imports a concrete SDK, database client, UI, or host service | Treat as a dependency-boundary failure and move integration behind a contract. |
| Two declarations of IModelGateway, IArtifactStore, or IPolicy | Consolidate into the authoritative owner; re-export instead of duplicating. |
| Shared executor retains invocation state | Move state into run/session/operation ownership and verify isolation. |
| An adapter cannot represent a requested feature | Return the documented unsupported/rejected outcome or use an explicitly permitted fallback; do not claim success. |
| A writer bypasses workspace coordination | Reject the operation through its tool/runtime boundary; a separate session is no exemption. |
| Construction fails after acquiring resources | Startup owns cleanup of acquired framework resources; detailed rollback belongs to spec 27. |

A missing planned module is an incomplete implementation milestone, not a reason to add a silent fake production implementation. Placeholder adapters must be clearly identified as fakes or illustrative examples.

## Acceptance Checks

- [ ] All framework-defined custom errors live in errors/, each in its own matching file as a named class directly extending built-in Error.
- [ ] Custom errors expose their concrete name and safe details; expected stopped/rejected outcomes remain distinct from exceptions.

Phase A establishes structure and public contracts without live external services. Later phases repeat the relevant checks as concrete modules arrive.

- [ ] Framework-owned files stay inside /Users/niki/PersonalProjects/KushiBot; application integration remains separately scoped.
- [ ] A public-API compile example imports index.ts without private module paths.
- [ ] Importing the public API performs no resource acquisition, database initialization, or provider calls.
- [ ] Core dependency checks reject concrete infrastructure/host imports and circular implementation dependencies, using the KushiBot project's available tooling.
- [ ] There is exactly one shared IPolicy declaration and one owner for each shared capability contract.
- [ ] A test executor can replace another through the same registration/contract without editing WorkflowEngine or StepRunner.
- [ ] A fake provider/store can be injected without credentials or a live database; this proves the boundary, not concrete backend compatibility.
- [ ] Two executions using a shared definition and executor retain independent mutable state.
- [ ] Public snapshots cannot mutate the owning run/session's state indirectly.
- [ ] Final provider payload checks preserve unchanged shared material while including each request's current evidence.
- [ ] Sub-agent coordination reuses the agentic runtime; parent/child editors use one workspace-scoped gate.
- [ ] Stopped outcomes preserve supported partial work through shared persistence/evidence contracts.
- [ ] New files use cohesive responsibilities, private class-owned helpers, and explicit injected ownership.
- [ ] Each class and interface is declared in a separate matching file, including test and example support declarations; no class/interface file mixes these declarations.
- [ ] All interface names match the capital-I convention, including data interfaces; no duplicate unprefixed contract is introduced.
- [ ] Public entry points only re-export the supported declarations rather than defining inline classes or interfaces.

Do not create empty implementations merely to pass a package-layout check. Behavioral evidence is required as the corresponding capability is delivered.

## Decisions Deferred to Owning Specifications

- Precise generic signatures, typed outcomes, validation and errors: spec 03 and component contracts.
- Configuration precedence, registration validation and injected dependencies: spec 04.
- Execution identities and lifecycle transitions: spec 05.
- Repository serialization, schema versions, migrations and backend guarantees: spec 06.
- Provider SDK selection, API options and capability support: spec 10.
- Context algorithms and final provider serialization checks: specs 16–18.
- Sub-agent scheduling and workspace writer admission: specs 14 and 20.
- Resource startup, rollback and shutdown: spec 27.

Resolve conflicting illustrative names in older notes through these owning specifications. Preserve one public concept rather than exporting every earlier sketch.

## Related Specifications and Design Notes

- [01. Scope and Implementation Roadmap](01-scope-and-implementation-roadmap.md)
- [03. Core Contracts and Shared IPolicy](03-core-contracts-and-shared-policy.md)
- [04. Configuration and Dependency Injection](04-configuration-and-dependency-injection.md)
- [Existing file-organization notes](../02-location-and-file-organization.md)
- [OOP architecture notes](../08-oop-architecture-and-design-rules.md)
- [One shared policy concept](../31-shared-policy-concept.md)

**Previous specification:** [01. Scope and Implementation Roadmap](01-scope-and-implementation-roadmap.md)  
**Next specification:** [03. Core Contracts and Shared IPolicy](03-core-contracts-and-shared-policy.md)
