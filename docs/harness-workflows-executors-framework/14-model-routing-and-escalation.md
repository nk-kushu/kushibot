# Model Routing: Strong Planning, Economical Coding

## Purpose

The framework should let an agent use different models for different work: a stronger model for planning, an economical model for bounded coding tasks, and a suitable model for review or recovery. Model selection must be explicit, configurable, observable, and independent of provider-specific code.

Routing alone does not ensure quality or savings. The design needs precise handoffs, independent verification, bounded fixes, and escalation based on evidence. Repeated unsuccessful economical-model attempts can cost more than one successful stronger-model attempt.

This is a proposed standalone framework capability. Profile names below are configuration aliases, not recommendations for particular commercial models or claims about their current capabilities or prices.

For task-aware selection influenced by agent, workflow, step, executor, session, and independent operation scopes, see [Hierarchical, Task-Aware Model Routing](19-hierarchical-task-aware-model-routing.md). It adds provider-neutral System 1 recommendations, inheritance rules, and bootstrap safeguards while preserving session-boundary handoffs.

## Example Flow

```text
User goal: Add Google login
            ↓
Planning unit — stronger model
  Investigates relevant code and produces an implementation contract
            ↓
Coding unit — economical model
  Implements a bounded task with permitted workspace tools
            ↓
Deterministic verification
  Runs configured checks and records actual results
            ↓
Review unit — configured review model
  Compares the specification, changes, and verification evidence
            ↓
Accept, request a bounded fix, stop, or escalate
```

Do not equate a model's self-reported success with verified completion. Different models can make correlated mistakes; deterministic checks and source evidence remain important even when planning and review use a stronger model.

## OOP Objects

| Object or interface | Responsibility |
| --- | --- |
| `ModelProfile` | Immutable configured identity, provider/model reference, supported capabilities, context/output limits, and usage constraints. |
| `ModelRequirements` | Capabilities needed for this task: tools, structured output, input size, and any configured quality constraints. |
| `ModelRoutingPolicy` | Resolves a suitable profile for the task role and requirements, returning an explainable decision. |
| `ModelProfileRegistry` | Resolves profile aliases and validated configuration. |
| `ModelGatewayFactory` | Supplies a model adapter for the selected profile through provider factories registered by capability. |
| `EscalationPolicy` | Evaluates verification evidence, repeated failures, uncertainty, and budgets to decide whether stronger assistance is needed. |
| `RunUsageBudget` | Tracks and reserves usage across sessions, calls, retries, and escalation within one run. |
| `ModelHandoff` | Carries a bounded assignment, evidence, current work, and unresolved issues into the next session. |
| `ModelRoutingDecision` | Records selected profile, policy/version, reasons, requirement checks, and fallback/escalation lineage. |

Keep profile selection separate from execution. `AgenticMindUnit` uses an injected `ModelGateway`; it does not choose providers through branches inside its loop.

## Proposed Contracts and Configuration

The following API sketch uses the shared Policy contract and omits supporting contracts and adapter implementations. ModelRoutingPolicy names the routing role or a concrete implementation, not a second interface:

```typescript
// Import the single Policy contract from the framework public API.
// Inside ModelRouter, the injected routing collaborator has this type:
// Policy<ModelRoutingRequest, ModelRoutingOutcome>

export type ModelRoutingOutcome =
  | { readonly kind: "selected"; readonly decision: ModelRoutingDecision }
  | { readonly kind: "unavailable"; readonly reasons: readonly string[] };

export interface ModelRoutingRequest {
  readonly role: string;
  readonly requirements: ModelRequirements;
  readonly budget: UsageBudgetView;
  readonly evidence: RoutingEvidence;
}

export interface ModelRoutingDecision {
  readonly profileId: string;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly reasons: readonly string[];
}
```

A registry-backed role policy can be configured like this:

```typescript
const routing: Policy<ModelRoutingRequest, ModelRoutingOutcome> =
  new RoleBasedModelRoutingPolicy({
    planning: modelProfiles.strong,
    coding: modelProfiles.economical,
    review: modelProfiles.strong,
    recovery: modelProfiles.strong,
  });
```

Role names are configuration keys, not a growing type switch. The policy resolves bindings through a registry/Map and applies injected eligibility and budget policies. A profile with insufficient context, tool support, or output capability must not be selected merely because it is assigned to a role. Unknown roles and unavailable eligible profiles produce explicit configuration/routing outcomes.

The composition root validates aliases and assembles routing, gateway factories, budgets, and escalation policies. Provider-specific identifiers and credentials remain in adapters/configuration, not workflow definitions. Persist the actual selected provider/model identity as well as the alias, since aliases may change over time.

## Selection and Session Ownership

1. A workflow/executor declares the role and requirements for its next agentic task.
2. The coordinator awaits routingPolicy.apply(request) to select an eligible profile under the remaining budget, and handles the explicit unavailable outcome before creating a session.
3. The gateway factory supplies the selected model adapter.
4. A session factory or composition service assembles the agentic runner with that gateway and the permitted tools.
5. `AgenticMindUnit` starts an isolated session and executes its assignment.
6. Actual usage and outcomes update the run budget and provide evidence for later routing decisions.

Select models at session boundaries in the first version. Do not mutate a shared runner's model field per request: concurrent sessions must keep their selected gateway and state isolated. The exact selected profile belongs in session metadata and checkpoints.

A change of model starts a new session with an explicit handoff. Do not silently continue a provider-specific conversation using a different provider's message/tool protocol. A same-model resume can restore validated protocol state; if the selected model is unavailable, record the stop or create a separately identified handoff according to policy.

## Planning-to-Coding Handoff

The planner produces an implementation contract with:

- Goal, constraints, and acceptance criteria.
- Relevant files and source revision/fingerprints from investigation.
- Bounded implementation tasks and their dependencies.
- Required interfaces and behavior, with examples where useful.
- Expected changes, permitted tool scope, and verification checks.
- Known uncertainties and assumptions that require confirmation through evidence.

The coding unit receives the relevant subset, current source context, and explicit completion criteria. It must be able to inspect the workspace; a plan can be incomplete or stale. If the code contradicts the plan, surface the discrepancy rather than forcing the original approach.

The planner specifies the assignment; it cannot enlarge tool permissions or budgets. Those remain controlled by trusted framework configuration.

## Verification, Fixes, and Escalation

Run deterministic checks through a verification executor and preserve structured results: check identity, invocation reference, exit/result status, duration, and sanitized diagnostics. A review unit receives the specification, actual diff, verification evidence, and unresolved questions.

A fix assignment identifies the failed criterion, supporting diagnostic evidence, affected code, and expected correction. Repeating the same vague instruction is not a useful recovery strategy.

An escalation policy can respond to configured evidence such as repeated equivalent failures, a source/design contradiction, failed review criteria, or a task requiring capabilities unavailable in the economical profile. Model-reported confidence can be one signal but is not a reliable gate by itself.

Keep these outcomes distinct:

| Situation | Handling |
| --- | --- |
| Temporary provider failure | Bounded transport retry/fallback policy, with recorded reason. |
| Incorrect implementation | A bounded fix task with verification evidence. |
| Need for stronger reasoning/capability | Escalation to an eligible profile through a new session. |
| No eligible model or exhausted budget | Explicit blocked/stopped outcome and explanation. |

Configure fix and escalation limits. An example policy permits two economical-model fix attempts before requesting stronger assistance, but the threshold is configuration rather than a universal rule. Escalation may ask for a revised plan or diagnosis before authorizing further edits.

A handoff includes assignment/version, current workspace revision and changes, notebook summary, completed results, failed checks, pending questions, usage, and unresolved side effects. It does not copy private reasoning or blindly replay tool calls. Confirm the current workspace before continuing if other work may have changed it.

## Run-Wide Budgets

Maintain one run-wide ledger across all models and sessions, with per-session limits underneath it. Model retries, task fixes, and escalation all consume that ledger; a fresh session does not reset the run budget.

Reserve capacity before calls where possible, account for concurrent reservations, and reconcile with measured provider usage afterward. Use configured output-token caps and call/iteration limits. Monetary cost estimates require a versioned price source; do not assume token counts alone are spend or present estimates as exact billed charges. Interrupted calls can have unknown usage and require conservative reconciliation.

When budget is insufficient, stop or choose another eligible profile under an explicit policy. Do not silently drop capability requirements or label unfinished work as completed to fit the budget.

For the complete hierarchy of run/session/call budgets, deadlines, reservations, unknown usage, retries, memory/tool/storage bounds, and stop behavior, see [Limits, Budgets, and Execution Control](18-limits-budgets-and-execution-control.md). Children cannot enlarge parent allowances and consumption survives recovery.

## System 1 Decision Support

A [DecisionUnit](15-system-one-decision-unit.md), backed by a JEV-style provider or another adapter, can supply bounded classifications and recommendations to routing policies. It remains separate from AgenticMindUnit and cannot override capability eligibility, budgets, or mandatory rules.

## Agent Memory and Handoffs

Model changes do not change the agent's identity or memory permissions. A new session receives relevant, scoped agent memory and a fresh working notebook initialized from an explicit handoff. It does not inherit unrestricted writable access to the previous session's working state.

Treat retrieved procedures, facts, and planner outputs as evidence that can be checked. Keep durable memory provenance tied to the task/session and selected model where useful. A stronger model's assertion is not automatic confirmation of a long-term fact.

## Debug Events

Emit `model.routing.requested/selected/rejected`, `model.escalation.decided`, `model.handoff.created`, and budget reservation/reconciliation/limit events using the shared tracing contracts.

Include task role, profile and resolved model identity, policy/version, reasons, eligibility failures, relevant verification references, previous session/profile, budget summaries, and actual usage when available. Correlate decisions with run, step execution, attempt, session, and model-call identity. Never include credentials or unrestricted prompt/notebook contents.

A developer should be able to answer: “Why was the economical model chosen? Why did we escalate? Which failed check triggered it? What did both attempts consume?”

## Example: Google Login

1. The planning role selects the configured strong profile and produces a source-grounded contract for the OAuth flow.
2. The coding role selects an eligible economical profile and implements the bounded callback-route task.
3. Verification finds a callback URL mismatch and records the failed check.
4. The coding unit gets a new fix assignment with the exact mismatch evidence.
5. If the configured repeated-failure threshold is reached, escalation selects a stronger profile and creates a new session with the diff, checks, and pending questions.
6. That session diagnoses or corrects the issue; verification runs again and review evaluates the final evidence.
7. The run completes only when its completion criteria are met, with model decisions and usage available in the debug timeline.

## File Organization and First-Version Scope

Add `models/` inside the dedicated framework folder for `ModelProfile`, `ModelProfileRegistry`, concrete routing policies, `ModelGatewayFactory`, escalation policies, and handoff contracts. Place run-wide usage ledger/budget implementations in a cohesive `usage/` folder. Reuse the `agentic/model/` gateway contract rather than creating a competing gateway abstraction.

Export public contracts through `index.ts`. The first version supports configured role-based routing, capability eligibility checks, session-boundary handoffs, bounded escalation, run-wide usage accounting, structured verification feedback, and correlated debug events. Advanced learned routing or automatic model benchmarking is optional.

Use deterministic fake profiles/gateways in standalone tests for role resolution, incompatible profiles, fallback/escalation reasons, handoff integrity, concurrent session isolation, budget exhaustion, interrupted-call accounting, and checkpoint identity. Demonstrate a planner/coder/verification/reviewer sequence without requiring paid model calls.

[AgenticMindUnit](12-agentic-mind-unit.md) · [Agent Memory](13-agent-memory.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## One Contract for Routing and Escalation

The router's routingPolicy dependency is Policy<ModelRoutingRequest, ModelRoutingOutcome>; escalation uses Policy<EscalationInput, EscalationDecision>. Both are called through await policy.apply(input). Concrete classes such as RoleBasedModelRoutingPolicy implement the shared contract, not a separate routing interface. The router validates eligibility and coordinates the returned outcome; gateway/session factories carry out the selected execution setup. A selected profile is not a budget reservation, and a routing policy cannot override mandatory constraints.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

