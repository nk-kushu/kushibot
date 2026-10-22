# 15. Rules, Skills, and Guards

## What We Implement Here

Create versioned guard definitions that connect skill instructions to explicit rules and registered evidence-producing checks. Add bounded DecisionUnit-assisted optional selection, stable guidance composition, target-bound check reports, and deterministic enforcement that preserves mandatory coverage. A saved lint-receipt example shows the difference between guidance, a real check result, and acceptance.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `guards/GuardRule.ts` | `type GuardRule` |
| `guards/GuardDefinition.ts` | `type GuardDefinition` |
| `guards/GuardTarget.ts` | `type GuardTarget` |
| `guards/GuardCheckInput.ts` | `type GuardCheckInput` |
| `guards/GuardFinding.ts` | `type GuardFinding` |
| `guards/GuardCheckResult.ts` | `type GuardCheckResult` |
| `guards/IGuardCheck.ts` | `interface IGuardCheck` |
| `guards/IGuardTargetVerifier.ts` | `interface IGuardTargetVerifier` |
| `errors/GuardConfigurationError.ts` | `class GuardConfigurationError extends Error` |
| `guards/GuardRegistry.ts` | `class GuardRegistry` |
| `guards/GuardSelection.ts` | `type GuardSelection` |
| `guards/GuardSelectionInput.ts` | `type GuardSelectionInput` |
| `guards/ConservativeGuardSelectionPolicy.ts` | `class ConservativeGuardSelectionPolicy implements IPolicy<GuardSelectionInput, GuardSelection>` |
| `guards/GuardSelectionOutcome.ts` | `type GuardSelectionOutcome` |
| `guards/GuardSelectionService.ts` | `class GuardSelectionService` |
| `guards/GuardCheckResultContract.ts` | `class GuardCheckResultContract implements IResultContract<GuardCheckResult>` |
| `guards/IGuardEvidenceVerifier.ts` | `interface IGuardEvidenceVerifier` |
| `guards/GuardCheckRecord.ts` | `type GuardCheckRecord` |
| `guards/GuardReport.ts` | `type GuardReport` |
| `guards/GuardRunOutcome.ts` | `type GuardRunOutcome` |
| `guards/BoundedGuardCheckRunner.ts` | `class BoundedGuardCheckRunner` |
| `guards/GuardRunner.ts` | `class GuardRunner` |
| `guards/GuardEnforcementInput.ts` | `type GuardEnforcementInput` |
| `guards/GuardEnforcementDecision.ts` | `type GuardEnforcementDecision` |
| `guards/GuardEnforcementPolicy.ts` | `class GuardEnforcementPolicy implements IPolicy<GuardEnforcementInput, GuardEnforcementDecision>` |
| `guards/SkillGuidance.ts` | `type SkillGuidance` |
| `guards/GuardGuidanceComposer.ts` | `class GuardGuidanceComposer` |
| `guards/checks/VerificationReceipt.ts` | `type VerificationReceipt` |
| `guards/checks/IVerificationReceiptReader.ts` | `interface IVerificationReceiptReader` |
| `guards/checks/RecordedLintCheck.ts` | `class RecordedLintCheck implements IGuardCheck` |
| `examples/guards/createLintGuard.ts` | `function createLintGuard` |
| `tests/guards/checkGuardEnforcement.ts` | `function checkGuardEnforcement` |
| `tests/guards/checkGuardSelection.ts` | `function checkGuardSelection` |
| `index.ts` | `additive public exports` |

## Rules Specific to These Files

- Follow [page 01](01-scope-and-implementation-roadmap.md) and [page 02](02-package-structure-and-oop-conventions.md) for general OOP, naming, separate-file, and writing conventions. Each class/interface has its own file; interfaces begin with `I`. Concrete selection/enforcement implementations use the existing `IPolicy<TInput, TOutput>`. Reuse DecisionUnit, JSON/result contracts, execution context, budgets, workspace controls, and safe tracing rather than adding parallel subsystems.
- A skill instruction tells a worker how to work. A rule states a requirement. A check produces actual evidence. A guard packages all three with pinned identity/version and coverage. Instruction text, a model’s confidence, or selecting a guard never proves compliance. Do not create a class per rule just to hold text; rules are immutable data and interchangeable check behaviors implement `IGuardCheck`.
- `GuardRegistry` contains enabled trusted definitions and registered executable checks, not dynamically executable model output. Register checks before guards. Guard IDs/rule IDs/version/check coverage are validated and copied; rule IDs belong to their guard namespace. Every rule names at least one existing check. A missing/disabled required guard or missing check is a visible configuration conflict, not a silent skip. Keep versions immutable; changed guidance, requirements, checker behavior, or coverage requires a new version/snapshot.
- The bounded registry allows 16 guards, 32 check implementations, up to 16 rules per guard, and at most eight distinct checks per guard. The runner attempts at most 32 checks per batch; remaining declared coverage is recorded unavailable and blocks relevant blocking rules. These are explicit reference limits, not universal defaults. Callers should split genuinely larger work into bounded versioned batches while retaining all required coverage; never silently truncate a candidate/rule set and claim success.
- Required guards are trusted configuration. Optional applicability is evaluated per candidate through the existing single-choice DecisionUnit with offered answers include/exclude. Do not force several guard IDs into one single-choice answer. The selection service permits at most eight optional candidates and therefore at most eight model-backed relevance calls; each gets a distinct operation ID, inherited deadline/control, and the same applicable ancestor accounting through its provider. Required guards need no relevance call to remain required.
- Supply sanitized bounded task evidence and registered guard descriptions, not unrestricted source, secrets, private reasoning, arbitrary commands, or permission grants. The DecisionUnit is preconfigured/bootstrapped, independent of any router that it helps select. An answered exclude can remove only that optional recommendation, never a configured required guard. Re-run selection under a new recorded snapshot when actual diff evidence changes; earlier decisions/checks remain tied to their versions.
- `ConservativeGuardSelectionPolicy` either includes an optional guard on failed/abstained recommendation or retains unresolved applicability, according to explicit host configuration. Failure is not an implicit empty guard set. `GuardSelectionService` independently preserves required guards and unresolved/pending operations, canonicalizes proposed definitions back to the trusted registry, and rejects unknown IDs/versions. Stop further relevance calls on cancellation/deadline or an uncertain decision. Preserve unevaluated candidate IDs and the partial guidance snapshot; do not hide stopped work behind a successful fallback.
- Selection policies and provider implementations are trusted typed collaborators. External/restored selections require runtime validation against registered IDs/versions, limits, and authorized provenance before composition. They must not be accepted as authoritative serialized instructions supplied by a model. Required guard IDs are independently configured again at enforcement, so removing them from a report cannot make acceptance succeed.
- `GuardGuidanceComposer` emits deterministically ordered version-pinned instructions/rule IDs for page-16 context composition. Guidance goes to planning/coding before relevant work; actual checks run after the referenced artifact/source snapshot exists. A configured incompatible pair fails before prompt building. This explicit pair list cannot automatically discover every natural-language contradiction; the host must resolve conflicting mandatory requirements rather than rely on instruction position. It is not a second workflow engine or an implementation of a learned SkillOrchestrator.
- `GuardTarget` names an immutable authorized snapshot, not an arbitrary live workspace read. `IGuardTargetVerifier` validates existence, scope, exact revision, and artifact provenance. Concrete checks inspect that pinned snapshot or an independently validated actual-process receipt for it. Revalidate provenance after each result. If target identity changes, do not reuse a prior pass for the new revision. A revision string or a matching artifact name alone proves no content integrity.
- `GuardRunner` creates a child operation identity for each check and invokes registered implementations sequentially through `BoundedGuardCheckRunner`. Each checker must be read-only with respect to working source; authorized report-artifact writes are a separate bounded capability. Any model/tool/process work inside a checker must use its existing metered/cancelled/journaled adapter. The guard label does not make those calls free. Check implementations must propagate uncertain child work through operation lineage rather than pretending a failed model/tool call means a completed check.
- The bounded runner forwards cancellation and caps wait by the configured timeout/deadline. It keeps one slot occupied until the actual underlying invocation settles, even after abort/timeout; no unbounded retry or queue is added. An exception/timeout is uncertain and its operation reference is preserved. Busy/unstarted or malformed checks are unavailable coverage, never pass. The batch stops starting further checks when uncertain operations exist. Synchronous blocking code needs a separately controlled process; JavaScript timers cannot terminate it.
- Check output is bounded canonical JSON, at most 32 KiB, with exactly one finding per assigned rule and the exact revision. Verdicts are pass/fail/unknown. Pass/fail require evidence references. Reject missing/duplicate/invented rules, stale targets, invalid verdicts/codes, and unsupported payload fields. `IGuardEvidenceVerifier` confirms cited records are saved, scoped, authorized, and provenance-compatible with the target/check; the schema contract alone cannot prove evidence exists or supports a conclusion. Raw check output must never be executed or treated as prompt authority.
- `RecordedLintCheck` consumes an actual immutable lint-process receipt through an injected trusted reader. It does not run ESLint itself, manufacture a lint result, or classify model prose as an exit code. A missing/mismatched receipt is unknown. Exit zero supports the configured lint rule; nonzero supports a failed invocation. The process owner must pin command/config/version, capture the actual source revision, bound execution/output, and save a verified report. The example reader in tests is a fixture and establishes no real repository lint compliance.
- `GuardEnforcementPolicy` evaluates a trusted coordinator report and its control stop, canonical registered rules/versions, required guard IDs, expected target identity, and one non-ambiguous record for every configured check. Missing/unknown/stale blocking coverage, unresolved applicability/operations, or cancellation/deadline stops acceptance. Evidence-backed blocking failures request a bounded fix. Nonblocking findings remain warnings. Every configured check for a blocking rule must support a pass; one passing checker does not erase another checker’s failure or absence.
- A policy result is advisory to the actual workflow/acceptance owner. An accept decision here means the configured guard gate is satisfied for that exact target, not that the whole task is correct, tests outside these guards passed, publication was approved, or a deployment occurred. A request-fix decision does not dispatch edits or reserve capacity. The owning runner still enforces remaining budget, fix/escalation limits, workspace sequential editing, immutable target revisions, and user/host permissions.
- Required guard/report persistence uses the owning session/workflow/result stores and immutable artifact references, not optional debug logging. Save selected definition/check versions, target identity, operation lineage, evidence, verdicts, coverage gaps, and enforcement decision. Returning an object does not prove it was durably saved. Restored reports require strict schema/provenance validation before use; this policy’s typed in-memory API is not an authentication or deserialization boundary.
- Checks and selection share the root budget; regrouping guards, changing models, requesting corrections, or rechecking a new revision never resets it. On hard limits, retain collected reports/evidence and unresolved/pending references in explicit partial outcomes. Do not issue an extra model call to explain an exhausted allowance. Optional tracing uses safe configured IDs/codes/counts and registered event schemas, not raw guidance, task/source contents, diagnostics, credentials, or private reasoning.
- The lint fixture demonstrates the flow: registered guidance is selected and delivered before editing; the process owner later supplies a revision-bound receipt; GuardRunner validates it; enforcement accepts a real pass, requests a fix for a supported failure, and stops for missing/stale evidence. OOP/security/model-assisted checks need actual registered capability adapters and evidence contracts before their rules can claim coverage. No project-specific OOP checker or real ESLint process is silently implemented by these definitions.
- Verification covers required-guard retention, optional include/exclude, provider abstention/failure fallback, decision uncertainty, bounded candidate calls, guidance ordering/conflicts, current target matching, evidence authorization, unknown/missing coverage, real receipt mapping, blocking failures versus warnings, check timeout/quarantine, cancellation/deadline, and mandatory guards missing from a report. Offline fixtures demonstrate contracts; separately test actual process/model/artifact adapters before claiming real verification quality. No paid model calls or actual repository checks are required to compile/run these examples.

## TypeScript Code for Each File

### `guards/GuardRule.ts`

Defines a versioned requirement and the registered checks needed to support its verdict.

```typescript
export type GuardRule = Readonly<{ id: string; requirement: string; blocking: boolean; checkIds: readonly string[] }>;
```

### `guards/GuardDefinition.ts`

Packages bounded skill guidance with explicit rule/check coverage; guidance alone never establishes compliance.

```typescript
import type { GuardRule } from "./GuardRule";
export type GuardDefinition = Readonly<{ id: string; version: string; description: string; instructions: string; rules: readonly GuardRule[] }>;
```

### `guards/GuardTarget.ts`

Identifies the immutable authorized source/diff snapshot that a check must actually inspect.

```typescript
export type GuardTarget = Readonly<{ workspaceId: string; revisionRef: string; artifactRefs: readonly string[] }>;
```

### `guards/GuardCheckInput.ts`

Pins the guard/check versions, target identity, and exact rule IDs assigned to one check invocation.

```typescript
import type { GuardTarget } from "./GuardTarget";
export type GuardCheckInput = Readonly<{ guardId: string; guardVersion: string; checkId: string; checkVersion: string; ruleIds: readonly string[]; target: GuardTarget }>;
```

### `guards/GuardFinding.ts`

Keeps pass/fail/unknown separate and links each assertion to saved scoped evidence.

```typescript
export type GuardFinding = Readonly<{ ruleId: string; verdict: "pass" | "fail" | "unknown"; evidenceRefs: readonly string[]; code: string }>;
```

### `guards/GuardCheckResult.ts`

Returns one finding per assigned rule, bound to the check invocation’s exact target revision.

```typescript
import type { GuardFinding } from "./GuardFinding";
export type GuardCheckResult = Readonly<{ revisionRef: string; findings: readonly GuardFinding[] }>;
```

### `guards/IGuardCheck.ts`

Defines a polymorphic read-only check capability; metered/process work inside an implementation still uses its owning bounded adapters.

```typescript
import type { GuardCheckInput } from "./GuardCheckInput";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IGuardCheck {
  readonly id: string; readonly version: string;
  evaluate(input: GuardCheckInput, context: IExecutionContext): Promise<unknown>;
}
```

### `guards/IGuardTargetVerifier.ts`

Requires trusted snapshot/provenance validation rather than treating an arbitrary revision string as evidence.

```typescript
import type { GuardTarget } from "./GuardTarget";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IGuardTargetVerifier { verify(target: GuardTarget, context: IExecutionContext): Promise<boolean>; }
```

### `errors/GuardConfigurationError.ts`

Reports invalid definitions, missing capabilities, inconsistent selections, or unsafe report shape without including source content.

```typescript
export class GuardConfigurationError extends Error {
  readonly code = "GUARD_CONFIGURATION_INVALID";
  constructor() { super("Guard definition, selection, target, or report configuration is invalid."); this.name = "GuardConfigurationError"; }
}
```

### `guards/GuardRegistry.ts`

Copies enabled trusted guard definitions and registers executable checks by stable identity without a provider or rule switch.

```typescript
import type { GuardDefinition } from "./GuardDefinition";
import type { IGuardCheck } from "./IGuardCheck";
import { GuardConfigurationError } from "../errors/GuardConfigurationError";
export class GuardRegistry {
  private readonly guards = new Map<string, GuardDefinition>();
  private readonly checks = new Map<string, IGuardCheck>();
  registerCheck(check: IGuardCheck): void {
    this.id(check.id); this.id(check.version);
    if (this.checks.has(check.id) || this.checks.size >= 32) throw new GuardConfigurationError();
    this.checks.set(check.id, check);
  }
  registerGuard(guard: GuardDefinition): void {
    this.id(guard.id); this.id(guard.version); this.text(guard.description, 512); this.text(guard.instructions, 8192);
    if (this.guards.has(guard.id) || this.guards.size >= 16 || !Array.isArray(guard.rules) || guard.rules.length < 1 || guard.rules.length > 16 || new Set(guard.rules.map(rule => rule.id)).size !== guard.rules.length) throw new GuardConfigurationError();
    const rules = guard.rules.map(rule => {
      this.id(rule.id); this.text(rule.requirement, 1024);
      if (!rule.id.startsWith(guard.id + ".") || typeof rule.blocking !== "boolean" || !Array.isArray(rule.checkIds) || rule.checkIds.length < 1 || rule.checkIds.length > 8 || new Set(rule.checkIds).size !== rule.checkIds.length) throw new GuardConfigurationError();
      for (const id of rule.checkIds) this.check(id);
      return Object.freeze({ id: rule.id, requirement: rule.requirement, blocking: rule.blocking, checkIds: Object.freeze([...rule.checkIds]) });
    });
    if (new Set(rules.flatMap(rule => [...rule.checkIds])).size > 8) throw new GuardConfigurationError();
    this.guards.set(guard.id, Object.freeze({ id: guard.id, version: guard.version, description: guard.description, instructions: guard.instructions, rules: Object.freeze(rules) }));
  }
  guard(id: string): GuardDefinition { const value = this.guards.get(id); if (value === undefined) throw new GuardConfigurationError(); return value; }
  check(id: string): IGuardCheck { const value = this.checks.get(id); if (value === undefined) throw new GuardConfigurationError(); return value; }
  private id(value: unknown): void { if (typeof value !== "string" || !/^[a-zA-Z0-9_.-]{1,64}$/.test(value)) throw new GuardConfigurationError(); }
  private text(value: unknown, max: number): void { if (typeof value !== "string" || value.trim().length === 0 || new TextEncoder().encode(value).byteLength > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new GuardConfigurationError(); }
}
```

### `guards/GuardSelection.ts`

Pins the effective guard/instruction snapshot, unresolved applicability, and uncertain decision operations.

```typescript
import type { GuardDefinition } from "./GuardDefinition";
export type GuardSelection = Readonly<{ schemaVersion: 1; guards: readonly GuardDefinition[]; unresolvedGuardIds: readonly string[]; pendingOperationRefs: readonly string[] }>;
```

### `guards/GuardSelectionInput.ts`

Combines trusted required definitions with independent per-candidate DecisionUnit outcomes.

```typescript
import type { GuardDefinition } from "./GuardDefinition";
import type { DecisionOutcome } from "../decisions/DecisionOutcome";
export type GuardSelectionInput = Readonly<{ required: readonly GuardDefinition[]; optional: readonly Readonly<{ guard: GuardDefinition; outcome: DecisionOutcome }>[]; unevaluated: readonly string[] }>;
```

### `guards/ConservativeGuardSelectionPolicy.ts`

Preserves required guards and uses explicit include-on-failure fallback or unresolved applicability for optional recommendations.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { GuardSelectionInput } from "./GuardSelectionInput";
import type { GuardSelection } from "./GuardSelection";
export class ConservativeGuardSelectionPolicy implements IPolicy<GuardSelectionInput, GuardSelection> {
  constructor(private readonly includeOptionalOnFailure: boolean) {}
  async apply(input: GuardSelectionInput): Promise<GuardSelection> {
    const selected = new Map(input.required.map(guard => [guard.id, guard]));
    const unresolved = new Set(input.unevaluated); const pending: string[] = [];
    for (const item of input.optional) {
      if (item.outcome.status === "answered") {
        if (item.outcome.answer.choice === "include") selected.set(item.guard.id, item.guard);
        else if (item.outcome.answer.choice !== "exclude") unresolved.add(item.guard.id);
      } else {
        if (this.includeOptionalOnFailure) selected.set(item.guard.id, item.guard); else unresolved.add(item.guard.id);
        if (item.outcome.status === "uncertain") pending.push(item.outcome.operationId);
      }
    }
    return Object.freeze({ schemaVersion: 1 as const, guards: Object.freeze([...selected.values()]), unresolvedGuardIds: Object.freeze([...unresolved]), pendingOperationRefs: Object.freeze(pending) });
  }
}
```

### `guards/GuardSelectionOutcome.ts`

Preserves an interrupted selection together with its selected guidance and unresolved candidates.

```typescript
import type { GuardSelection } from "./GuardSelection";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type GuardSelectionOutcome = Readonly<{ selection: GuardSelection; stopReason: ExecutionStopReason | null }>;
```

### `guards/GuardSelectionService.ts`

Makes at most eight per-candidate relevance decisions, stops on control/uncertainty, and independently preserves required guards.

```typescript
import type { IDecisionUnit } from "../decisions/IDecisionUnit";
import type { IPolicy } from "../contracts/IPolicy";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import type { IClock } from "../contracts/runtime/IClock";
import type { ModelCallControl } from "../agentic/model/ModelCallControl";
import type { GuardSelectionInput } from "./GuardSelectionInput";
import type { GuardSelection } from "./GuardSelection";
import type { GuardSelectionOutcome } from "./GuardSelectionOutcome";
import { GuardRegistry } from "./GuardRegistry";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { GuardConfigurationError } from "../errors/GuardConfigurationError";
export class GuardSelectionService {
  constructor(private readonly registry: GuardRegistry, private readonly decisions: IDecisionUnit,
    private readonly policy: IPolicy<GuardSelectionInput, GuardSelection>, private readonly ids: IIdGenerator, private readonly clock: IClock) {}
  async select(requiredIds: readonly string[], optionalIds: readonly string[], taskSummary: string, control: ModelCallControl): Promise<GuardSelectionOutcome> {
    if (requiredIds.length > 8 || optionalIds.length > 8 || new Set([...requiredIds, ...optionalIds]).size !== requiredIds.length + optionalIds.length ||
        typeof taskSummary !== "string" || taskSummary.trim().length === 0 || new TextEncoder().encode(taskSummary).byteLength > 1024 || /[\u0000-\u001f]/.test(taskSummary)) throw new GuardConfigurationError();
    const required = Object.freeze(requiredIds.map(id => this.registry.guard(id)));
    const candidates = optionalIds.map(id => this.registry.guard(id));
    const evaluated: GuardSelectionInput["optional"][number][] = [];
    const controls = new ExecutionBoundaryGuard(this.clock, control.signal, control.deadlineEpochMs);
    let stopReason = controls.check(); let index = 0;
    for (; index < candidates.length && stopReason === null; index++) {
      const guard = candidates[index];
      const outcome = await this.decisions.evaluate({ purpose: "select-guard", question: "Should this optional guard apply to the task?", options: ["include", "exclude"],
        evidence: [{ ref: "task:summary", text: taskSummary }, { ref: `guard:${guard.id}`, text: guard.description }] }, { ...control, operationId: this.ids.nextId() });
      evaluated.push(Object.freeze({ guard, outcome }));
      stopReason = controls.check();
      if (outcome.status === "stopped") stopReason = outcome.reason;
      if (outcome.status === "uncertain" || stopReason !== null) { index++; break; }
    }
    const proposal = await this.policy.apply(Object.freeze({ required, optional: Object.freeze(evaluated), unevaluated: Object.freeze(candidates.slice(index).map(guard => guard.id)) }));
    const known = new Map([...required, ...candidates].map(guard => [guard.id, guard]));
    if (proposal.schemaVersion !== 1 || proposal.guards.length > 16 || proposal.guards.some(guard => known.get(guard.id)?.version !== guard.version) ||
        proposal.unresolvedGuardIds.some(id => !known.has(id))) throw new GuardConfigurationError();
    // Canonicalize definitions and preserve mandatory guards/uncertainty independently of the configurable policy.
    const selected = new Map(required.map(guard => [guard.id, guard]));
    for (const guard of proposal.guards) selected.set(guard.id, known.get(guard.id)!);
    const unresolved = new Set([...proposal.unresolvedGuardIds, ...candidates.slice(index).map(guard => guard.id)]);
    const pending = new Set(evaluated.flatMap(item => item.outcome.status === "uncertain" ? [item.outcome.operationId] : []));
    for (const reference of proposal.pendingOperationRefs) pending.add(reference);
    return Object.freeze({ selection: Object.freeze({ schemaVersion: 1 as const, guards: Object.freeze([...selected.values()]), unresolvedGuardIds: Object.freeze([...unresolved]), pendingOperationRefs: Object.freeze([...pending]) }), stopReason: stopReason ?? controls.check() });
  }
}
```

### `guards/GuardCheckResultContract.ts`

Rejects wrong revisions, duplicate/missing rule coverage, invented evidence references, and pass/fail claims with no evidence.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { GuardCheckResult } from "./GuardCheckResult";
import type { GuardCheckInput } from "./GuardCheckInput";
import { JsonValueContract } from "../persistence/JsonValueContract";
export class GuardCheckResultContract implements IResultContract<GuardCheckResult> {
  private readonly evidence: ReadonlySet<string>;
  readonly id = "guard-check-result"; readonly version = "1";
  constructor(private readonly input: GuardCheckInput, permittedEvidenceRefs: readonly string[], private readonly json: JsonValueContract) { this.evidence = new Set(permittedEvidenceRefs); }
  async validate(raw: unknown): Promise<ValidationResult<GuardCheckResult>> {
    const checked = await this.json.validate(raw);
    if (!checked.valid) return { valid: false, issues: checked.issues };
    const value = checked.value;
    if (!this.record(value) || Object.keys(value).sort().join(",") !== "findings,revisionRef" || value.revisionRef !== this.input.target.revisionRef || !Array.isArray(value.findings) || value.findings.length !== this.input.ruleIds.length) return this.invalid();
    const ids = new Set<string>();
    for (const item of value.findings) {
      if (!this.record(item) || Object.keys(item).sort().join(",") !== "code,evidenceRefs,ruleId,verdict" || typeof item.ruleId !== "string" || !this.input.ruleIds.includes(item.ruleId) || ids.has(item.ruleId) ||
          !["pass", "fail", "unknown"].includes(String(item.verdict)) || typeof item.code !== "string" || !/^[A-Z][A-Z0-9_]{0,63}$/.test(item.code) || !Array.isArray(item.evidenceRefs) || item.evidenceRefs.length > 16 ||
          item.evidenceRefs.some(ref => typeof ref !== "string" || !this.evidence.has(ref)) || new Set(item.evidenceRefs).size !== item.evidenceRefs.length ||
          (item.verdict !== "unknown" && item.evidenceRefs.length === 0)) return this.invalid();
      ids.add(item.ruleId);
    }
    return { valid: true, value: value as unknown as GuardCheckResult };
  }
  private record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
  private invalid(): ValidationResult<GuardCheckResult> { return { valid: false, issues: [{ path: [], code: "invalid-guard-check", message: "Guard result lacks valid target-bound rule coverage or evidence." }] }; }
}
```

### `guards/IGuardEvidenceVerifier.ts`

Checks saved evidence authorization, existence, and provenance for the exact target/check invocation before accepting references.

```typescript
import type { GuardCheckInput } from "./GuardCheckInput";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
export interface IGuardEvidenceVerifier { verify(references: readonly string[], input: GuardCheckInput, context: IExecutionContext): Promise<boolean>; }
```

### `guards/GuardCheckRecord.ts`

Records one check attempt with pinned versions, operation identity, exact revision, and explicit unavailable/uncertain coverage.

```typescript
import type { GuardCheckResult } from "./GuardCheckResult";
export type GuardCheckRecord = Readonly<{ guardId: string; guardVersion: string; checkId: string; checkVersion: string; operationId: string;
  revisionRef: string; status: "completed" | "unavailable" | "uncertain"; result: GuardCheckResult | null }>;
```

### `guards/GuardReport.ts`

Keeps selected definitions, target identity, actual check records, and uncertain operations together for enforcement and persistence.

```typescript
import type { GuardSelection } from "./GuardSelection";
import type { GuardTarget } from "./GuardTarget";
import type { GuardCheckRecord } from "./GuardCheckRecord";
export type GuardReport = Readonly<{ schemaVersion: 1; selection: GuardSelection; target: GuardTarget; checks: readonly GuardCheckRecord[]; pendingOperationRefs: readonly string[] }>;
```

### `guards/GuardRunOutcome.ts`

Preserves collected check records even when cancellation/deadline stops further checks.

```typescript
import type { GuardReport } from "./GuardReport";
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
export type GuardRunOutcome = Readonly<{ report: GuardReport; stopReason: ExecutionStopReason | null }>;
```

### `guards/BoundedGuardCheckRunner.ts`

Bounds one underlying check attempt and keeps its slot occupied if cancellation or timeout fails to stop the actual implementation.

```typescript
import type { IGuardCheck } from "./IGuardCheck";
import type { GuardCheckInput } from "./GuardCheckInput";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IClock } from "../contracts/runtime/IClock";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { GuardConfigurationError } from "../errors/GuardConfigurationError";
export class BoundedGuardCheckRunner {
  private active = false;
  constructor(private readonly clock: IClock, private readonly timeoutMs: number) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2147483647) throw new GuardConfigurationError();
  }
  async run(check: IGuardCheck, input: GuardCheckInput, context: IExecutionContext): Promise<Readonly<{ status: "returned"; value: unknown }> | Readonly<{ status: "unavailable" | "uncertain" }>> {
    if (this.active || new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs).check() !== null) return { status: "unavailable" };
    this.active = true; const abort = new AbortController(); let cancel = () => {}; let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const cancelled = new Promise<Readonly<{ status: "uncertain" }>>(resolve => { cancel = () => { abort.abort(); resolve({ status: "uncertain" }); }; context.signal.addEventListener("abort", cancel, { once: true }); });
      const remaining = context.deadlineEpochMs === null ? this.timeoutMs : Math.max(1, Math.min(this.timeoutMs, context.deadlineEpochMs - this.clock.nowEpochMs()));
      const timeout = new Promise<Readonly<{ status: "uncertain" }>>(resolve => { timer = setTimeout(() => { abort.abort(); resolve({ status: "uncertain" }); }, remaining); });
      const operation = Promise.resolve().then(() => check.evaluate(input, Object.freeze({ ...context, signal: abort.signal }))).then(
        value => ({ status: "returned" as const, value }), () => ({ status: "uncertain" as const }));
      void operation.then(() => { this.active = false; }, () => { this.active = false; });
      return await Promise.race([operation, cancelled, timeout]);
    } finally { if (timer !== undefined) clearTimeout(timer); context.signal.removeEventListener("abort", cancel); }
  }
}
```

### `guards/GuardRunner.ts`

Runs pinned registered checks sequentially against an authorized immutable target and accepts only bounded evidence-verified results.

```typescript
import type { GuardSelection } from "./GuardSelection";
import type { GuardTarget } from "./GuardTarget";
import type { GuardCheckRecord } from "./GuardCheckRecord";
import type { GuardRunOutcome } from "./GuardRunOutcome";
import type { IGuardTargetVerifier } from "./IGuardTargetVerifier";
import type { IGuardEvidenceVerifier } from "./IGuardEvidenceVerifier";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext";
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";
import { GuardRegistry } from "./GuardRegistry";
import { GuardCheckResultContract } from "./GuardCheckResultContract";
import { BoundedGuardCheckRunner } from "./BoundedGuardCheckRunner";
import { JsonValueContract } from "../persistence/JsonValueContract";
import { ExecutionBoundaryGuard } from "../execution-control/ExecutionBoundaryGuard";
import { GuardConfigurationError } from "../errors/GuardConfigurationError";
export class GuardRunner {
  constructor(private readonly registry: GuardRegistry, private readonly targets: IGuardTargetVerifier,
    private readonly evidence: IGuardEvidenceVerifier, private readonly executor: BoundedGuardCheckRunner,
    private readonly json: JsonValueContract, private readonly clock: IClock, private readonly ids: IIdGenerator) {}
  async run(selection: GuardSelection, targetInput: GuardTarget, context: IExecutionContext): Promise<GuardRunOutcome> {
    if (selection.schemaVersion !== 1 || selection.guards.length > 16 || new Set(selection.guards.map(guard => guard.id)).size !== selection.guards.length ||
        targetInput.workspaceId !== context.scope.workspaceId || !/^[a-zA-Z0-9_.:/-]{1,128}$/.test(targetInput.revisionRef) || !Array.isArray(targetInput.artifactRefs) || targetInput.artifactRefs.length > 32 ||
        targetInput.artifactRefs.some(ref => typeof ref !== "string" || !/^[a-zA-Z0-9_.:/-]{1,256}$/.test(ref))) throw new GuardConfigurationError();
    const target = Object.freeze({ ...targetInput, artifactRefs: Object.freeze([...targetInput.artifactRefs]) });
    const controls = new ExecutionBoundaryGuard(this.clock, context.signal, context.deadlineEpochMs);
    let stopReason = controls.check(); const records: GuardCheckRecord[] = [];
    const pending = new Set(selection.pendingOperationRefs);
    if (stopReason === null && !await this.targets.verify(target, context)) throw new GuardConfigurationError();
    let attempts = 0;
    for (const selected of selection.guards) {
      const guard = this.registry.guard(selected.id); if (guard.version !== selected.version) throw new GuardConfigurationError();
      for (const checkId of new Set(guard.rules.flatMap(rule => [...rule.checkIds]))) {
        const check = this.registry.check(checkId); const operationId = this.ids.nextId();
        const input = Object.freeze({ guardId: guard.id, guardVersion: guard.version, checkId, checkVersion: check.version,
          ruleIds: Object.freeze(guard.rules.filter(rule => rule.checkIds.includes(checkId)).map(rule => rule.id)), target });
        let status: GuardCheckRecord["status"] = "unavailable"; let result: GuardCheckRecord["result"] = null;
        stopReason = stopReason ?? controls.check();
        if (stopReason === null && pending.size === 0 && attempts < 32) {
          attempts++;
          const checkContext = Object.freeze({ ...context, identity: Object.freeze({ ...context.identity, parentOperationId: context.identity.operationId, operationId }) });
          const executed = await this.executor.run(check, input, checkContext);
          if (executed.status === "uncertain") { status = "uncertain"; pending.add(operationId); }
          if (executed.status === "returned") {
            const canonical = await this.json.validate(executed.value);
            if (canonical.valid && new TextEncoder().encode(JSON.stringify(canonical.value)).byteLength <= 32768) {
              const refs = this.references(canonical.value);
              const validated = await new GuardCheckResultContract(input, refs, this.json).validate(canonical.value);
              if (validated.valid && await this.evidence.verify(refs, input, checkContext) && await this.targets.verify(target, context)) { result = validated.value; status = "completed"; }
            }
          }
        }
        records.push(Object.freeze({ guardId: guard.id, guardVersion: guard.version, checkId, checkVersion: check.version, operationId, revisionRef: target.revisionRef, status, result }));
      }
    }
    return Object.freeze({ report: Object.freeze({ schemaVersion: 1 as const, selection, target, checks: Object.freeze(records), pendingOperationRefs: Object.freeze([...pending]) }), stopReason: stopReason ?? controls.check() });
  }
  private references(value: unknown): readonly string[] {
    if (value === null || typeof value !== "object" || !Array.isArray((value as { findings?: unknown }).findings)) return [];
    const result = new Set<string>();
    for (const finding of (value as { findings: unknown[] }).findings) {
      if (finding === null || typeof finding !== "object" || !Array.isArray((finding as { evidenceRefs?: unknown }).evidenceRefs)) continue;
      for (const ref of (finding as { evidenceRefs: unknown[] }).evidenceRefs) if (typeof ref === "string" && /^[a-zA-Z0-9_.:/-]{1,256}$/.test(ref)) result.add(ref);
    }
    return Object.freeze([...result]);
  }
}
```

### `guards/GuardEnforcementInput.ts`

Supplies a trusted coordinator report and the target expected by the acceptance boundary.

```typescript
import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason";
import type { GuardReport } from "./GuardReport";
import type { GuardTarget } from "./GuardTarget";
export type GuardEnforcementInput = Readonly<{ report: GuardReport; stopReason: ExecutionStopReason | null; expectedTarget: GuardTarget }>;
```

### `guards/GuardEnforcementDecision.ts`

Separates acceptance, evidence-backed correction requests, and stops caused by incomplete or uncertain coverage.

```typescript
export type GuardEnforcementDecision = Readonly<{ action: "accept" | "request-fix" | "stop"; blockingRuleIds: readonly string[]; warningRuleIds: readonly string[]; reasonCodes: readonly string[] }>;
```

### `guards/GuardEnforcementPolicy.ts`

Uses canonical registered rules and trusted required IDs so configurable recommendations cannot remove mandatory coverage.

```typescript
import type { IPolicy } from "../contracts/IPolicy";
import type { GuardEnforcementInput } from "./GuardEnforcementInput";
import type { GuardEnforcementDecision } from "./GuardEnforcementDecision";
import { GuardRegistry } from "./GuardRegistry";
export class GuardEnforcementPolicy implements IPolicy<GuardEnforcementInput, GuardEnforcementDecision> {
  private readonly required: readonly string[];
  constructor(private readonly registry: GuardRegistry, requiredIds: readonly string[]) { this.required = Object.freeze([...requiredIds]); for (const id of requiredIds) registry.guard(id); }
  async apply(input: GuardEnforcementInput): Promise<GuardEnforcementDecision> {
    const { report, expectedTarget } = input; const reasons = new Set<string>(); const blocking = new Set<string>(); const warnings = new Set<string>(); let incomplete = false;
    if (input.stopReason !== null) { reasons.add("EXECUTION_STOPPED"); incomplete = true; }
    if (report.schemaVersion !== 1 || !this.sameTarget(report.target, expectedTarget)) { reasons.add("TARGET_MISMATCH"); incomplete = true; }
    if (report.selection.unresolvedGuardIds.length > 0 || report.pendingOperationRefs.length > 0 || report.selection.pendingOperationRefs.length > 0) { reasons.add("COVERAGE_OR_OPERATIONS_UNRESOLVED"); incomplete = true; }
    const selected = new Map(report.selection.guards.map(guard => [guard.id, guard]));
    if (selected.size !== report.selection.guards.length) { reasons.add("SELECTION_AMBIGUOUS"); incomplete = true; }
    for (const id of this.required) if (!selected.has(id)) { reasons.add("REQUIRED_GUARD_MISSING"); incomplete = true; }
    for (const selectedGuard of selected.values()) {
      const guard = this.registry.guard(selectedGuard.id);
      if (guard.version !== selectedGuard.version) { reasons.add("GUARD_VERSION_MISMATCH"); incomplete = true; continue; }
      for (const rule of guard.rules) {
        let failed = false, unknown = false;
        for (const checkId of rule.checkIds) {
          const check = this.registry.check(checkId);
          const matching = report.checks.filter(item => item.guardId === guard.id && item.checkId === checkId);
          const record = matching[0];
          const finding = record?.result?.findings.filter(item => item.ruleId === rule.id);
          if (matching.length !== 1 || record.status !== "completed" || record.guardVersion !== guard.version || record.checkVersion !== check.version || record.revisionRef !== expectedTarget.revisionRef || record.result?.revisionRef !== expectedTarget.revisionRef || finding?.length !== 1) { unknown = true; continue; }
          if (finding[0].verdict === "fail") failed = true;
          if (finding[0].verdict === "unknown" || finding[0].evidenceRefs.length === 0) unknown = true;
        }
        if (rule.blocking && failed) reasons.add("BLOCKING_RULE_FAILED");
        if (rule.blocking && (failed || unknown)) blocking.add(rule.id);
        if (!rule.blocking && (failed || unknown)) warnings.add(rule.id);
        if (rule.blocking && unknown) { incomplete = true; reasons.add("REQUIRED_CHECK_COVERAGE_MISSING"); }
      }
    }
    return Object.freeze({ action: incomplete ? "stop" : blocking.size > 0 ? "request-fix" : "accept", blockingRuleIds: Object.freeze([...blocking]), warningRuleIds: Object.freeze([...warnings]), reasonCodes: Object.freeze([...reasons]) });
  }
  private sameTarget(a: GuardEnforcementInput["expectedTarget"], b: GuardEnforcementInput["expectedTarget"]): boolean {
    return a.workspaceId === b.workspaceId && a.revisionRef === b.revisionRef && a.artifactRefs.length === b.artifactRefs.length && new Set(a.artifactRefs).size === a.artifactRefs.length && a.artifactRefs.every(ref => b.artifactRefs.includes(ref));
  }
}
```

### `guards/SkillGuidance.ts`

Exports version-pinned guard instructions and rule identities for later stable context composition.

```typescript
export type SkillGuidance = Readonly<{ guardId: string; guardVersion: string; instructions: string; ruleIds: readonly string[] }>;
```

### `guards/GuardGuidanceComposer.ts`

Arranges selected guidance deterministically and rejects explicitly configured incompatible guard pairs before prompt construction.

```typescript
import type { GuardSelection } from "./GuardSelection";
import type { SkillGuidance } from "./SkillGuidance";
import { GuardRegistry } from "./GuardRegistry";
import { GuardConfigurationError } from "../errors/GuardConfigurationError";
export class GuardGuidanceComposer {
  private readonly conflicts: readonly (readonly [string, string])[];
  constructor(private readonly registry: GuardRegistry, conflicts: readonly (readonly [string, string])[]) {
    if (conflicts.length > 64) throw new GuardConfigurationError();
    this.conflicts = Object.freeze(conflicts.map(pair => { registry.guard(pair[0]); registry.guard(pair[1]); return Object.freeze([pair[0], pair[1]] as const); }));
  }
  compose(selection: GuardSelection): readonly SkillGuidance[] {
    if (selection.unresolvedGuardIds.length > 0 || selection.pendingOperationRefs.length > 0) throw new GuardConfigurationError();
    const active = new Set(selection.guards.map(guard => guard.id));
    if (this.conflicts.some(pair => active.has(pair[0]) && active.has(pair[1]))) throw new GuardConfigurationError();
    return Object.freeze([...selection.guards].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0).map(selected => {
      const guard = this.registry.guard(selected.id); if (guard.version !== selected.version) throw new GuardConfigurationError();
      return Object.freeze({ guardId: guard.id, guardVersion: guard.version, instructions: guard.instructions, ruleIds: Object.freeze(guard.rules.map(rule => rule.id)) });
    }));
  }
}
```

### `guards/checks/VerificationReceipt.ts`

Represents a saved actual configured-check invocation; it is not a model’s claim that lint passed.

```typescript
export type VerificationReceipt = Readonly<{ checkId: string; checkVersion: string; revisionRef: string; exitCode: number; evidenceRef: string }>;
```

### `guards/checks/IVerificationReceiptReader.ts`

Resolves authorized immutable verification receipts and validates their provenance against the requested target.

```typescript
import type { VerificationReceipt } from "./VerificationReceipt";
import type { GuardTarget } from "../GuardTarget";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export interface IVerificationReceiptReader { read(reference: string, target: GuardTarget, context: IExecutionContext): Promise<VerificationReceipt | null>; }
```

### `guards/checks/RecordedLintCheck.ts`

Evaluates an existing verified lint-process receipt; it does not spawn ESLint or infer a pass from instruction text.

```typescript
import type { IGuardCheck } from "../IGuardCheck";
import type { GuardCheckInput } from "../GuardCheckInput";
import type { IVerificationReceiptReader } from "./IVerificationReceiptReader";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
export class RecordedLintCheck implements IGuardCheck {
  readonly id = "recorded-lint"; readonly version = "1";
  constructor(private readonly receipts: IVerificationReceiptReader, private readonly receiptRef: string) {}
  async evaluate(input: GuardCheckInput, context: IExecutionContext): Promise<unknown> {
    const receipt = await this.receipts.read(this.receiptRef, input.target, context);
    const known = receipt !== null && receipt.checkId === "eslint" && receipt.checkVersion === "1" && receipt.revisionRef === input.target.revisionRef && Number.isSafeInteger(receipt.exitCode) && receipt.exitCode >= 0 && receipt.exitCode <= 255;
    return { revisionRef: input.target.revisionRef, findings: input.ruleIds.map(ruleId => ({ ruleId,
      verdict: !known ? "unknown" : receipt!.exitCode === 0 ? "pass" : "fail", evidenceRefs: known ? [receipt!.evidenceRef] : [], code: !known ? "LINT_RECEIPT_UNAVAILABLE" : receipt!.exitCode === 0 ? "LINT_PASSED" : "LINT_FAILED" })) };
  }
}
```

### `examples/guards/createLintGuard.ts`

Supplies one required lint guard whose guidance is delivered before coding and whose rule later needs a real revision-bound receipt.

```typescript
import type { GuardDefinition } from "../../guards/GuardDefinition";
export function createLintGuard(): GuardDefinition {
  return Object.freeze({ id: "lint", version: "1", description: "Follow configured lint rules for changed TypeScript source.",
    instructions: "Follow the repository lint configuration. Preserve behavior while correcting diagnostics. An instruction or model assertion is not a lint-process receipt.",
    rules: Object.freeze([Object.freeze({ id: "lint.configured", requirement: "The configured lint invocation must pass for the checked revision.", blocking: true, checkIds: Object.freeze(["recorded-lint"]) })]) });
}
```

### `tests/guards/checkGuardEnforcement.ts`

Checks actual receipt mapping, failed/missing coverage, stale target rejection, mandatory guard retention, and guidance conflicts offline.

```typescript
import { GuardRegistry } from "../../guards/GuardRegistry";
import { GuardRunner } from "../../guards/GuardRunner";
import { BoundedGuardCheckRunner } from "../../guards/BoundedGuardCheckRunner";
import { GuardEnforcementPolicy } from "../../guards/GuardEnforcementPolicy";
import { GuardGuidanceComposer } from "../../guards/GuardGuidanceComposer";
import { RecordedLintCheck } from "../../guards/checks/RecordedLintCheck";
import { JsonValueContract } from "../../persistence/JsonValueContract";
import { createLintGuard } from "../../examples/guards/createLintGuard";
export async function checkGuardEnforcement(): Promise<void> {
  const registry = new GuardRegistry(); let exitCode = 0;
  registry.registerCheck(new RecordedLintCheck({ async read(_ref, target) { return { checkId: "eslint", checkVersion: "1", revisionRef: target.revisionRef, exitCode, evidenceRef: "artifact:lint-report" }; } }, "verification:lint"));
  registry.registerGuard(createLintGuard());
  const selection = { schemaVersion: 1 as const, guards: [registry.guard("lint")], unresolvedGuardIds: [], pendingOperationRefs: [] };
  const target = { workspaceId: "workspace", revisionRef: "revision-one", artifactRefs: ["artifact:source-snapshot"] };
  const context = { identity: { operationId: "guard-batch" }, scope: { scopeId: "scope", projectId: "project", workspaceId: "workspace" }, signal: new AbortController().signal, deadlineEpochMs: 1000, reporter: { async progress() {} } };
  const clock = { nowEpochMs: () => 100 }; let id = 0;
  const runner = new GuardRunner(registry, { async verify() { return true; } }, { async verify(refs) { return refs.every(ref => ref === "artifact:lint-report"); } }, new BoundedGuardCheckRunner(clock, 100), new JsonValueContract(), clock, { nextId: () => `check-${++id}` });
  const policy = new GuardEnforcementPolicy(registry, ["lint"]);
  const passing = await runner.run(selection, target, context);
  if ((await policy.apply({ ...passing, expectedTarget: target })).action !== "accept") throw new Error("Valid fixture receipt rejected.");
  exitCode = 1;
  const failing = await runner.run(selection, target, context);
  if ((await policy.apply({ ...failing, expectedTarget: target })).action !== "request-fix") throw new Error("Lint failure accepted.");
  if ((await policy.apply({ ...passing, report: { ...passing.report, checks: [] }, expectedTarget: target })).action !== "stop") throw new Error("Missing coverage accepted.");
  if ((await policy.apply({ ...passing, expectedTarget: { ...target, revisionRef: "revision-two" } })).action !== "stop") throw new Error("Stale evidence accepted.");
  if ((await policy.apply({ ...passing, report: { ...passing.report, selection: { ...selection, guards: [] } }, expectedTarget: target })).action !== "stop") throw new Error("Required guard removed.");
  if (new GuardGuidanceComposer(registry, []).compose(selection)[0].guardId !== "lint") throw new Error("Pinned guidance missing.");
  let conflict = false; try { new GuardGuidanceComposer(registry, [["lint", "lint"]]).compose(selection); } catch { conflict = true; }
  if (!conflict) throw new Error("Configured guidance conflict ignored.");
}
```

### `tests/guards/checkGuardSelection.ts`

Checks required-guard retention, per-candidate relevance, bounded fallback, and pending decision preservation.

```typescript
import { GuardRegistry } from "../../guards/GuardRegistry";
import { GuardSelectionService } from "../../guards/GuardSelectionService";
import { ConservativeGuardSelectionPolicy } from "../../guards/ConservativeGuardSelectionPolicy";
import { createLintGuard } from "../../examples/guards/createLintGuard";
import type { DecisionOutcome } from "../../decisions/DecisionOutcome";
export async function checkGuardSelection(): Promise<void> {
  const registry = new GuardRegistry();
  registry.registerCheck({ id: "recorded-lint", version: "1", async evaluate() { return null; } });
  registry.registerGuard(createLintGuard());
  registry.registerGuard({ id: "optional", version: "1", description: "Optional fixture review.", instructions: "Apply the configured optional fixture review.", rules: [{ id: "optional.rule", requirement: "Obtain fixture evidence.", blocking: true, checkIds: ["recorded-lint"] }] });
  let calls = 0, id = 0; let outcome: DecisionOutcome = { status: "answered", answer: { kind: "answered", choice: "exclude", supportingRefs: [] } };
  const service = new GuardSelectionService(registry, { async evaluate() { calls++; return outcome; } }, new ConservativeGuardSelectionPolicy(true), { nextId: () => `decision-${++id}` }, { nowEpochMs: () => 100 });
  const control = { operationId: "select-guards", signal: new AbortController().signal, deadlineEpochMs: 1000, timeoutMs: 100 };
  const selected = await service.select(["lint"], ["optional"], "TypeScript login handler changes.", control);
  if (selected.selection.guards.length !== 1 || selected.selection.guards[0].id !== "lint" || calls !== 1) throw new Error("Required guard removed or optional relevance ignored.");
  outcome = { status: "unavailable", code: "UNAVAILABLE" };
  if ((await service.select(["lint"], ["optional"], "TypeScript changes.", control)).selection.guards.length !== 2) throw new Error("Explicit fallback missing.");
  outcome = { status: "uncertain", operationId: "decision-uncertain" };
  if ((await service.select(["lint"], ["optional"], "TypeScript changes.", control)).selection.pendingOperationRefs[0] !== "decision-uncertain") throw new Error("Pending decision hidden.");
}
```

### `index.ts`

Appends the production guard API; sample definitions and test functions remain private.

```typescript
export type { GuardRule } from "./guards/GuardRule";
export type { GuardDefinition } from "./guards/GuardDefinition";
export type { GuardTarget } from "./guards/GuardTarget";
export type { GuardCheckInput } from "./guards/GuardCheckInput";
export type { GuardFinding } from "./guards/GuardFinding";
export type { GuardCheckResult } from "./guards/GuardCheckResult";
export type { IGuardCheck } from "./guards/IGuardCheck";
export type { IGuardTargetVerifier } from "./guards/IGuardTargetVerifier";
export { GuardConfigurationError } from "./errors/GuardConfigurationError";
export { GuardRegistry } from "./guards/GuardRegistry";
export type { GuardSelection } from "./guards/GuardSelection";
export type { GuardSelectionInput } from "./guards/GuardSelectionInput";
export { ConservativeGuardSelectionPolicy } from "./guards/ConservativeGuardSelectionPolicy";
export type { GuardSelectionOutcome } from "./guards/GuardSelectionOutcome";
export { GuardSelectionService } from "./guards/GuardSelectionService";
export { GuardCheckResultContract } from "./guards/GuardCheckResultContract";
export type { IGuardEvidenceVerifier } from "./guards/IGuardEvidenceVerifier";
export type { GuardCheckRecord } from "./guards/GuardCheckRecord";
export type { GuardReport } from "./guards/GuardReport";
export type { GuardRunOutcome } from "./guards/GuardRunOutcome";
export { BoundedGuardCheckRunner } from "./guards/BoundedGuardCheckRunner";
export { GuardRunner } from "./guards/GuardRunner";
export type { GuardEnforcementInput } from "./guards/GuardEnforcementInput";
export type { GuardEnforcementDecision } from "./guards/GuardEnforcementDecision";
export { GuardEnforcementPolicy } from "./guards/GuardEnforcementPolicy";
export type { SkillGuidance } from "./guards/SkillGuidance";
export { GuardGuidanceComposer } from "./guards/GuardGuidanceComposer";
export type { VerificationReceipt } from "./guards/checks/VerificationReceipt";
export type { IVerificationReceiptReader } from "./guards/checks/IVerificationReceiptReader";
export { RecordedLintCheck } from "./guards/checks/RecordedLintCheck";
```
