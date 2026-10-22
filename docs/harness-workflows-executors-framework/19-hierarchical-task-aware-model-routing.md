# Hierarchical, Task-Aware Model Routing with System 1

## 1. The Idea

The framework should select different models according to the actual work, not only a fixed “planning” or “coding” label. Agent configuration, workflow defaults, step requirements, executor input, and session needs can all contribute to one model-routing decision.

A System 1 `DecisionUnit` can recommend a model from eligible candidates. JEV is one interchangeable provider behind that unit; the routing architecture depends on interfaces rather than JEV-specific behavior.

This page extends the [role-based routing design](14-model-routing-and-escalation.md). It describes proposed standalone framework functionality and illustrative profiles, not current implementation or claims about commercial model performance/pricing.

## 2. Routing at Different Levels

| Level | What it contributes | Example |
| --- | --- | --- |
| Agent | Defaults, permitted profiles, and trusted policy constraints. | Prefer economical profiles when task requirements allow. |
| Workflow | Defaults for a kind of process. | A feature workflow favors stronger planning and review. |
| Step | Requirements and preferences for one assignment in the plan. | Architecture specification differs from documentation. |
| Executor invocation | Actual input, evidence, complexity indicators, and output/tool requirements. | One configuration edit versus a cross-module redesign. |
| AgenticMindUnit session | The resolved profile/gateway for one isolated execution. | Select the coding model before starting the tool loop. |
| Independent model operation | A separate bounded call/sub-operation with its own requirements. | Summarize selected observations with a summarization profile. |

These levels contribute to one decision; they must not independently select conflicting models. A workflow default is configuration, not a second router running beside the session router. A deterministic verification operation needs no model merely because routing is available.

Direct AgenticMindUnit and DecisionUnit users can supply a root routing context without inventing a workflow or step.

## 3. Inheritance, Constraints, and Overrides

`RoutingContextResolver` combines trusted configuration and task-specific facts:

```text
Agent defaults and allowed profiles
  + Workflow defaults
  + Step requirements
  + Executor assignment and evidence
  + Session/operation capability needs
  + Remaining usage and deadline
                     ↓
          One resolved routing context
```

Distinguish overridable preferences from mandatory constraints. More-specific preferences can override inherited defaults under a documented precedence rule. Required capabilities, permission restrictions, parent budget caps, and profile allowlists cannot be weakened by a lower-level hint.

An explicit profile binding is validated for eligibility. If it cannot satisfy requirements, return a visible routing outcome rather than silently choosing an incompatible profile. Record whether fallback is permitted. Conflicting mandatory constraints produce a configuration/routing error; the model cannot resolve them by ignoring one.

Task descriptions and model-generated plans are evidence, not trusted authority to expand a candidate allowlist or budget. Persist a versioned resolved-context snapshot or safe references so a decision can be inspected later.

## 4. One Routing Pipeline

```text
Resolved routing context
          ↓
ModelRouter
          ↓
Filter eligible candidates
          ↓
Configured selection OR optional System 1 recommendation
          ↓
Validate selection and recheck current capacity
          ↓
Reserve budget / acquire permitted capacity
          ↓
ModelGatewayFactory supplies the selected adapter
          ↓
Execute under the selected session/operation limits
```

Eligibility checks capabilities, context/output limits, permitted provider/profile scope, availability information, remaining deadline, and budget. A routing-time budget view is not an atomic reservation; reserve/recheck near dispatch to handle concurrent consumption.

If no candidate is eligible, stop or follow an explicit bounded fallback policy. Do not lower required quality/capability constraints merely to produce a selection. Availability/cost estimates may be uncertain and must be labeled accordingly.

## 5. System 1 Recommendation Example

A decision request can be framed as:

```text
Purpose: select-model-profile
Assignment: Implement a callback route using the saved specification.
Evidence:
  Existing authentication pattern identified.
  Three files expected to change.
  No unresolved architectural questions in the current evidence.

Eligible options:
  economical-coder
  strong-coder

Question:
  Which eligible profile is appropriate for this assignment?
```

Candidate metadata includes bounded capability descriptions and relevant measured quality/usage summaries where available. Do not assume aliases such as “strong” are sufficient evidence of fitness. The provider receives safe task summaries and references rather than unrestricted source or credentials.

`DecisionUnit` returns a validated choice, abstention, or failure. `DecisionAssistedSelection` applies its configured acceptance/fallback policy; the recommendation cannot select an unknown model or grant new tools. Self-reported confidence is not proof of correctness and is not automatically comparable between providers.

Skip System 1 when a validated explicit choice is sufficient, when deterministic role rules resolve the task, or when only one eligible candidate remains. System 1 calls consume time, usage, and budget too. It is not useful to spend more routing work than a simple task warrants.

## 6. OOP Objects and Responsibilities

```text
ModelRouter
├── RoutingContextResolver
│   Resolves defaults, constraints, and task evidence
├── ModelEligibilityPolicy
│   Filters candidates
├── ModelSelectionPolicy
│   ├── ConfiguredRoleSelection
│   └── DecisionAssistedSelection
│       └── DecisionUnit
│           └── injected DecisionProvider
│               ├── JevDecisionProvider
│               └── other compatible adapters
└── ModelGatewayFactory
    Supplies the selected provider adapter
```

| Object | Owns |
| --- | --- |
| `ModelRouter` | Routing orchestration and a normalized routing outcome. |
| `RoutingContextResolver` | Inheritance/precedence and immutable resolved requirements. |
| `ModelEligibilityPolicy` | Deterministic candidate constraints. |
| `ModelSelectionPolicy` | Interchangeable selection behavior; existing role-policy logic can implement or be adapted to this boundary. |
| `ConfiguredRoleSelection` | Registry-based deterministic role/profile preference. |
| `DecisionAssistedSelection` | Bounded decision invocation, answer acceptance, and explicit fallback. |
| `ModelRoutingDecision` | Selected identity, context/policy versions, reasons, evidence references, and lineage. |
| `ModelGatewayFactory` | Concrete adapter assembly through registered factories. |

ModelRouter coordinates routing through injected Policy<ModelRoutingRequest, ModelRoutingOutcome> implementations. ModelEligibilityPolicy and ModelSelectionPolicy name implementations of the same Policy contract, with their own typed inputs and results. Do not add a competing independent router beside it. Supporting selection-result contracts must represent abstention/rejection/no-eligible-profile rather than assuming every call succeeds.

Use constructor injection and small interfaces. Register policy implementations and adapters through composition rather than a growing switch on provider, task kind, or abstraction level. Keep state scoped to the routing invocation/session; shared instances must not mutate a global selected model.

## 7. Bootstrap: Avoid a Router Selecting Its Own Router Forever

The System 1 provider used to select execution models needs an explicit bootstrap profile/provider or a separate finite deterministic selection rule.

```text
Configured decision provider
          ↓
Bounded recommendation among execution candidates
          ↓
Execution model selected
```

Do not route the selector's model call back through the same decision-assisted selector. Reject recursive configuration or impose a validated acyclic dependency graph. A bounded fallback provider is configured separately and its calls are accounted for.

Decision providers remain interchangeable: switching compatible registered adapters changes configuration/composition. Adding a new service requires an adapter and registration, not changes to workflow or AgenticMindUnit algorithms.

## 8. Routing Scope Is Different from Mid-Session Switching

The agent, workflow, step, and executor can specify routing needs at their respective levels. The concrete model is selected at a defined execution boundary.

For the first version:

- An AgenticSession keeps its selected ModelGateway throughout that session.
- Escalation or a model change starts a new session with a ModelHandoff.
- A separate summarization/evaluation operation may select another model under its own child scope without changing the active session's gateway.
- A pure provider transport retry follows its own bounded policy; it does not silently become a new model-selection loop.

A summarization operation receives bounded source material, a result contract, and a budget. Treat its output as a derived artifact/observation, validate it, and preserve source references. It does not get arbitrary tools or inherit writable access to another session's notebook. The composer/session owner applies accepted updates through its own domain methods.

Cross-provider handoffs carry assignment, current source/work references, notebook summary, completed evidence, unresolved operations, and remaining budgets. They do not blindly transplant provider-specific live message protocols, reset usage, or replay uncertain tools.

## 9. Escalation, Feedback, and Stability

Routing can react to observed task difficulty after work begins, through the existing EscalationPolicy and an explicit next-session decision. Use failed checks, repeated issue fingerprints, unmet capabilities, or source contradictions as evidence.

Bound reselection attempts, fallback chains, and escalations. Avoid oscillation between profiles: preserve earlier decisions, failure evidence, and a documented rule for when another change is justified. A new session does not erase no-progress history.

A stronger profile may be asked to diagnose/replan before more edits. Stop if no eligible option remains or budget is exhausted. The desired behavior is a useful, explainable outcome rather than always returning some model name.

## 10. Google Login Across Levels

| Work | Contributing scope/evidence | Illustrative selection |
| --- | --- | --- |
| Investigate existing code | Read-only tools and bounded source search. | Economical investigation profile if eligible. |
| Design authentication changes | Planning step; unresolved design questions and source evidence. | Strong planning profile. |
| Implement a specified task | Coding executor; bounded assignment and known pattern. | Economical coding profile. |
| Diagnose repeated check failures | Recovery evidence; repeated equivalent failure. | Strong recovery profile in a new session. |
| Summarize evidence | Independent bounded summarization operation. | Eligible summarization profile. |
| Execute checks | Deterministic verification capability. | No model required. |

For the coding assignment, System 1 may recommend economical-coder from the eligible set. After actual verification failures, a later decision can recommend stronger assistance. Mandatory checks and final acceptance criteria stay unchanged across selections.

This illustrates the mechanics, not guaranteed quality/cost superiority. Evaluate the configured profiles on representative tasks and measure the whole run, including router calls, retries, fixes, and escalation.

## 11. Budgets, Memory, Debug Events, and Recovery

All selection calls and selected operations consume the same applicable run/agent ledger. Reserve provider capacity before execution; unknown usage and reservations survive recovery. Child routing cannot enlarge parent permissions or limits. Use the [limits design](18-limits-budgets-and-execution-control.md) for hard caps, deadlines, and concurrency.

Memory can supply relevant past outcomes, but freshness, project scope, and evidence matter. Treat recorded model performance as bounded observations, not universal claims that a profile is always suitable.

Extend routing events with abstraction scope/path, resolved defaults, override sources, mandatory requirements, rejected candidates/reasons, decision ID/provider, recommendation, accepted selection, fallback, and reservation outcome. Link decisions to actual model calls, verification results, total usage, and session/handoff identity. Redact bounded task evidence using the shared event policies.

Persist selected concrete model identity, routing-context/policy versions, and handoff lineage in session metadata/checkpoints. A changed configuration on restart must not silently replace an in-flight model; preserve or explicitly hand off according to policy.

## 12. Files, Tests, and Acceptance

Extend the existing `models/` module with ModelRouter, RoutingContextResolver, ModelEligibilityPolicy, and selection-policy implementations. Reuse DecisionUnit in `decisions/`, the existing gateway interface, shared usage accounting, and events. Export supported routing capabilities through index.ts.

Standalone tests cover:

1. Inherited defaults, precedence, explicit bindings, incompatible constraints, and lower-level attempts to expand allowlists/budgets.
2. Deterministic role selection, single-candidate bypass, System 1 choice, invalid choice, abstention, provider failure, and bounded fallback.
3. Bootstrap recursion rejection and no routing loop around the selector itself.
4. Concurrent routing against shared capacity with atomic reservation/rechecks.
5. Session model stability, independent operation routing, explicit escalation handoff, and recovery identity.
6. Provider interchangeability, trace lineage, usage accounting, and sanitized evidence.

Demonstrate an agent with workflow defaults, a planning-step preference, task-aware coding selection, a separately routed summary, and verification-driven escalation. Use fake providers for deterministic orchestration tests; evaluate actual model quality separately before assuming the routing strategy improves completion or cost.

[Model Routing and Escalation](14-model-routing-and-escalation.md) · [System 1 DecisionUnit](15-system-one-decision-unit.md) · ## Construct Adapters That Enable Provider Prompt Caching

ModelGatewayFactory must supply adapters that preserve stable representation of unchanged request material and map supported prompt-cache options and usage for the concrete model. Capability metadata must distinguish supported controls from unsupported ones. Models with automatic prompt caching need no artificial framework cache switch to benefit. Routing and handoff must preserve task correctness and must not assume cached computation transfers between models. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md).

[Back to table of contents](harness-workflows-executors-framework-idea.md)

## Shared Policies at Each Routing Stage

Eligibility, selection, and escalation use the single Policy<TInput, TOutput> contract. ModelRouter awaits eligibilityPolicy.apply(input) and selectionPolicy.apply(input); it does not introduce a competing selection-policy interface. A model-assisted selection policy may call a bounded DecisionUnit and then return a normalized candidate or explicit no-selection outcome. The router enforces inherited constraints and records the final decision. Session creation and atomic usage reservation remain runtime responsibilities.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

