# 12. Model Routing and Handoffs

## What We Implement Here

Create validated model-profile registration, inherited routing context, mandatory eligibility checks, and interchangeable configured or DecisionUnit-assisted selection. Recheck current budget before returning a selection. Add bounded handoff records for fresh sessions and a verification-based escalation policy that preserves existing work, permissions, deadlines, and shared usage.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `models/ModelCapability.ts` | `type ModelCapability` |
| `models/ModelProfileRegistration.ts` | `type ModelProfileRegistration` |
| `models/ModelProfileRegistry.ts` | `class ModelProfileRegistry` |
| `models/ModelRequirements.ts` | `type ModelRequirements` |
| `models/RoutingLayer.ts` | `type RoutingLayer` |
| `models/ResolvedRoutingContext.ts` | `type ResolvedRoutingContext` |
| `models/RoutingContextResolver.ts` | `class RoutingContextResolver` |
| `models/RoutingBudgetView.ts` | `type RoutingBudgetView` |
| `models/RoutingBudgetReader.ts` | `class RoutingBudgetReader` |
| `models/ModelEligibilityInput.ts` | `type ModelEligibilityInput` |
| `models/ModelEligibilityDecision.ts` | `type ModelEligibilityDecision` |
| `models/ModelEligibilityPolicy.ts` | `class ModelEligibilityPolicy implements IPolicy<ModelEligibilityInput, ModelEligibilityDecision>` |
| `models/ModelSelectionInput.ts` | `type ModelSelectionInput` |
| `models/ModelSelectionOutcome.ts` | `type ModelSelectionOutcome` |
| `models/RoleBasedModelRoutingPolicy.ts` | `class RoleBasedModelRoutingPolicy implements IPolicy<ModelSelectionInput, ModelSelectionOutcome>` |
| `models/DecisionAssistedModelRoutingPolicy.ts` | `class DecisionAssistedModelRoutingPolicy implements IPolicy<ModelSelectionInput, ModelSelectionOutcome>` |
| `models/ModelRoutingDecision.ts` | `type ModelRoutingDecision` |
| `models/ModelRoutingOutcome.ts` | `type ModelRoutingOutcome` |
| `models/ModelRouter.ts` | `class ModelRouter` |
| `models/handoffs/ModelHandoff.ts` | `type ModelHandoff` |
| `models/handoffs/HandoffPreparation.ts` | `type HandoffPreparation` |
| `models/handoffs/ModelHandoffContract.ts` | `class ModelHandoffContract implements IResultContract<ModelHandoff>` |
| `models/handoffs/ModelHandoffFactory.ts` | `class ModelHandoffFactory` |
| `models/EscalationInput.ts` | `type EscalationInput` |
| `models/EscalationDecision.ts` | `type EscalationDecision` |
| `models/VerificationEscalationPolicy.ts` | `class VerificationEscalationPolicy implements IPolicy<EscalationInput, EscalationDecision>` |
| `examples/routing/LoginRoutingExample.ts` | `class LoginRoutingExample` |
| `tests/models/checkModelRouting.ts` | `function checkModelRouting` |
| `tests/models/checkModelHandoffs.ts` | `function checkModelHandoffs` |
| `tests/models/checkDecisionAssistedRouting.ts` | `function checkDecisionAssistedRouting` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for shared OOP, file, naming, and writing rules. Keep each class/interface in its own matching file. All policy roles use the existing `IPolicy<TInput, TOutput>`; no `IRoutingPolicy` or competing gateway interface is introduced. Reuse `models/contracts/IModelGateway.ts`, `ModelProfile`, `ModelGatewayRegistry`, the usage ledger, DecisionUnit, partial outcomes, and existing error classes.
- `ModelProfileRegistry` holds at most 32 immutable validated registrations. An alias is not a claim about a commercial model's quality, price, availability, or context capacity. Profiles record exact provider/model configuration. Capability manifests describe implemented/tested adapter behavior, not merely capabilities advertised by a provider. The page-10 OpenAI text adapter may register `text` only; it must be rejected for tool, streaming, continuation, image, or structured-output requirements until corresponding contracts and adapters exist.
- `RoutingContextResolver` takes 1–8 trusted layers ordered from agent to workflow, step, executor invocation, and session/operation. Direct calls can use a single root layer. The first layer supplies the root allowlist; later allowlists only intersect it. Required capabilities accumulate and numeric capacity requirements take the maximum. More specific preferences, explicit profile binding, fallback preference, and safe task summary replace earlier preferences. Explicit binding is an overridable preference, not a way to expand permission. If a trusted host needs a mandatory profile restriction, encode it in the allowlist. A model-produced plan or recommendation is never a trusted layer.
- Distinguish omitted from empty: omitted inherits, an empty allowlist leaves no eligible profiles, and an empty preference list reverts to the surviving allowlist order. Unknown configured IDs and malformed constraints are configuration errors; a valid configuration with no usable candidate returns unavailable. A lower layer cannot remove a mandatory capability, reduce capacity needs, or reintroduce an excluded profile. Defaults such as fallback permission must be explicit in trusted composition; absence here is false. The task summary is bounded sanitized evidence, not authoritative permission or raw source context.
- Role preferences are resolved configuration data rather than a provider/role switch. `RoleBasedModelRoutingPolicy` chooses the first eligible resolved preference. An explicit ineligible binding with fallback disabled stays unavailable. With fallback permitted, the policy records that it used a fallback. Fallback does not weaken capabilities, permissions, token needs, or deadlines.
- Mandatory eligibility checks are owned by `ModelRouter` through its internal deterministic `ModelEligibilityPolicy`; injected additional eligibility can only restrict that result. Check allowed profile membership, registered adapter capabilities, conservative complete-input/output capacity, and remaining model-call/input/output allowance. The simple capacity formula matches the page-10 text profile model; a provider with different accounting must introduce a validated compatible profile/eligibility implementation before registration. Availability and cost ranking are not claimed by these files. Actual model-call validation and provider failure handling remain required.
- `RoutingBudgetReader` computes remaining capacity from the current durable ledger scope and every ancestor, including unknown reservations and actual overages. This view is advisory. Re-read after any asynchronous selection/decision work; capacity may have changed or the decision call may itself have consumed it. `ModelRouter` rechecks eligibility and control before returning. `BudgetedModelCall` still reserves atomically near dispatch. A selected profile, prepared gateway, or handoff does not reserve tokens, acquire a dispatch lease, or guarantee a later request can run.
- Decision-assisted selection uses one explicitly bootstrapped DecisionUnit and only eligible profile IDs as choices. Skip that call for an explicit binding or zero/one eligible candidate. The task summary/role are safe bounded recommendation evidence; profile aliases do not prove measured quality. Do not route this DecisionUnit's own model back through the same selector. Configure its provider/profile directly or validate an acyclic finite dependency graph in composition. Its call consumes the same applicable ancestor allowance and has its own stable operation identity.
- Abstention/invalid output/provider failure can invoke the injected deterministic fallback only when fallback is permitted. Cancellation/deadline and uncertain decision operations propagate; they do not trigger a second paid recommendation or hide pending work. `ModelRouter` validates the selected ID against the already eligible set, rechecks explicit-binding rules, bounds policy metadata, and applies fresh mandatory eligibility. A model cannot select an invented profile or override the final checks. Policies/providers are trusted injected implementations of their declared typed outcome contracts; their unexpected failures remain observable.
- Routing selects one profile at a session boundary; it does not mutate a shared runner's model field. Each new session receives its own gateway and protocol state through the registered gateway factory and future session composition. Concurrent invocations return separate immutable decisions. Save the exact selected profile, provider/model identity, effective context, policy/version, reason, operation ID, and lineage with session metadata/checkpoints. Registry changes cannot silently reinterpret the model used by an existing session.
- `ModelHandoffFactory` constructs a bounded portable record, not a live or durably started session. Source and target session IDs must differ even if the exact profile stays the same. The record keeps authoritative assignment, source revision, saved evidence/artifact references, bounded summary, unresolved requirements, pending operations, permission reference, budget scope, and deadline. It deliberately excludes provider conversation tokens, raw tool-call replay, SDK objects, writable notebook objects, credentials, and private reasoning.
- Validate restored handoffs with `ModelHandoffContract`. Current source/workspace must be revalidated before the target begins. Revision strings and reference membership alone do not prove the workspace is current or a finding is true. Resolve and authorize permission/evidence/artifact references at the target boundary. Derive the new session's effective controls from current trusted parent state, narrowing inherited permissions/deadline as needed; never treat serialized references or a later serialized deadline as permission to expand parent controls.
- Prepared handoffs with unresolved external/model/tool operation effects stay blocked until reconciled. Do not repeat an uncertain write in a new session or discard its reference to get around this check. Preserve other partial work as a stopped outcome if the transition cannot proceed. Editing sessions default to sequential access to a shared workspace; different sessions alone do not isolate `login.ts`. The page-14 workspace owner enforces its editing gate or explicit isolation.
- Handoff initiation requires a durable transaction/outbox boundary in the future session/journal owner: persist the handoff and source transition plus a unique target-session creation command/receipt, then dispatch the new session idempotently. This factory does not provide that persistence transaction. Persist the handoff ID and reuse it on delivery retries; repeatedly calling `prepare()` creates new IDs and is not a recovery protocol. Do not claim a target started because a factory returned an object.
- Every new session, fallback, correction, and escalation retains the same applicable root ledger and remaining deadline. The target can receive a narrower child budget scope, never a fresh unrelated root that erases usage. `VerificationEscalationPolicy` reads trusted durable failure/escalation counters and source-grounded check references. It requests recovery only after its configured repeated-failure threshold, stops at its escalation cap, and blocks unresolved effects. Thresholds are illustrative configuration, not universal defaults.
- A request to escalate is not an execution authorization, consumed escalation counter, budget reservation, or verified fix. The future coordinator atomically increments the escalation counter with the handoff command/receipt before dispatch, and rechecks budget/control. Fixes/iterations are charged through page 09. Technical transport retries, implementation fixes, capability escalation, and model unavailability remain distinct events; none permits an unbounded loop or automatic limit reset. A model's confidence or a review assertion is not proof that verification passed.
- The login routing example selects an eligible **text planning** profile and prepares its gateway without making a provider call or editing code. The handoff test separately demonstrates saved callback-failure evidence moving to a fresh session. A future planner/coder/verification/reviewer workflow can use the same contracts once its actual tool-capable adapters, workspace gate, session runtime, and verification executors are implemented. Do not claim these fixtures deliver a working coding agent.
- Optional debug records use the shared safe recorder and bounded event vocabulary; raw task summaries, prompts, notebook contents, handoff bodies, credentials, and private reasoning are not diagnostic payloads. Add explicit routing/handoff event schemas before emitting new event names. Save durable decisions/outcomes through their owning runtime even when optional logging is disabled. No answer cache is added; provider prompt-cache structure remains with context composition and provider adapters.
- Verification covers hierarchy/intersection/override rules, missing and duplicate registrations, rejected tool requirements on text adapters, ineligible explicit bindings, decision bootstrap/fallback behavior, unknown/out-of-set recommendations, fresh allowance checks, ancestor/unknown usage, cancellation/deadline, concurrent immutable routing results, bounded handoff validation, pending-effect blocking, new-session identity, source revalidation, and escalation caps. Later session integration must also test durable/idempotent target creation, workspace coordination, and checkpoint recovery. Offline checks use fake profiles and no paid provider calls.

## TypeScript Code for Each File

### `models/ModelCapability.ts`

Lists capabilities used for eligibility; registering a capability requires a tested adapter implementation.

```typescript
export type ModelCapability = "text" | "tools" | "structured-output" | "images" | "streaming" | "continuation";
```

### `models/ModelProfileRegistration.ts`

Pairs the existing immutable profile with the capabilities actually implemented by its configured adapter.

```typescript
import type { ModelProfile } from "./ModelProfile";
import type { ModelCapability } from "./ModelCapability";
export type ModelProfileRegistration = Readonly<{ profile: ModelProfile; capabilities: readonly ModelCapability[] }>;
```

### `models/ModelProfileRegistry.ts`

Validates and copies configured profiles, rejects duplicate aliases, and resolves canonical immutable registrations.

```typescript
import type { ModelProfileRegistration } from "./ModelProfileRegistration";
import { ConfigurationError } from "../errors/ConfigurationError";
export class ModelProfileRegistry {
  private readonly profiles = new Map<string, ModelProfileRegistration>();
  register(input: ModelProfileRegistration): void {
    const p = input.profile;
    if (Object.keys(p).sort().join(",") !== "contextTokens,id,maxOutputTokens,maxRequestBytes,maxResponseBytes,modelId,providerId,supportsPromptCacheKey" || ![p.id, p.providerId, p.modelId].every(id => typeof id === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(id)) ||
        ![p.contextTokens, p.maxOutputTokens, p.maxRequestBytes, p.maxResponseBytes].every(value => Number.isSafeInteger(value) && value > 0) ||
        p.maxOutputTokens > p.contextTokens || typeof p.supportsPromptCacheKey !== "boolean" || this.profiles.has(p.id) || this.profiles.size >= 32 ||
        !Array.isArray(input.capabilities) || input.capabilities.length < 1 || new Set(input.capabilities).size !== input.capabilities.length ||
        input.capabilities.some(value => !["text", "tools", "structured-output", "images", "streaming", "continuation"].includes(value))) throw new ConfigurationError("Invalid or duplicate model profile registration.");
    this.profiles.set(p.id, Object.freeze({ profile: Object.freeze({ ...p }), capabilities: Object.freeze([...input.capabilities]) }));
  }
  resolve(id: string): ModelProfileRegistration {
    const value = this.profiles.get(id);
    if (value === undefined) throw new ConfigurationError("Model profile is not registered.");
    return value;
  }
}
```

### `models/ModelRequirements.ts`

Describes mandatory capabilities and conservative input/output capacity for the next assignment.

```typescript
import type { ModelCapability } from "./ModelCapability";
export type ModelRequirements = Readonly<{ capabilities: readonly ModelCapability[]; inputTokens: number; outputTokens: number }>;
```

### `models/RoutingLayer.ts`

Contributes trusted preferences and tightening constraints, ordered from agent defaults to the most specific invocation.

```typescript
import type { ModelCapability } from "./ModelCapability";
export type RoutingLayer = Readonly<{
  taskSummary?: string;
  allowedProfileIds?: readonly string[]; preferredProfileIds?: readonly string[];
  requiredCapabilities?: readonly ModelCapability[]; inputTokens?: number; outputTokens?: number;
  explicitProfileId?: string; allowFallback?: boolean;
}>;
```

### `models/ResolvedRoutingContext.ts`

Records the immutable effective allowlist, ordered preferences, requirements, binding, and fallback choice.

```typescript
import type { ModelRequirements } from "./ModelRequirements";
export type ResolvedRoutingContext = Readonly<{
  schemaVersion: 1; role: string; taskSummary: string; allowedProfileIds: readonly string[]; preferredProfileIds: readonly string[];
  requirements: ModelRequirements; explicitProfileId: string | null; allowFallback: boolean;
}>;
```

### `models/RoutingContextResolver.ts`

Intersects allowlists, unions mandatory capabilities, takes maximum capacity needs, and applies specific preference overrides.

```typescript
import type { RoutingLayer } from "./RoutingLayer";
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext";
import type { ModelCapability } from "./ModelCapability";
import { ModelProfileRegistry } from "./ModelProfileRegistry";
import { ConfigurationError } from "../errors/ConfigurationError";
export class RoutingContextResolver {
  constructor(private readonly profiles: ModelProfileRegistry) {}
  resolve(role: string, layers: readonly RoutingLayer[]): ResolvedRoutingContext {
    if (!/^[a-z][a-z0-9-]{0,63}$/.test(role) || layers.length < 1 || layers.length > 8 || layers[0].allowedProfileIds === undefined) this.invalid();
    let allowed: readonly string[] = this.ids(layers[0].allowedProfileIds as readonly string[]);
    let preferred: readonly string[] = []; let explicit: string | null = null; let fallback = false; let taskSummary = "";
    let input = 1, output = 1; const capabilities = new Set<ModelCapability>();
    for (const layer of layers) {
      if (layer.taskSummary !== undefined) {
        if (typeof layer.taskSummary !== "string" || new TextEncoder().encode(layer.taskSummary).byteLength > 1024 || /[\u0000-\u001f]/.test(layer.taskSummary)) this.invalid();
        taskSummary = layer.taskSummary;
      }
      if (layer.allowedProfileIds !== undefined) { const next = this.ids(layer.allowedProfileIds); allowed = allowed.filter(id => next.includes(id)); }
      if (layer.preferredProfileIds !== undefined) preferred = this.ids(layer.preferredProfileIds);
      if (layer.requiredCapabilities !== undefined) {
        if (!Array.isArray(layer.requiredCapabilities) || layer.requiredCapabilities.length > 6 || layer.requiredCapabilities.some(value => !["text", "tools", "structured-output", "images", "streaming", "continuation"].includes(value))) this.invalid();
        for (const capability of layer.requiredCapabilities) capabilities.add(capability);
      }
      if (layer.inputTokens !== undefined) input = Math.max(input, this.positive(layer.inputTokens));
      if (layer.outputTokens !== undefined) output = Math.max(output, this.positive(layer.outputTokens));
      if (layer.explicitProfileId !== undefined) { this.profiles.resolve(layer.explicitProfileId); explicit = layer.explicitProfileId; }
      if (layer.allowFallback !== undefined) { if (typeof layer.allowFallback !== "boolean") this.invalid(); fallback = layer.allowFallback; }
    }
    // Preferences can be overridden; an explicit binding is an overridable preference, never an allowlist expansion.
    return Object.freeze({ schemaVersion: 1, role, taskSummary, allowedProfileIds: Object.freeze([...allowed]),
      preferredProfileIds: Object.freeze([...preferred.filter(id => allowed.includes(id)), ...allowed.filter(id => !preferred.includes(id))]),
      requirements: Object.freeze({ capabilities: Object.freeze([...capabilities]), inputTokens: input, outputTokens: output }),
      explicitProfileId: explicit, allowFallback: fallback });
  }
  private ids(input: readonly string[]): readonly string[] {
    if (!Array.isArray(input) || input.length > 32 || new Set(input).size !== input.length) this.invalid();
    for (const id of input) this.profiles.resolve(id);
    return [...input];
  }
  private positive(value: number): number { if (!Number.isSafeInteger(value) || value < 1) this.invalid(); return value; }
  private invalid(): never { throw new ConfigurationError("Invalid routing hierarchy or requirements."); }
}
```

### `models/RoutingBudgetView.ts`

Contains the minimum remaining capacity across one budget scope and every ancestor; it is a snapshot, not a reservation.

```typescript
import type { UsageAmounts } from "../usage/UsageAmounts";
export type RoutingBudgetView = Readonly<{ available: UsageAmounts }>;
```

### `models/RoutingBudgetReader.ts`

Reads current persisted usage and computes conservative remaining ancestor capacity, including outstanding unknown reservations.

```typescript
import type { IUsageLedgerStore } from "../usage/IUsageLedgerStore";
import type { RoutingBudgetView } from "./RoutingBudgetView";
import { UsageLedger } from "../usage/UsageLedger";
import { usageDimensions } from "../usage/usageDimensions";
import { zeroUsage } from "../usage/zeroUsage";
import { ConfigurationError } from "../errors/ConfigurationError";
export class RoutingBudgetReader {
  constructor(private readonly store: IUsageLedgerStore, private readonly scopeId: string) {}
  async read(): Promise<RoutingBudgetView> {
    const snapshot = await this.store.read(); const ledger = new UsageLedger(snapshot);
    const scopes = new Map(snapshot.scopes.map(scope => [scope.id, scope]));
    let current = scopes.get(this.scopeId); if (current === undefined) throw new ConfigurationError("Routing budget scope is unknown.");
    const available = { ...zeroUsage }; for (const key of usageDimensions) available[key] = Number.MAX_SAFE_INTEGER;
    while (current !== undefined) {
      const totals = ledger.totals(current.id);
      for (const key of usageDimensions) available[key] = Math.min(available[key], Math.max(0, current.limits[key] - totals.consumed[key] - totals.reserved[key]));
      current = current.parentId === null ? undefined : scopes.get(current.parentId);
    }
    return Object.freeze({ available: Object.freeze(available) });
  }
}
```

### `models/ModelEligibilityInput.ts`

Provides one candidate, resolved mandatory requirements, and a fresh advisory budget view.

```typescript
import type { ModelProfileRegistration } from "./ModelProfileRegistration";
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext";
import type { RoutingBudgetView } from "./RoutingBudgetView";
export type ModelEligibilityInput = Readonly<{ candidate: ModelProfileRegistration; context: ResolvedRoutingContext; budget: RoutingBudgetView }>;
```

### `models/ModelEligibilityDecision.ts`

Explains deterministic eligibility failure without silently weakening a requirement.

```typescript
export type ModelEligibilityDecision = Readonly<{ eligible: boolean; reasons: readonly string[] }>;
```

### `models/ModelEligibilityPolicy.ts`

Checks profile permission, adapter capabilities, context/output capacity, and current aggregate allowance.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { ModelEligibilityInput } from "./ModelEligibilityInput";
import type { ModelEligibilityDecision } from "./ModelEligibilityDecision";
export class ModelEligibilityPolicy implements IPolicy<ModelEligibilityInput, ModelEligibilityDecision> {
  async apply(input: ModelEligibilityInput): Promise<ModelEligibilityDecision> {
    const { candidate, context, budget } = input; const required = context.requirements; const reasons: string[] = [];
    if (!context.allowedProfileIds.includes(candidate.profile.id)) reasons.push("PROFILE_NOT_PERMITTED");
    if (required.capabilities.some(value => !candidate.capabilities.includes(value))) reasons.push("CAPABILITY_UNSUPPORTED");
    if (required.outputTokens > candidate.profile.maxOutputTokens || required.inputTokens > candidate.profile.contextTokens - required.outputTokens) reasons.push("CONTEXT_OR_OUTPUT_TOO_SMALL");
    if (budget.available.modelCalls < 1 || budget.available.inputTokens < required.inputTokens || budget.available.outputTokens < required.outputTokens) reasons.push("ALLOWANCE_UNAVAILABLE");
    return Object.freeze({ eligible: reasons.length === 0, reasons: Object.freeze(reasons) });
  }
}
```

### `models/ModelSelectionInput.ts`

Supplies an eligible candidate list and control for a separately budgeted optional DecisionUnit recommendation.

```typescript
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext";
import type { ModelProfileRegistration } from "./ModelProfileRegistration";
import type { ModelCallControl } from "../agentic/model/ModelCallControl";
export type ModelSelectionInput = Readonly<{ context: ResolvedRoutingContext; candidates: readonly ModelProfileRegistration[]; control: ModelCallControl }>;
```

### `models/ModelSelectionOutcome.ts`

Keeps configured selection, rejected selection, control stops, and uncertain decision operations separate.

```typescript
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type ModelSelectionOutcome =
  | Readonly<{ kind: "selected"; profileId: string; policyId: string; policyVersion: string; reasonCode: string }>
  | Readonly<{ kind: "unavailable"; reasons: readonly string[] }>
  | Readonly<{ kind: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ kind: "uncertain"; operationId: string }>;
```

### `models/RoleBasedModelRoutingPolicy.ts`

Selects the first eligible configured preference without model calls or shared mutable selected-profile state.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { ModelSelectionInput } from "./ModelSelectionInput";
import type { ModelSelectionOutcome } from "./ModelSelectionOutcome";
export class RoleBasedModelRoutingPolicy implements IPolicy<ModelSelectionInput, ModelSelectionOutcome> {
  async apply(input: ModelSelectionInput): Promise<ModelSelectionOutcome> {
    const allowed = new Set(input.candidates.map(item => item.profile.id));
    const bound = input.context.explicitProfileId;
    if (bound !== null && allowed.has(bound)) return this.selected(bound, "EXPLICIT_BINDING");
    if (bound !== null && !input.context.allowFallback) return { kind: "unavailable", reasons: ["EXPLICIT_BINDING_INELIGIBLE"] };
    const selected = input.context.preferredProfileIds.find(id => allowed.has(id));
    return selected === undefined ? { kind: "unavailable", reasons: ["NO_ELIGIBLE_PROFILE"] } : this.selected(selected, bound === null ? "CONFIGURED_PREFERENCE" : "EXPLICIT_BINDING_FALLBACK");
  }
  private selected(profileId: string, reasonCode: string): ModelSelectionOutcome { return Object.freeze({ kind: "selected", profileId, policyId: "configured-role-routing", policyVersion: "1", reasonCode }); }
}
```

### `models/DecisionAssistedModelRoutingPolicy.ts`

Uses at most one preconfigured DecisionUnit recommendation and a separately injected deterministic fallback policy.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { IDecisionUnit } from "../decisions/IDecisionUnit";
import type { ModelSelectionInput } from "./ModelSelectionInput";
import type { ModelSelectionOutcome } from "./ModelSelectionOutcome";
export class DecisionAssistedModelRoutingPolicy implements IPolicy<ModelSelectionInput, ModelSelectionOutcome> {
  constructor(private readonly decisions: IDecisionUnit, private readonly fallback: IPolicy<ModelSelectionInput, ModelSelectionOutcome>) {}
  async apply(input: ModelSelectionInput): Promise<ModelSelectionOutcome> {
    if (input.context.explicitProfileId !== null || input.candidates.length <= 1) return this.fallback.apply(input);
    const outcome = await this.decisions.evaluate({ purpose: "select-model-profile", question: "Select a configured eligible profile for this task role, or abstain.",
      options: input.candidates.map(item => item.profile.id), evidence: [{ ref: "routing:role", text: `Task role: ${input.context.role}. Options have already passed deterministic eligibility; aliases do not imply measured model quality.` }, ...(input.context.taskSummary.length === 0 ? [] : [{ ref: "routing:task", text: input.context.taskSummary }])] }, input.control);
    if (outcome.status === "uncertain") return { kind: "uncertain", operationId: outcome.operationId };
    if (outcome.status === "stopped") return { kind: "stopped", reason: outcome.reason };
    if (outcome.status === "answered") return { kind: "selected", profileId: outcome.answer.choice, policyId: "decision-assisted-routing", policyVersion: "1", reasonCode: "ELIGIBLE_CANDIDATE_RECOMMENDATION" };
    if (!input.context.allowFallback) return { kind: "unavailable", reasons: ["RECOMMENDATION_NOT_ACCEPTED"] };
    const fallback = await this.fallback.apply(input);
    return fallback.kind === "selected" ? { ...fallback, reasonCode: "RECOMMENDATION_FALLBACK" } : fallback;
  }
}
```

### `models/ModelRoutingDecision.ts`

Captures exact provider/model identity, effective context, policy version, reason, and invocation identity for later persistence.

```typescript
import type { ModelProfileRegistration } from "./ModelProfileRegistration";
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext";
export type ModelRoutingDecision = Readonly<{ operationId: string; registration: ModelProfileRegistration; context: ResolvedRoutingContext; policyId: string; policyVersion: string; reasonCode: string }>;
```

### `models/ModelRoutingOutcome.ts`

Returns a revalidated selection or a visible unavailable/control/uncertain outcome before session construction.

```typescript
import type { ModelRoutingDecision } from "./ModelRoutingDecision";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type ModelRoutingOutcome =
  | Readonly<{ kind: "selected"; decision: ModelRoutingDecision }>
  | Readonly<{ kind: "unavailable"; reasons: readonly string[] }>
  | Readonly<{ kind: "stopped"; reason: ExecutionStopReason }>
  | Readonly<{ kind: "uncertain"; operationId: string }>;
```

### `models/ModelRouter.ts`

Resolves one context, filters candidates, awaits an interchangeable selection policy, then rechecks current capacity before returning.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { IClock } from "../contracts/runtime/IClock";
import type { ModelCallControl } from "../agentic/model/ModelCallControl";
import type { RoutingLayer } from "./RoutingLayer";
import type { ModelSelectionInput } from "./ModelSelectionInput";
import type { ModelSelectionOutcome } from "./ModelSelectionOutcome";
import type { ModelRoutingOutcome } from "./ModelRoutingOutcome";
import type { ModelEligibilityInput } from "./ModelEligibilityInput";
import type { ModelEligibilityDecision } from "./ModelEligibilityDecision";
import { ModelEligibilityPolicy } from "./ModelEligibilityPolicy";
import { ModelProfileRegistry } from "./ModelProfileRegistry";
import { RoutingContextResolver } from "./RoutingContextResolver";
import { RoutingBudgetReader } from "./RoutingBudgetReader";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
export class ModelRouter {
  private readonly mandatoryEligibility = new ModelEligibilityPolicy();
  constructor(private readonly profiles: ModelProfileRegistry, private readonly contexts: RoutingContextResolver,
    private readonly budgets: RoutingBudgetReader, private readonly eligibility: IPolicy<ModelEligibilityInput, ModelEligibilityDecision>,
    private readonly selection: IPolicy<ModelSelectionInput, ModelSelectionOutcome>, private readonly clock: IClock) {}
  async route(role: string, layers: readonly RoutingLayer[], control: ModelCallControl): Promise<ModelRoutingOutcome> {
    const context = this.contexts.resolve(role, layers);
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(control.operationId)) return { kind: "unavailable", reasons: ["ROUTING_ID_INVALID"] };
    const guard = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    const before = guard.check(); if (before !== null) return { kind: "stopped", reason: before };
    const budget = await this.budgets.read(); const candidates = [];
    for (const id of context.preferredProfileIds) {
      const candidate = this.profiles.resolve(id);
      if ((await this.checkEligibility({ candidate, context, budget })).eligible) candidates.push(candidate);
    }
    const filteredStop = guard.check(); if (filteredStop !== null) return { kind: "stopped", reason: filteredStop };
    if (candidates.length === 0) return { kind: "unavailable", reasons: ["NO_ELIGIBLE_PROFILE"] };
    const choice = await this.selection.apply(Object.freeze({ context, candidates: Object.freeze(candidates), control }));
    if (choice.kind === "uncertain") return choice;
    const selectionStop = guard.check(); if (selectionStop !== null) return { kind: "stopped", reason: selectionStop };
    if (choice.kind !== "selected") return choice;
    if (!/^[a-zA-Z0-9_.:-]{1,128}$/.test(choice.policyId) || !/^[a-zA-Z0-9_.-]{1,32}$/.test(choice.policyVersion) || !/^[A-Z][A-Z0-9_]{0,127}$/.test(choice.reasonCode)) return { kind: "unavailable", reasons: ["SELECTION_METADATA_INVALID"] };
    const after = guard.check(); if (after !== null) return { kind: "stopped", reason: after };
    const candidate = candidates.find(item => item.profile.id === choice.profileId);
    if (candidate === undefined) return { kind: "unavailable", reasons: ["SELECTION_OUTSIDE_ELIGIBLE_SET"] };
    if (context.explicitProfileId !== null && choice.profileId !== context.explicitProfileId && !context.allowFallback) return { kind: "unavailable", reasons: ["EXPLICIT_BINDING_CANNOT_FALL_BACK"] };
    const checked = await this.checkEligibility({ candidate, context, budget: await this.budgets.read() });
    if (!checked.eligible) return { kind: "unavailable", reasons: checked.reasons };
    const finalStop = guard.check(); if (finalStop !== null) return { kind: "stopped", reason: finalStop };
    return Object.freeze({ kind: "selected", decision: Object.freeze({ operationId: control.operationId, registration: candidate, context,
      policyId: choice.policyId, policyVersion: choice.policyVersion, reasonCode: choice.reasonCode }) });
  }
  private async checkEligibility(input: ModelEligibilityInput): Promise<ModelEligibilityDecision> {
    const required = await this.mandatoryEligibility.apply(input);
    return required.eligible ? this.eligibility.apply(input) : required;
  }
}
```

### `models/handoffs/ModelHandoff.ts`

Describes a bounded portable assignment for a new session, preserving source revision, exact model identities, partial work, and inherited controls.

```typescript
import type { ModelProfile } from "../ModelProfile";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { PartialProgress } from "../../contracts/outcomes/PartialProgress";
export type ModelHandoff = Readonly<{
  schemaVersion: 1; handoffId: string; createdAtEpochMs: number; scope: ExecutionScopeRef;
  sourceSessionId: string; targetSessionId: string; sourceProfile: ModelProfile; targetProfile: ModelProfile;
  sourceRevision: string; assignment: string; partial: PartialProgress; pendingOperationRefs: readonly string[];
  budgetScopeId: string; deadlineEpochMs: number | null; permissionScopeRef: string;
}>;
```

### `models/handoffs/HandoffPreparation.ts`

Keeps unresolved operations blocked and marks prepared handoffs as needing current-source validation before execution.

```typescript
import type { ModelHandoff } from "./ModelHandoff";
export type HandoffPreparation =
  | Readonly<{ kind: "prepared"; handoff: ModelHandoff; requiresSourceRevalidation: true }>
  | Readonly<{ kind: "blocked"; reasonCode: "UNRESOLVED_OPERATIONS"; pendingOperationRefs: readonly string[] }>;
```

### `models/handoffs/ModelHandoffContract.ts`

Validates a bounded handoff snapshot using existing partial-outcome and profile validation instead of accepting serialized runtime objects.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { ModelHandoff } from "./ModelHandoff";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { PartialOutcomeFactory } from "../../execution-control/PartialOutcomeFactory";
import { ModelProfileRegistry } from "../ModelProfileRegistry";
import { ConfigurationError } from "../../errors/ConfigurationError";
import { BudgetAccountingError } from "../../errors/BudgetAccountingError";
export class ModelHandoffContract implements IResultContract<ModelHandoff> {
  readonly id = "model-handoff"; readonly version = "1";
  constructor(private readonly json: JsonValueContract) {}
  async validate(input: unknown): Promise<ValidationResult<ModelHandoff>> {
    const checked = await this.json.validate(input);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (!this.record(value) || Object.keys(value).sort().join(",") !== "assignment,budgetScopeId,createdAtEpochMs,deadlineEpochMs,handoffId,partial,pendingOperationRefs,permissionScopeRef,schemaVersion,scope,sourceProfile,sourceRevision,sourceSessionId,targetProfile,targetSessionId" ||
        value.schemaVersion !== 1 || !this.idValue(value.handoffId) || !this.idValue(value.sourceSessionId) || !this.idValue(value.targetSessionId) || value.sourceSessionId === value.targetSessionId ||
        !this.idValue(value.budgetScopeId) || !this.idValue(value.permissionScopeRef) || !this.idValue(value.sourceRevision) || !this.text(value.assignment, 8192) ||
        !this.time(value.createdAtEpochMs) || !(value.deadlineEpochMs === null || this.time(value.deadlineEpochMs)) ||
        !this.record(value.scope) || !this.idValue(value.scope.scopeId) || !this.idValue(value.scope.projectId) || Object.keys(value.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
        (value.scope.workspaceId !== undefined && !this.idValue(value.scope.workspaceId)) || !this.record(value.partial) ||
        Object.keys(value.partial).sort().join(",") !== "artifactRefs,evidenceRefs,summary,unresolved" ||
        !this.text(value.partial.summary, 4096) || !this.strings(value.partial.evidenceRefs, 256) || !this.strings(value.partial.artifactRefs, 256) || !this.strings(value.partial.unresolved, 1024) ||
        !this.strings(value.pendingOperationRefs, 256) || !this.record(value.sourceProfile) || !this.record(value.targetProfile) ||
        !this.profileKeys(value.sourceProfile) || !this.profileKeys(value.targetProfile) || new TextEncoder().encode(JSON.stringify(value)).byteLength > 65536) return this.invalid();
    const handoff = value as unknown as ModelHandoff;
    try {
      // Separate registries allow the same canonical profile for a fresh same-model session.
      new ModelProfileRegistry().register({ profile: handoff.sourceProfile, capabilities: ["text"] });
      new ModelProfileRegistry().register({ profile: handoff.targetProfile, capabilities: ["text"] });
      new PartialOutcomeFactory().stopped({ code: "limit-reached", message: "Handoff validation." }, { partial: handoff.partial, pendingOperationRefs: handoff.pendingOperationRefs });
    } catch (error) { if (error instanceof ConfigurationError || error instanceof BudgetAccountingError) return this.invalid(); throw error; }
    return { valid: true, value: handoff };
  }
  private profileKeys(value: Record<string, unknown>): boolean { return Object.keys(value).sort().join(",") === "contextTokens,id,maxOutputTokens,maxRequestBytes,maxResponseBytes,modelId,providerId,supportsPromptCacheKey"; }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private text(value: unknown, max: number): value is string { return typeof value === "string" && new TextEncoder().encode(value).byteLength <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value); }
  private idValue(value: unknown): value is string { return typeof value === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(value); }
  private time(value: unknown): value is number { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000; }
  private strings(value: unknown, max: number): value is readonly string[] { return Array.isArray(value) && value.length <= 128 && value.every(item => this.text(item, max)); }
  private invalid(): ValidationResult<ModelHandoff> { return { valid: false, issues: [{ path: [], code: "invalid-handoff", message: "Model handoff snapshot is invalid or exceeds limits." }] }; }
}
```

### `models/handoffs/ModelHandoffFactory.ts`

Constructs and validates a portable record; it neither creates a live session nor changes the current runner’s gateway.

```typescript
import type { IClock } from "../../contracts/runtime/IClock";
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";
import type { ModelHandoff } from "./ModelHandoff";
import type { HandoffPreparation } from "./HandoffPreparation";
import { ModelHandoffContract } from "./ModelHandoffContract";
import { ConfigurationError } from "../../errors/ConfigurationError";
export class ModelHandoffFactory {
  constructor(private readonly clock: IClock, private readonly ids: IIdGenerator, private readonly contract: ModelHandoffContract) {}
  async prepare(input: Omit<ModelHandoff, "schemaVersion" | "handoffId" | "createdAtEpochMs">): Promise<HandoffPreparation> {
    const checked = await this.contract.validate({ ...input, schemaVersion: 1, handoffId: this.ids.nextId(), createdAtEpochMs: this.clock.nowEpochMs() });
    if (!checked.valid) throw new ConfigurationError("Cannot prepare invalid model handoff.");
    if (checked.value.pendingOperationRefs.length > 0) return { kind: "blocked", reasonCode: "UNRESOLVED_OPERATIONS", pendingOperationRefs: checked.value.pendingOperationRefs };
    return Object.freeze({ kind: "prepared", handoff: checked.value, requiresSourceRevalidation: true });
  }
}
```

### `models/EscalationInput.ts`

Carries trusted persisted counters and safe verification references; model confidence alone is not escalation evidence.

```typescript
export type EscalationInput = Readonly<{ consecutiveFailures: number; escalationsUsed: number; failedCheckRefs: readonly string[]; pendingOperationRefs: readonly string[] }>;
```

### `models/EscalationDecision.ts`

Requests a bounded recovery handoff or explicitly stops without directly dispatching work.

```typescript
export type EscalationDecision = Readonly<{ action: "stay" | "request-handoff" | "stop"; reasonCode: string }>;
```

### `models/VerificationEscalationPolicy.ts`

Uses a configured failure threshold and durable escalation cap; selection and actual session creation stay separate.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { EscalationInput } from "./EscalationInput";
import type { EscalationDecision } from "./EscalationDecision";
import { ConfigurationError } from "../errors/ConfigurationError";
export class VerificationEscalationPolicy implements IPolicy<EscalationInput, EscalationDecision> {
  constructor(private readonly failureThreshold: number, private readonly maxEscalations: number) {
    if (!Number.isSafeInteger(failureThreshold) || failureThreshold < 1 || !Number.isSafeInteger(maxEscalations) || maxEscalations < 0) throw new ConfigurationError("Invalid escalation limits.");
  }
  async apply(input: EscalationInput): Promise<EscalationDecision> {
    if (![input.consecutiveFailures, input.escalationsUsed].every(value => Number.isSafeInteger(value) && value >= 0) ||
        !this.references(input.failedCheckRefs) || !this.references(input.pendingOperationRefs)) throw new ConfigurationError("Invalid escalation evidence.");
    if (input.pendingOperationRefs.length > 0) return { action: "stop", reasonCode: "UNRESOLVED_OPERATIONS" };
    if (input.consecutiveFailures < this.failureThreshold) return { action: "stay", reasonCode: "BELOW_FAILURE_THRESHOLD" };
    if (input.escalationsUsed >= this.maxEscalations) return { action: "stop", reasonCode: "ESCALATION_LIMIT_REACHED" };
    if (input.failedCheckRefs.length === 0) return { action: "stop", reasonCode: "VERIFICATION_EVIDENCE_MISSING" };
    return { action: "request-handoff", reasonCode: "REPEATED_VERIFIED_FAILURE" };
  }
  private references(value: readonly string[]): boolean { return Array.isArray(value) && value.length <= 128 && value.every(ref => typeof ref === "string" && /^[a-zA-Z0-9_.:/-]{1,128}$/.test(ref)); }
}
```

### `examples/routing/LoginRoutingExample.ts`

Shows agent-level permission constraints and role preferences resolving a text planning session; it does not pretend to execute code edits.

```typescript
import type { ModelCallControl } from "../../agentic/model/ModelCallControl";
import { ModelRouter } from "../../models/ModelRouter";
import { ModelGatewayRegistry } from "../../models/ModelGatewayRegistry";
export class LoginRoutingExample {
  constructor(private readonly router: ModelRouter, private readonly gateways: ModelGatewayRegistry) {}
  async preparePlanning(control: ModelCallControl) {
    const routed = await this.router.route("planning", [
      { allowedProfileIds: ["planner", "economical-text"], preferredProfileIds: ["economical-text"], requiredCapabilities: ["text"], allowFallback: true },
      { preferredProfileIds: ["planner"], inputTokens: 500, outputTokens: 100 },
    ], control);
    if (routed.kind !== "selected") return routed;
    return Object.freeze({ kind: "prepared" as const, decision: routed.decision, gateway: this.gateways.create(routed.decision.registration.profile) });
  }
}
```

### `tests/models/checkModelRouting.ts`

Checks hierarchy, capability rejection, advisory budget rechecks, invalid recommendation rejection, and isolated profile choices offline.

```typescript
import { ModelProfileRegistry } from "../../models/ModelProfileRegistry";
import { RoutingContextResolver } from "../../models/RoutingContextResolver";
import { RoutingBudgetReader } from "../../models/RoutingBudgetReader";
import { ModelEligibilityPolicy } from "../../models/ModelEligibilityPolicy";
import { RoleBasedModelRoutingPolicy } from "../../models/RoleBasedModelRoutingPolicy";
import { ModelRouter } from "../../models/ModelRouter";
import { UsageLedger } from "../../usage/UsageLedger";
import { zeroUsage } from "../../usage/zeroUsage";
export async function checkModelRouting(): Promise<void> {
  const registry = new ModelProfileRegistry();
  for (const id of ["planner", "economical-text"]) registry.register({ profile: { id, providerId: "fixture", modelId: `model-${id}`, contextTokens: 2000, maxOutputTokens: 500, maxRequestBytes: 8192, maxResponseBytes: 8192, supportsPromptCacheKey: false }, capabilities: ["text"] });
  const resolver = new RoutingContextResolver(registry);
  const ledger = new UsageLedger({ schemaVersion: 1, scopes: [{ id: "run", parentId: null, limits: { ...zeroUsage, modelCalls: 2, inputTokens: 1000, outputTokens: 200 } }], reservations: [] });
  const budgets = new RoutingBudgetReader({ async initialize() {}, async read() { return ledger.snapshot(); }, async mutate(change) { return change(ledger); } }, "run");
  const clock = { nowEpochMs: () => 100 };
  const control = { operationId: "route-one", signal: new AbortController().signal, deadlineEpochMs: 1000, timeoutMs: 100 };
  const layers = [{ allowedProfileIds: ["planner", "economical-text"], preferredProfileIds: ["economical-text"], inputTokens: 100, outputTokens: 50 }, { preferredProfileIds: ["planner"] }];
  const router = new ModelRouter(registry, resolver, budgets, new ModelEligibilityPolicy(), new RoleBasedModelRoutingPolicy(), clock);
  const selected = await router.route("planning", layers, control);
  if (selected.kind !== "selected" || selected.decision.registration.profile.id !== "planner") throw new Error("Specific preference not resolved.");
  if ((await router.route("coding", [...layers, { requiredCapabilities: ["tools"] }], control)).kind !== "unavailable") throw new Error("Text adapter selected for tools.");
  if ((await router.route("planning", [...layers, { allowedProfileIds: ["economical-text"], explicitProfileId: "planner", allowFallback: false }], control)).kind !== "unavailable") throw new Error("Binding expanded permission.");
  const invalid = new ModelRouter(registry, resolver, budgets, new ModelEligibilityPolicy(), { async apply() { return { kind: "selected", profileId: "invented", policyId: "test", policyVersion: "1", reasonCode: "TEST" }; } }, clock);
  if ((await invalid.route("planning", layers, control)).kind !== "unavailable") throw new Error("Invented profile accepted.");
  const racing = new ModelRouter(registry, resolver, budgets, new ModelEligibilityPolicy(), { async apply() {
    ledger.reserve("competing-call", "run", { ...zeroUsage, modelCalls: 2, inputTokens: 1000, outputTokens: 200 });
    return { kind: "selected", profileId: "planner", policyId: "test", policyVersion: "1", reasonCode: "TEST" };
  } }, clock);
  if ((await racing.route("planning", layers, control)).kind !== "unavailable") throw new Error("Stale allowance accepted after selection.");
}
```

### `tests/models/checkModelHandoffs.ts`

Checks bounded portable handoffs, new-session identity, preserved partial work, unresolved-operation blocking, and escalation limits.

```typescript
import { ModelHandoffFactory } from "../../models/handoffs/ModelHandoffFactory";
import { ModelHandoffContract } from "../../models/handoffs/ModelHandoffContract";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { VerificationEscalationPolicy } from "../../models/VerificationEscalationPolicy";
export async function checkModelHandoffs(): Promise<void> {
  const profile = { id: "fixture", providerId: "fixture", modelId: "fixture-model", contextTokens: 2000, maxOutputTokens: 500, maxRequestBytes: 8192, maxResponseBytes: 8192, supportsPromptCacheKey: false };
  const factory = new ModelHandoffFactory({ nowEpochMs: () => 100 }, { nextId: () => "handoff-one" }, new ModelHandoffContract(new JsonValueContract()));
  const input = { scope: { scopeId: "scope", projectId: "project", workspaceId: "workspace" }, sourceSessionId: "session-one", targetSessionId: "session-two", sourceProfile: profile, targetProfile: profile,
    sourceRevision: "revision-one", assignment: "Diagnose the callback mismatch using saved evidence.", partial: { summary: "Callback mismatch reproduced.", evidenceRefs: ["check:callback"], artifactRefs: ["artifact:diff"], unresolved: ["Correct callback configuration."] },
    pendingOperationRefs: [] as string[], budgetScopeId: "run", deadlineEpochMs: 1000, permissionScopeRef: "permission:read-only" };
  const prepared = await factory.prepare(input);
  if (prepared.kind !== "prepared" || prepared.handoff.partial.unresolved.length !== 1 || !Object.isFrozen(prepared.handoff)) throw new Error("Handoff state lost.");
  const blocked = await factory.prepare({ ...input, pendingOperationRefs: ["operation:unknown"] });
  if (blocked.kind !== "blocked") throw new Error("Uncertain effects ignored.");
  let rejected = false; try { await factory.prepare({ ...input, targetSessionId: "session-one" }); } catch { rejected = true; }
  if (!rejected) throw new Error("Live-session mutation allowed.");
  const policy = new VerificationEscalationPolicy(2, 1);
  if ((await policy.apply({ consecutiveFailures: 2, escalationsUsed: 0, failedCheckRefs: ["check:callback"], pendingOperationRefs: [] })).action !== "request-handoff") throw new Error("Escalation threshold ignored.");
  if ((await policy.apply({ consecutiveFailures: 2, escalationsUsed: 1, failedCheckRefs: ["check:callback"], pendingOperationRefs: [] })).action !== "stop") throw new Error("Escalation cap ignored.");
}
```

### `tests/models/checkDecisionAssistedRouting.ts`

Checks single-candidate bypass, one bounded recommendation, configured fallback, and preservation of stopped/uncertain decisions.

```typescript
import { ModelProfileRegistry } from "../../models/ModelProfileRegistry";
import { RoutingContextResolver } from "../../models/RoutingContextResolver";
import { DecisionAssistedModelRoutingPolicy } from "../../models/DecisionAssistedModelRoutingPolicy";
import { RoleBasedModelRoutingPolicy } from "../../models/RoleBasedModelRoutingPolicy";
import type { DecisionOutcome } from "../../decisions/DecisionOutcome";
export async function checkDecisionAssistedRouting(): Promise<void> {
  const registry = new ModelProfileRegistry();
  for (const id of ["first", "second"]) registry.register({ profile: { id, providerId: "fixture", modelId: id, contextTokens: 1000, maxOutputTokens: 100, maxRequestBytes: 4096, maxResponseBytes: 4096, supportsPromptCacheKey: false }, capabilities: ["text"] });
  const context = new RoutingContextResolver(registry).resolve("planning", [{ allowedProfileIds: ["first", "second"], preferredProfileIds: ["first"], allowFallback: true }]);
  const control = { operationId: "routing-decision", signal: new AbortController().signal, deadlineEpochMs: null, timeoutMs: 100 };
  const input = { context, candidates: [registry.resolve("first"), registry.resolve("second")], control };
  let calls = 0;
  let outcome: DecisionOutcome = { status: "answered", answer: { kind: "answered", choice: "second", supportingRefs: [] } };
  const policy = new DecisionAssistedModelRoutingPolicy({ async evaluate() { calls++; return outcome; } }, new RoleBasedModelRoutingPolicy());
  const selected = await policy.apply(input);
  if (selected.kind !== "selected" || selected.profileId !== "second" || calls !== 1) throw new Error("Recommendation not used once.");
  await policy.apply({ ...input, candidates: [registry.resolve("first")] });
  if (calls !== 1) throw new Error("Single candidate used a paid decision.");
  outcome = { status: "abstained" };
  const fallback = await policy.apply(input);
  if (fallback.kind !== "selected" || fallback.profileId !== "first" || fallback.reasonCode !== "RECOMMENDATION_FALLBACK") throw new Error("Configured fallback lost.");
  if ((await policy.apply({ ...input, context: { ...context, allowFallback: false } })).kind !== "unavailable") throw new Error("Unapproved fallback used.");
  outcome = { status: "stopped", reason: { code: "cancelled", message: "Cancelled." } };
  if ((await policy.apply(input)).kind !== "stopped") throw new Error("Cancellation became fallback.");
  outcome = { status: "uncertain", operationId: "routing-decision" };
  if ((await policy.apply(input)).kind !== "uncertain") throw new Error("Pending operation hidden.");
}
```

### `index.ts`

Appends production routing and handoff declarations to the existing entry point; examples and tests stay private.

```typescript
export type { ModelCapability } from "./models/ModelCapability";
export type { ModelProfileRegistration } from "./models/ModelProfileRegistration";
export { ModelProfileRegistry } from "./models/ModelProfileRegistry";
export type { ModelRequirements } from "./models/ModelRequirements";
export type { RoutingLayer } from "./models/RoutingLayer";
export type { ResolvedRoutingContext } from "./models/ResolvedRoutingContext";
export { RoutingContextResolver } from "./models/RoutingContextResolver";
export type { RoutingBudgetView } from "./models/RoutingBudgetView";
export { RoutingBudgetReader } from "./models/RoutingBudgetReader";
export type { ModelEligibilityInput } from "./models/ModelEligibilityInput";
export type { ModelEligibilityDecision } from "./models/ModelEligibilityDecision";
export { ModelEligibilityPolicy } from "./models/ModelEligibilityPolicy";
export type { ModelSelectionInput } from "./models/ModelSelectionInput";
export type { ModelSelectionOutcome } from "./models/ModelSelectionOutcome";
export { RoleBasedModelRoutingPolicy } from "./models/RoleBasedModelRoutingPolicy";
export { DecisionAssistedModelRoutingPolicy } from "./models/DecisionAssistedModelRoutingPolicy";
export type { ModelRoutingDecision } from "./models/ModelRoutingDecision";
export type { ModelRoutingOutcome } from "./models/ModelRoutingOutcome";
export { ModelRouter } from "./models/ModelRouter";
export type { ModelHandoff } from "./models/handoffs/ModelHandoff";
export type { HandoffPreparation } from "./models/handoffs/HandoffPreparation";
export { ModelHandoffContract } from "./models/handoffs/ModelHandoffContract";
export { ModelHandoffFactory } from "./models/handoffs/ModelHandoffFactory";
export type { EscalationInput } from "./models/EscalationInput";
export type { EscalationDecision } from "./models/EscalationDecision";
export { VerificationEscalationPolicy } from "./models/VerificationEscalationPolicy";
```
