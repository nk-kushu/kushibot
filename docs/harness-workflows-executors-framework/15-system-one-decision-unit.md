# DecisionUnit: A System 1 Decision Layer

## Purpose

The framework should support a reusable `DecisionUnit` for small, bounded judgments that guide an agent. A JEV-style model can implement its provider interface. “System 1” describes the intended architectural role of quick classification or selection; actual latency, cost, and accuracy must be measured for the configured provider.

A decision unit receives a structured evidence snapshot and a bounded question. It returns a validated answer or an explicit abstention/failure. It does not run a general model/tool loop, implement a feature, or override deterministic framework rules.

This is a standalone framework design. A new provider adapter can demonstrate the contract without changing the current AI Harness. Names below are proposed contracts, not claims about a specific external SDK API.

## Relationship to Other Units

| Component | Responsibility | Example |
| --- | --- | --- |
| `DecisionUnit` | Classify or select among bounded options. | “Which optional review applies to this change?” |
| `AgenticMindUnit` | Pursue a goal through repeated model/tool interactions. | Investigate authentication or implement a callback route. |
| `ModelRoutingPolicy` | Select an eligible model profile under configured constraints. | Use the planning profile for a specification task. |
| Deterministic policy | Enforce invariants, permissions, budgets, and required checks. | Always run mandatory authentication checks. |

The decision layer can provide evidence to routing or workflow policies. It does not replace those policies or become a second workflow engine. Use it only where judgment is useful; exact lookups, schema validation, and permission checks belong in ordinary deterministic code.

## Useful Decision Purposes

- Classify a request into known task categories.
- Select relevant context, memory categories, skills, or optional reviews from an allowed candidate set.
- Identify whether a failure suggests a bounded fix or deeper diagnosis.
- Assess whether an observation is worth proposing for durable memory.
- Resolve ambiguity among known candidates when evidence supports a choice.

A memory-interest decision creates a proposal opportunity, not a confirmed fact. A review-selection decision cannot remove required checks. A routing recommendation cannot grant tools or select a profile that fails eligibility/budget rules.

## Example Request and Outcome

```typescript
const outcome = await decisionUnit.evaluate(
  {
    purpose: "select-review",
    facts: {
      changedFiles: ["auth/googleCallback.ts"],
      changeSummary: "Adds an OAuth callback",
    },
    question: "Which additional review applies?",
    options: ["authentication", "database", "none"],
  },
  decisionContext,
);
```

`decisionContext` supplies trusted correlation identity, cancellation, debug recording, and the applicable usage budget. It is not a model-controlled field. The outcome distinguishes a valid answer from abstention, provider failure, timeout, or invalid output.

The policy applies the result, for example adding authentication review to the already-required review set. “None” is a real candidate answer; it must not silently stand in for provider failure or abstention.

## OOP Objects

| Object | Responsibility |
| --- | --- |
| `DecisionUnit` | Public interface for bounded evaluations. |
| `BoundedDecisionUnit` | Coordinates validation, provider invocation, budgets, and normalized outcomes. |
| `DecisionProvider` | Provider-neutral structured evaluation capability. |
| `JevDecisionProvider` | Adapter translating framework requests/results to and from the configured JEV-style service. |
| `DecisionContract` | Validates allowed questions, answer shape, choices, and supporting references. |
| `DecisionPolicy` | Combines a normalized outcome with mandatory rules and determines acceptance/fallback/escalation. |
| `DecisionProviderRegistry` | Resolves configured provider implementations. |
| `DecisionTraceRecorder` | Uses the shared recorder to capture safe decision events and policy outcomes. |

Inject providers, contracts, policies, clocks, ID generators, and budget interfaces. Register implementations through interfaces and factories; do not add provider-name or purpose switches to the workflow engine. Purpose-specific policy implementations can be resolved through a registry.

## Proposed Contract Sketch

```typescript
export interface DecisionRequest<TChoice extends string> {
  readonly purpose: string;
  readonly facts: Readonly<Record<string, unknown>>;
  readonly question: string;
  readonly options: readonly TChoice[];
}

export interface DecisionUnit {
  evaluate<TChoice extends string>(
    request: DecisionRequest<TChoice>,
    context: DecisionContext,
  ): Promise<DecisionOutcome<TChoice>>;
}

export interface DecisionProvider {
  evaluate<TChoice extends string>(
    request: DecisionRequest<TChoice>,
    context: DecisionProviderContext,
  ): Promise<ProviderDecision<TChoice>>;
}
```

Supporting context/outcome types are omitted here. Implement an outcome contract with distinct answered, abstained, invalid-output, unavailable, and budget/timeout outcomes. Preserve cancellation as an explicit cancellation outcome or propagated typed cancellation according to one documented framework convention; do not turn it into a successful fallback.

The generic choice type improves compile-time checks but does not validate a provider response at runtime. Validate that returned choices belong to the original allowlist. For multiple selections, use an explicit set-valued contract rather than overloading a single-choice answer.

`facts` is a transport sketch, not permission to pass arbitrary application state. Each purpose has a bounded schema, payload limits, and a sanitizer. Validate provider confidence if present, including finite numeric range and documented meaning. Self-reported confidence is not a calibrated probability of correctness by default.

## Provider Interchangeability Is a Core Requirement

The framework depends on the capability `DecisionProvider`, never on JEV as its architecture. JEV is one optional adapter. A hosted structured-output model, a local model service, or another suitable decision service can supply the same interface.

```text
Agent / workflow / executor
  → DecisionUnit
    → injected DecisionProvider
      ├── JevDecisionProvider
      ├── StructuredModelDecisionProvider
      └── LocalDecisionProvider
```

The latter adapter names illustrate alternatives, not a requirement to implement every backend. All must normalize results to the same framework contract; provider-specific request formats, credentials, errors, and usage mapping stay inside the adapter.

### Switching a Registered Provider

The proposed composition API can use explicit registration and a configuration key:

```typescript
// Composition root: SDK/client creation is outside the framework core.
const providers = new DecisionProviderRegistry();
providers.register("jev", new JevDecisionProvider(jevClient));
providers.register("alternative", new StructuredModelDecisionProvider(modelGateway));

const decisionUnit = new BoundedDecisionUnit({
  provider: providers.resolve(config.decisions.providerId),
  contract: decisionContract,
  budget: decisionBudget,
  debug: decisionRecorder,
});
```

```typescript
// Choose one of the registered providers in configuration:
const config = {
  decisions: { providerId: "alternative" },
};
```

This is an illustrative wiring sketch; constructor and registry contracts are to be implemented consistently with the injected context and policy design. The agent still calls `decisionUnit.evaluate(request, context)` without knowing which provider was selected.

Switching between registered compatible providers changes configuration and the next assembled unit. Adding a previously unsupported service requires one new adapter plus registration, not edits to workflows, executors, AgenticMindUnit, or the decision algorithm. Use a registry/Map rather than a growing provider-name switch. Never mutate the provider of an in-flight evaluation; record the selected provider/model identity on each decision.

### Behavioral Substitutability

Interchangeability means preserving semantics, not merely matching method names:

- Validate supported decision shapes and capabilities at composition or before evaluation. Do not silently replace multi-choice evaluation with a single-choice response.
- Normalize abstention, malformed output, timeout, cancellation, unavailable service, usage, and error information through documented contracts.
- Keep answer validation and mandatory policy enforcement independent of the selected service.
- Treat confidence as optional provider-specific metadata. Do not assume a threshold calibrated for one provider has the same meaning for another. Version eligibility/acceptance policies and reevaluate them when changing providers.
- Run the same provider contract-test suite against each adapter, with deterministic fakes for offline tests. Separately evaluate decision quality on representative tasks before assuming equal quality across models.
- Keep optional provider SDK dependencies outside core contracts. Offline composition can use a fake provider without initializing a JEV client or requiring its credentials.

A fallback provider is also an explicit policy choice with its own budget and trace. Provider-neutral does not mean silently swapping services during a failed call or claiming equivalent results without validation.

## Evaluation Lifecycle

1. The caller assembles a bounded evidence snapshot and candidate set from trusted context.
2. The unit validates the request and checks cancellation and budget before calling a provider.
3. A configured provider receives only the permitted evidence and response contract.
4. The unit normalizes and validates the response, including candidate membership and evidence-reference validity.
5. The caller's decision policy evaluates the outcome against mandatory rules and relevant uncertainty.
6. The policy returns an accepted selection, deterministic fallback, preserved ambiguity, or request for deeper evaluation.
7. Usage and sanitized debug events are recorded under the same run/session trace where applicable.

A short evidence summary can explain an answer, but do not request or retain private reasoning traces. Provider output is a recommendation under the contract, not executable instructions.

## Fallback and Escalation

Define fallback per purpose instead of returning a universal “yes” or “no.”

| Situation | Example response |
| --- | --- |
| Optional review selection is unavailable | Use configured conservative review selection while preserving all mandatory reviews. |
| Service/task target remains ambiguous | Keep ambiguity visible or request deeper investigation; do not invent a target. |
| Memory-interest decision abstains | Leave the observation as task-local evidence or an unresolved proposal. |
| Profile recommendation is invalid | Apply the deterministic eligible-profile policy or stop if no eligible profile exists. |
| User cancellation occurs | Stop according to cancellation semantics rather than spending more calls on fallback. |

Thresholds are configurable and should be validated against representative decisions. Combine evidence and uncertainty with purpose-specific policy; do not let one confidence number authorize risky actions. A stronger `AgenticMindUnit` can investigate an unresolved question under its own explicit assignment, tools, and budget.

Provider transport retries are bounded and distinct from deeper evaluation. Decision calls and retries count toward the run-wide usage ledger. Batch independent questions only if the provider contract and result validation preserve their separate identities and outcomes.

The [hierarchical model-routing design](19-hierarchical-task-aware-model-routing.md) uses DecisionUnit to recommend profiles from an eligible candidate set. The selector has an explicit bootstrap provider so it does not recursively route its own model selection.

## Guard Selection Through System 1

[GuardSelectionService](20-guards-skills-rules-and-system-one-selection.md) uses DecisionUnit with purpose select-guards and an explicit multi-selection/per-guard relevance contract. The configured JEV adapter or another compatible provider selects task/diff-relevant candidates; deterministic policy validates recommendations and preserves required guards. Selected skills guide work before actual polymorphic rule checks evaluate it. Abstention/provider failure follows a configured conservative fallback, never an implicit empty guard set.

## Example: Google Login

1. The agent receives “Add Google login.”
2. A task-classification decision identifies authentication-related work from a known category set.
3. Deterministic policies attach required constraints and select an eligible planning profile, optionally using this classification as evidence.
4. Planning and coding `AgenticMindUnit` sessions execute their assignments with explicitly permitted tools.
5. Once a diff exists, a review-selection decision evaluates it and recommends an optional review category.
6. The review policy combines accepted recommendations with required checks. Tests still execute regardless of the model's recommendation.
7. If the decision provider fails, its policy records and applies the configured fallback rather than disguising failure as “no review needed.”

## Memory and Evidence

The decision layer may receive selected scoped memories or source references, but it does not automatically search an agent's entire memory store. The caller owns retrieval and permissions. Stale or conflicting evidence must remain visible.

Record the evidence snapshot version/fingerprint and source IDs so a later developer can understand what informed a choice. Each model-backed evaluation calls its configured provider with current authorized evidence and generates a new decision. Provider prompt caching may reuse supported computation for unchanged input; the framework does not store decisions for response-cache lookup. Reevaluate when relevant evidence changes.

## Debug Events and Inspection

Emit `decision.requested`, `decision.provider.started/completed/failed`, `decision.validated`, and `decision.policy.applied` with a stable `decisionId`. Preserve run, step, attempt, session, span, and causation IDs where present. Standalone evaluations use their own root trace.

Record purpose, contract/version, safe question and candidate summary, evidence references, selected answer or abstention, validation outcome, confidence metadata when supplied, provider/model identity, duration, usage, policy/version, and fallback/escalation reason. Redact and bound payloads through the shared debug policies.

The timeline must distinguish what the model recommended from what the deterministic policy actually applied. An answer can be valid while still being rejected by policy.

## File Organization and First-Version Scope

Add `decisions/` inside the dedicated framework folder, with the public `DecisionUnit` and `DecisionProvider` contracts, `BoundedDecisionUnit`, a provider registry, purpose contracts/policies, and standalone adapters. Export supported types through `index.ts`.

Implement and demonstrate bounded classification/selection, runtime validation, abstention, purpose-specific fallback, shared budgets, cancellation, and correlated debug events. Use a fake provider for deterministic standalone tests; an optional JEV adapter must satisfy the same contract without being required for offline tests.

Test unknown/out-of-set answers, invalid confidence values, malformed output, empty candidate sets, ambiguous evidence, provider failure, cancellation, exhausted budgets, mandatory-rule preservation, scoped facts, and safe trace payloads. Verify that new purpose/provider implementations do not require changes to engine control flow.

[AgenticMindUnit](12-agentic-mind-unit.md) · [Model Routing](14-model-routing-and-escalation.md) · ## Enable Provider Caching for Repeated Evaluations

The decision request builder and DecisionProvider adapter must preserve stable instructions, decision contracts, and unchanged candidate definitions across compatible evaluations. Keep changing evidence current and in its proper role. The adapter preserves stable provider serialization, applies supported prompt-cache controls, and reports available cached-input usage. This enables provider reuse without caching decision answers in the framework.

[Back to table of contents](harness-workflows-executors-framework-idea.md)

## Decision Recommendations and Shared Policies

DecisionUnit remains a bounded execution capability backed by DecisionProvider. A calling policy implements Policy<DecisionApplicationInput, DecisionApplicationOutcome> and awaits apply() with the normalized recommendation, required rules, trusted candidate set, and evidence. DecisionPolicy names that role or a concrete implementation, not another interface. The result describes acceptance, fallback, preserved ambiguity, or a stop; the trusted coordinator validates and carries it out. Providers and units retain their own capability methods.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

