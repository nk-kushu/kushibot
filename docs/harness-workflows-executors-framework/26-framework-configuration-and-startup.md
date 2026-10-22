# Build the Harness from Objects

Imagine building a development agent for the Shop application. You choose its models, storage, tools, workflows, and policies by constructing objects and connecting them through small interfaces.

The library is named kushibot. Library-owned environment variables use the KUSHIBOT_ prefix, including KUSHIBOT_LOG_ENABLED and KUSHIBOT_LOG_LEVEL.

This is the startup approach for our framework. Your application code assembles the harness. Durable stores save its task progress, evidence, and useful knowledge so it can continue working across restarts.

The examples describe proposed classes and APIs, not implemented library exports. They show the connections; a complete application also supplies its concrete integrations and lifecycle handling.

## Construct the Collaborators

Start with the durable capabilities your agent needs. For example, create a SQLite connection, repositories backed by that connection, and a filesystem artifact store:

```typescript
const database = new SqliteDatabase({
  filename: "./data/agent.sqlite",
});
await database.initialize();

const runs = new SqliteRunRepository(database);
const checkpoints = new SqliteCheckpointStore(database);
const memory = new SqliteMemoryStore(database);
const artifacts = new FileArtifactStore({
  directory: "./data/artifacts",
});
```

The filename and directory are ordinary constructor arguments. You can obtain values from your application's environment or settings, but the objects and their behavior are constructed in code.

RunRepository saves accepted run/step state, CheckpointStore supports recovery, and ArtifactStore holds reports and other produced materials. The memory store supplies durable backing for scoped memory capabilities. Session notes still belong to AgenticSession and DraftNotebook; one shared database does not make these responsibilities the same.

The engine depends on those interfaces. A compatible PostgreSQL repository can replace a SQLite implementation without adding database-specific logic to the workflow engine. Connecting another database does not automatically transfer existing data.

## Connect Models and Decisions

Next, assemble the model and decision capabilities your agent will use:

```typescript
const decisions = new BoundedDecisionUnit({
  provider: new JevDecisionProvider(jevClient),
});

const router = new ModelRouter({
  profiles: modelProfiles,
  selectionPolicy: new DecisionAssistedSelectionPolicy(decisions),
});
```

The application supplies jevClient and modelProfiles as runtime integrations. Profiles identify the actual available models and their capabilities. The decision provider is injected through an interface, so JEV can be replaced by another compatible implementation.

Routing means choosing a suitable model for an assignment. Planning can prefer a stronger profile while bounded coding can prefer an economical profile. DecisionAssistedSelectionPolicy implements Policy<ModelSelectionInput, ModelSelectionOutcome>. Its apply() method asks System 1 for a recommendation, then the routing policies validate eligibility, requirements, and remaining budget.

The selector has its own explicitly supplied provider, avoiding recursive model selection. Each session keeps its selected gateway. Escalation creates a new session with a handoff rather than changing a shared runner's model field. The [routing chapter](19-hierarchical-task-aware-model-routing.md) explains these details.

## Supply Custom Policy Objects

Your agent may have a custom input policy, review rule, tool, or routing policy. Supply that behavior directly through workflow definitions and injected collaborators.

For example, a specification step receives this input policy object:

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class SpecificationInputPolicy implements Policy<SpecificationWorkflowContext, SpecificationInput> {
  async apply(context: SpecificationWorkflowContext): Promise<SpecificationInput> {
    return {
      goal: context.request.goal,
      findings: context.results.investigate.findings,
    };
  }
}

const stepConfiguration = { inputPolicy: new SpecificationInputPolicy() };
```

The policy selects task data for an executor through apply(). It stays in your executable workflow code alongside its types and dependencies. Import Policy from the framework public API; the typed constructor dependency is Policy<SpecificationWorkflowContext, SpecificationInput>. Custom policies and tools follow the same principle: implementations own behavior, and the application connects them through interfaces.

You can group construction inside a ShopHarnessFactory class to keep startup code organized. That factory is ordinary application code you instantiate and call. It can receive external collaborators through its constructor and build your chosen workflow, guards, tools, policies, and storage objects.

The framework supplies reusable defaults, including the four default executors. You configure those objects for your tasks or inject custom implementations where needed. You do not need to reimplement an executor merely to change the assignment or model.

## Assemble and Start the Harness

The composition root connects these capabilities to the harness:

```typescript
const harness = new AgentHarness({
  runs,
  checkpoints,
  memory,
  artifacts,
  decisions,
  router,
  // Also supply the engine, executors, workspace, guards, and host services.
});
```

This is a construction excerpt, not a complete constructor contract. Those additional objects are assembled through the same explicit approach. The facade coordinates access to them; WorkflowEngine remains responsible for workflow execution.

Use public interfaces and implementations exported through index.ts. Keep core execution objects independent of concrete SDKs, database clients, routes, and UI. Constructor injection makes those dependencies replaceable and allows tests to use deterministic fakes.

Before accepting work, initialize owned resources and validate their compatibility. The application must supply actual models, credentials, authorized workspace boundaries, check implementations, and a trusted approval source. A model cannot provide user approval simply by returning an approved result.

Storage initialization follows the selected adapter's schema policy under startup coordination. It does not install a database server or alter unrelated application tables. If startup fails, report the error and release resources acquired during that startup attempt.

## Give the Agent a Task

After assembling the objects, construct the executable workflow definition and create an isolated working workspace. An illustrative application call could be:

```typescript
const definition = new FeatureWorkflow(executors).define();

const workspace = await workspaceManager.create({
  source: "/projects/shop",
  sourceState: "current-working-state",
});

const run = await harness.start(definition, {
  scope: { agentId: "developer-agent", projectId: "shop" },
  request: {
    goal: "Add Google login while preserving existing login",
    workspace: workspace.id,
  },
});
```

Here executors and workspaceManager are collaborators assembled by your application. The structured-task executor instances have their specification/review instructions and validated result contracts. The workflow's identity, version, dependencies, and required capabilities are validated before execution.

The goal is task input. The workflow and its policy objects are executable definitions. Workspace tools operate in the isolated copy; approved publication is a separate operation bound to exact reviewed changes and the designated original target.

The trusted host validates agent/project scope and credentials. It enforces required guards, tools, limits, and approval boundaries. Framework defaults cover ordinary tuning, while your constructor arguments and policy objects express the choices you want to control.

## Save Progress, Then Reconstruct Objects on Restart

During work, repositories persist accepted results, lifecycle state, checkpoints, pending operations, usage, proposals, approvals, and receipts. ArtifactStore persists produced materials. AgentMemory retains supported facts and experience for future tasks through its own policies.

These are different kinds of saved information. Current execution state enables safe continuation; reusable knowledge helps later tasks. The [memory distinction chapter](24-execution-state-versus-reusable-knowledge.md) explains why one cannot replace the other.

After a restart, your startup code constructs the same compatible collaborators again and reconnects them to their stores. The host then explicitly requests recovery of a saved run. Recovery checks definition/policy compatibility, actual operation effects, protocol, usage, and approval before continuing.

Rebuilding objects does not prove an earlier tool finished, reset consumed tokens, or approve a new proposal. Persist the execution's effective policy values and versions so recovery can validate them; current host restrictions still apply. A changed implementation may require an explicit compatible continuation rather than silently interpreting old state differently.

## Close Resources Deliberately

On shutdown, stop new admission and drain or checkpoint active work under policy. Close resources the harness owns, preserving externally owned shared clients. Record unresolved effects honestly, especially when publication may have partially applied.

Direct AgenticMindUnit or DecisionUnit calls can use the same constructed capabilities without a workflow wrapper. They still need trusted scope, execution limits, and tracing.

Keep your application-specific assembly in its composition code. Framework-owned contracts, default factories, validators, and implementations stay inside the dedicated framework folder. Existing AI Harness code remains outside this standalone implementation scope.

To see the constructed objects cooperate through a complete task, read [Every Framework Feature Together](25-complete-agent-example-all-framework-features.md).

## Assemble One Kind of Policy Object

Import Policy<TInput, TOutput> from the public API and supply configured implementations to their consumers. Step configuration uses inputPolicy; AgentContextComposer uses contextPolicy; the unit runner uses completionPolicy; routing, guards, provider prompt-cache configuration, and sub-agent admission receive their own typed Policy dependencies. Each calls await policy.apply(input). Avoid separate mapper or domain-policy interfaces.

A concrete class name describes the behavior, while its constructor arguments provide ordinary tuning. The composition root registers stable identity/version/configuration metadata alongside the object for tracing and recovery. It reconstructs compatible implementations at startup; it does not persist live objects, assume a Promise implements cancellation, or grant permissions based on model-produced configuration.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

## Wire Request Composition for Provider Prompt Caching

Startup assembly must connect a stable AgentContextComposer to registered provider adapters that preserve stable serialization of unchanged messages, tools, and output contracts. Supply supported provider-cache configuration through those adapters; automatic caching must remain possible without requiring an explicit cache option. This is a framework construction requirement, not an optional response-cache service. Verify the composed final payload with repeated shared material and changing evidence, and wire provider-reported cached-input usage into normal accounting. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

[Back to table of contents](harness-workflows-executors-framework-idea.md)
