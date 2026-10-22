# 03. Core Contracts and Shared Policy

## What We Implement Here

Create the shared TypeScript interfaces and data types for policies, executors, execution context, validation, and explicit outcomes, plus the two core error classes. Add a small policy example and deterministic test support to verify these contracts before implementing the engine, providers, persistence, or sub-agent runtime.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `contracts/IPolicy.ts` | `interface IPolicy<TInput, TOutput>` |
| `contracts/runtime/IClock.ts` | `interface IClock` |
| `contracts/runtime/IIdGenerator.ts` | `interface IIdGenerator` |
| `contracts/validation/IResultContract.ts` | `interface IResultContract<TResult>` |
| `executors/contracts/IExecutor.ts` | `interface IExecutor<TInput, TResult>` |
| `executors/contracts/IExecutionContext.ts` | `interface IExecutionContext` |
| `executors/contracts/IExecutionReporter.ts` | `interface IExecutionReporter` |
| `contracts/runtime/ExecutionIdentity.ts` | `type ExecutionIdentity` |
| `contracts/runtime/ExecutionScopeRef.ts` | `type ExecutionScopeRef` |
| `contracts/outcomes/PartialProgress.ts` | `type PartialProgress` |
| `contracts/outcomes/ExecutionOutcome.ts` | `type ExecutionOutcome<TResult>` |
| `contracts/validation/ValidationResult.ts` | `type ValidationResult<TValue>` |
| `errors/UnknownRegistrationError.ts` | `class UnknownRegistrationError extends Error` |
| `errors/PersistenceError.ts` | `class PersistenceError extends Error` |
| `index.ts` | Explicit type and value exports |
| `examples/shared-policy/SpecificationPolicyInput.ts` | `type SpecificationPolicyInput` |
| `examples/shared-policy/SpecificationAssignment.ts` | `type SpecificationAssignment` |
| `examples/shared-policy/SpecificationInputPolicy.ts` | `class SpecificationInputPolicy implements IPolicy<SpecificationPolicyInput, SpecificationAssignment>` |
| `examples/shared-policy/main.ts` | `async function main()` |
| `tests/fakes/FixedClock.ts` | `class FixedClock implements IClock` |
| `tests/fakes/SequenceIdGenerator.ts` | `class SequenceIdGenerator implements IIdGenerator` |
| `tests/fakes/RecordingExecutionReporter.ts` | `class RecordingExecutionReporter implements IExecutionReporter` |
| `tests/fakes/FakeExecutor.ts` | `class FakeExecutor<TInput, TResult> implements IExecutor<TInput, TResult>` |
| `tests/fakes/StringResultContract.ts` | `class StringResultContract implements IResultContract<string>` |
| `tests/fakes/EmptyFindingsPolicy.ts` | `class EmptyFindingsPolicy implements IPolicy<SpecificationPolicyInput, SpecificationAssignment>` |
| `tests/contracts/Policy.test.ts` | Policy test functions |
| `tests/contracts/Executor.test.ts` | Executor contract test functions |
| `tests/contracts/ResultContract.test.ts` | Validation test functions |
| `tests/unit/RuntimeDependencies.test.ts` | Runtime collaborator test functions |
| `tests/unit/Errors.test.ts` | Error test functions |
| `tests/contracts/PublicApi.compile.ts` | Compile-only public API fixture |

## Rules Specific to These Files

General OOP, file naming, and coding conventions are defined in [01. Scope and Implementation Roadmap](01-scope-and-implementation-roadmap.md). The rules below define the behavior and data requirements of this page's files.

| File or declaration | Required rules |
| --- | --- |
| `IPolicy` | Expose only `apply(input: TInput): Promise<TOutput>`. Callers await it. Inputs are scoped snapshots; the policy must not mutate authoritative execution state. A returned decision does not reserve capacity, grant permission, start work, or establish approval. |
| `IClock` | Expose `nowEpochMs(): number` returning UTC epoch milliseconds. This is a wall-clock source, not a timer or a guarantee of monotonic elapsed time. |
| `IIdGenerator` | Expose `nextId(): string`. Generating an ID does not persist it or protect against duplicate operation delivery. |
| `ExecutionIdentity` | Include `operationId` and optional `runId`, `stepRunId`, `sessionId`, and `parentOperationId`. Workflow-backed executions require valid run/step relationships. Model/tool/child operations retain their own identities and parent links. Validate relationships at the owning runtime boundary. |
| `ExecutionScopeRef` | Include `scopeId`, `projectId`, and optional `workspaceId`. These reference trusted effective scope; a supplied ID or constructed object never grants access by itself. Do not include credentials or unrestricted clients. |
| `IExecutor` | Expose `execute(input: TInput, context: IExecutionContext): Promise<ExecutionOutcome<TResult>>`. Return the shared outcome envelope rather than a raw result. Producing a completed payload does not prove acceptance or durable persistence. |
| `IExecutionContext` | Carry readonly `identity`, `scope`, `signal: AbortSignal`, `deadlineEpochMs: number \| null`, and `reporter`. `null` means no deadline at this scope. Keep executor-specific services injected separately. The context describes controls; runtime owners enforce them. Do not serialize its live signal into checkpoints. |
| `IExecutionReporter` | Expose `progress(message: string): Promise<void>`. Its production implementation must bound and redact messages. Progress is diagnostic information, not proof of execution or an accepted saved result. |
| `PartialProgress` | Require `summary`, readonly `evidenceRefs`, readonly `artifactRefs`, and readonly `unresolved`. References remain scoped and validated. Empty findings are allowed; invented findings are not. Pending or failed persistence must not be presented as a saved artifact. |
| `ExecutionOutcome<TResult>` | Use a discriminated union: `completed` carries `result: TResult`; `stopped` carries `reason`, `partial`, and `pendingOperationRefs`; `failed` carries safe `error`, `partial`, and `pendingOperationRefs`. Never cast partial work to `TResult`. Cancellation uses a stopped outcome. |
| Stopped reasons and failure records | A stopped reason has `code` and `message`; supported codes are `limit-reached`, `deadline-reached`, `cancelled`, and `no-progress`. Failure data contains a safe string `code` and bounded `message`, not a live exception, stack trace, credentials, or raw provider response. |
| Partial and pending outcomes | Preserve unresolved requirements and uncertain operation references. A parent may use supported findings only within its remaining allowance and acceptance rules. Neither failed nor stopped proves no files changed. Hard exhaustion does not authorize an extra closing model call. |
| `ValidationResult<TValue>` | Use `valid: true` with `value: TValue`, or `valid: false` with readonly `issues`. Each issue includes a readonly string/number `path`, a `code`, and a safe `message`. Do not turn invalid input into an empty successful value. |
| `IResultContract<TResult>` | Expose readonly `id`, readonly `version`, and `validate(value: unknown): Promise<ValidationResult<TResult>>`. Keep schema-library types behind implementations. Validation checks data constraints, not factual truth, task acceptance, permission, or publication approval. Unexpected validator failures are distinct from ordinary invalid data. |
| Runtime validation | TypeScript declarations alone do not validate external or restored values. Owning implementations must validate prepared inputs, dynamic policy decisions, returned outcome envelopes, and stored records. Completed outcomes validate against their result contract; stopped/failed outcomes validate partial progress rather than the completed-result schema. |
| `UnknownRegistrationError` | Directly extend built-in `Error`; set `name` to `UnknownRegistrationError` and stable `code` to `UNKNOWN_REGISTRATION`. Retain the requested registration ID as safe context. Do not introduce an intermediate framework base error. |
| `PersistenceError` | Directly extend built-in `Error`; set `name` to `PersistenceError` and stable `code` to `PERSISTENCE_FAILED`. Use a safe message. A persistence exception must not claim the result or failure record was durably saved. |
| Error handling | Expected rejection, ordinary invalid input, and normal exhaustion remain typed data outcomes. Unexpected failures stay observable and are normalized at their owning operation boundary with partial evidence and pending references intact. Never replay execution blindly because saving failed. |
| `index.ts` | Explicitly re-export these production types and error classes from their authoritative files. Do not export test fakes or add a placeholder `IModelGateway`; its contract belongs to the later model-gateway specification. |
| Example input and assignment | Both retain `goal` and `sourceVersion`; input uses readonly `acceptedFindings`, output uses readonly `findings`. `SpecificationInputPolicy` copies the findings array and does not mutate input. The example imports `IPolicy` through the root public API and performs no provider or storage calls. |
| Test-support classes | Keep them deterministic and test-only. `SequenceIdGenerator` must report sequence exhaustion explicitly. `FakeExecutor` returns configured outcomes without claiming real runtime enforcement. `StringResultContract` checks the unknown value before returning a validated string. `EmptyFindingsPolicy` uses the same generic contract as the example policy. |
| Verification files | Check public contracts, data envelopes, input isolation, deterministic collaborators, validation, and error identity. The public-API fixture imports the production declarations through `index.ts`. These checks do not establish real provider support, persistence guarantees, workflow acceptance, or sub-agent execution. |

## TypeScript Code for Each File

Each heading below represents a separate file under `/Users/niki/PersonalProjects/KushiBot`. These snippets define the phase-03 contracts and minimal offline examples; they do not implement later runtime components. The root `index.ts` snippet shows the exports for this phase; retain any valid exports delivered by earlier phases.

The six verification files show test-runner-neutral checks. The five runtime test files export checks that must be invoked by the project's test runner; merely compiling or importing them does not run the checks. `PublicApi.compile.ts` is compile-only. The fake objects do not enforce production authorization, deadlines, usage, persistence, or result acceptance.

### `contracts/IPolicy.ts`

Defines asynchronous `apply(input)` for configurable decisions and transformations.

```typescript
export interface IPolicy<TInput, TOutput> {
  apply(input: TInput): Promise<TOutput>;
}
```

### `contracts/runtime/IClock.ts`

Provides the current UTC epoch time through `nowEpochMs()`.

```typescript
export interface IClock {
  nowEpochMs(): number;
}
```

### `contracts/runtime/IIdGenerator.ts`

Generates an identifier through `nextId()`.

```typescript
export interface IIdGenerator {
  nextId(): string;
}
```

### `contracts/validation/IResultContract.ts`

Defines a versioned validator accepting unknown input and returning `ValidationResult<TResult>`.

```typescript
import type { ValidationResult } from "./ValidationResult";

export interface IResultContract<TResult> {
  readonly id: string;
  readonly version: string;
  validate(value: unknown): Promise<ValidationResult<TResult>>;
}
```

### `executors/contracts/IExecutor.ts`

Executes an assignment with its context and returns `ExecutionOutcome<TResult>`.

```typescript
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { IExecutionContext } from "./IExecutionContext";

export interface IExecutor<TInput, TResult> {
  execute(
    input: TInput,
    context: IExecutionContext,
  ): Promise<ExecutionOutcome<TResult>>;
}
```

### `executors/contracts/IExecutionContext.ts`

Carries readonly identity, trusted scope reference, cancellation signal, deadline, and reporter.

```typescript
import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef";
import type { IExecutionReporter } from "./IExecutionReporter";

export interface IExecutionContext {
  readonly identity: ExecutionIdentity;
  readonly scope: ExecutionScopeRef;
  readonly signal: AbortSignal;
  readonly deadlineEpochMs: number | null;
  readonly reporter: IExecutionReporter;
}
```

### `executors/contracts/IExecutionReporter.ts`

Reports bounded execution progress through `progress(message)`.

```typescript
export interface IExecutionReporter {
  progress(message: string): Promise<void>;
}
```

### `contracts/runtime/ExecutionIdentity.ts`

Holds operation identity and optional run, step-run, session, and parent-operation identifiers.

```typescript
export type ExecutionIdentity = Readonly<{
  operationId: string;
  runId?: string;
  stepRunId?: string;
  sessionId?: string;
  parentOperationId?: string;
}>;
```

### `contracts/runtime/ExecutionScopeRef.ts`

References an authorized scope, project, and optional workspace.

```typescript
export type ExecutionScopeRef = Readonly<{
  scopeId: string;
  projectId: string;
  workspaceId?: string;
}>;
```

### `contracts/outcomes/PartialProgress.ts`

Holds a summary, evidence references, artifact references, and unresolved requirements.

```typescript
export type PartialProgress = Readonly<{
  summary: string;
  evidenceRefs: readonly string[];
  artifactRefs: readonly string[];
  unresolved: readonly string[];
}>;
```

### `contracts/outcomes/ExecutionOutcome.ts`

Represents completed results, stopped partial progress, or failed execution with partial progress and pending-operation references.

```typescript
import type { PartialProgress } from "./PartialProgress";

export type ExecutionOutcome<TResult> =
  | Readonly<{
      status: "completed";
      result: TResult;
    }>
  | Readonly<{
      status: "stopped";
      reason: Readonly<{
        code: "limit-reached" | "deadline-reached" | "cancelled" | "no-progress";
        message: string;
      }>;
      partial: PartialProgress;
      pendingOperationRefs: readonly string[];
    }>
  | Readonly<{
      status: "failed";
      error: Readonly<{ code: string; message: string }>;
      partial: PartialProgress;
      pendingOperationRefs: readonly string[];
    }>;
```

### `contracts/validation/ValidationResult.ts`

Represents a validated value or validation issues with paths, codes, and messages.

```typescript
export type ValidationResult<TValue> =
  | Readonly<{ valid: true; value: TValue }>
  | Readonly<{
      valid: false;
      issues: readonly Readonly<{
        path: readonly (string | number)[];
        code: string;
        message: string;
      }>[];
    }>;
```

### `errors/UnknownRegistrationError.ts`

Identifies an unknown registration with a stable code and safe message.

```typescript
export class UnknownRegistrationError extends Error {
  readonly code = "UNKNOWN_REGISTRATION";

  constructor(readonly registrationId: string) {
    super(`Unknown framework registration: ${registrationId}`);
    this.name = "UnknownRegistrationError";
  }
}
```

### `errors/PersistenceError.ts`

Identifies a persistence failure with a stable code and safe message.

```typescript
export class PersistenceError extends Error {
  readonly code = "PERSISTENCE_FAILED";

  constructor(message: string) {
    super(message);
    this.name = "PersistenceError";
  }
}
```

### `index.ts`

Re-exports the production interfaces, data types, and error classes from their owning files.

```typescript
export type { IPolicy } from "./contracts/IPolicy";
export type { IClock } from "./contracts/runtime/IClock";
export type { IIdGenerator } from "./contracts/runtime/IIdGenerator";
export type { ExecutionIdentity } from "./contracts/runtime/ExecutionIdentity";
export type { ExecutionScopeRef } from "./contracts/runtime/ExecutionScopeRef";
export type { IResultContract } from "./contracts/validation/IResultContract";
export type { ValidationResult } from "./contracts/validation/ValidationResult";
export type { PartialProgress } from "./contracts/outcomes/PartialProgress";
export type { ExecutionOutcome } from "./contracts/outcomes/ExecutionOutcome";
export type { IExecutor } from "./executors/contracts/IExecutor";
export type { IExecutionContext } from "./executors/contracts/IExecutionContext";
export type { IExecutionReporter } from "./executors/contracts/IExecutionReporter";
export { UnknownRegistrationError } from "./errors/UnknownRegistrationError";
export { PersistenceError } from "./errors/PersistenceError";
```

### `examples/shared-policy/SpecificationPolicyInput.ts`

Defines the example policy's goal, accepted findings, and source version.

```typescript
export type SpecificationPolicyInput = Readonly<{
  goal: string;
  acceptedFindings: readonly string[];
  sourceVersion: string;
}>;
```

### `examples/shared-policy/SpecificationAssignment.ts`

Defines the goal, selected findings, and source version returned by the example policy.

```typescript
export type SpecificationAssignment = Readonly<{
  goal: string;
  findings: readonly string[];
  sourceVersion: string;
}>;
```

### `examples/shared-policy/SpecificationInputPolicy.ts`

Creates a specification assignment while copying findings without mutating input.

```typescript
import type { IPolicy } from "../../index";
import type { SpecificationPolicyInput } from "./SpecificationPolicyInput";
import type { SpecificationAssignment } from "./SpecificationAssignment";

export class SpecificationInputPolicy
  implements IPolicy<SpecificationPolicyInput, SpecificationAssignment> {
  async apply(input: SpecificationPolicyInput): Promise<SpecificationAssignment> {
    return {
      goal: input.goal,
      findings: [...input.acceptedFindings],
      sourceVersion: input.sourceVersion,
    };
  }
}
```

### `examples/shared-policy/main.ts`

Constructs the example policy, applies it to fixture input, and prints the assignment.

```typescript
import { SpecificationInputPolicy } from "./SpecificationInputPolicy";

async function main(): Promise<void> {
  const policy = new SpecificationInputPolicy();
  const assignment = await policy.apply({
    goal: "Plan Google login while preserving password login.",
    acceptedFindings: ["Password login uses SessionService."],
    sourceVersion: "code-r4",
  });
  console.log(assignment);
}

void main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
```

### `tests/fakes/FixedClock.ts`

Returns a configured time for deterministic tests.

```typescript
import type { IClock } from "../../contracts/runtime/IClock";

export class FixedClock implements IClock {
  constructor(private readonly epochMs: number) {}

  nowEpochMs(): number {
    return this.epochMs;
  }
}
```

### `tests/fakes/SequenceIdGenerator.ts`

Returns supplied identifiers in order and fails explicitly when exhausted.

```typescript
import type { IIdGenerator } from "../../contracts/runtime/IIdGenerator";

export class SequenceIdGenerator implements IIdGenerator {
  private readonly ids: readonly string[];
  private cursor = 0;

  constructor(ids: readonly string[]) {
    this.ids = [...ids];
  }

  nextId(): string {
    const id = this.ids[this.cursor];
    if (id === undefined) {
      throw new Error("Test identifier sequence exhausted.");
    }
    this.cursor += 1;
    return id;
  }
}
```

### `tests/fakes/RecordingExecutionReporter.ts`

Collects progress messages for assertions.

```typescript
import type { IExecutionReporter } from "../../executors/contracts/IExecutionReporter";

export class RecordingExecutionReporter implements IExecutionReporter {
  private readonly messages: string[] = [];

  async progress(message: string): Promise<void> {
    this.messages.push(message);
  }

  snapshot(): readonly string[] {
    return [...this.messages];
  }
}
```

### `tests/fakes/FakeExecutor.ts`

Records input and context, then returns a configured outcome without external calls.

```typescript
import type { IExecutor } from "../../executors/contracts/IExecutor";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";

export class FakeExecutor<TInput, TResult>
  implements IExecutor<TInput, TResult> {
  private readonly received: Array<Readonly<{
    input: TInput;
    context: IExecutionContext;
  }>> = [];

  constructor(private readonly outcome: ExecutionOutcome<TResult>) {}

  async execute(
    input: TInput,
    context: IExecutionContext,
  ): Promise<ExecutionOutcome<TResult>> {
    this.received.push({ input, context });
    return this.outcome;
  }

  snapshot(): readonly Readonly<{
    input: TInput;
    context: IExecutionContext;
  }>[] {
    return [...this.received];
  }
}
```

### `tests/fakes/StringResultContract.ts`

Validates strings and rejects non-string values with explicit issues.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";

export class StringResultContract implements IResultContract<string> {
  readonly id = "test-string";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<string>> {
    if (typeof value !== "string") {
      return {
        valid: false,
        issues: [{ path: [], code: "expected-string", message: "Expected a string." }],
      };
    }
    return { valid: true, value };
  }
}
```

### `tests/fakes/EmptyFindingsPolicy.ts`

Returns an assignment with no optional findings to demonstrate interchangeable policies.

```typescript
import type { IPolicy } from "../../contracts/IPolicy";
import type { SpecificationPolicyInput } from "../../examples/shared-policy/SpecificationPolicyInput";
import type { SpecificationAssignment } from "../../examples/shared-policy/SpecificationAssignment";

export class EmptyFindingsPolicy
  implements IPolicy<SpecificationPolicyInput, SpecificationAssignment> {
  async apply(input: SpecificationPolicyInput): Promise<SpecificationAssignment> {
    return {
      goal: input.goal,
      findings: [],
      sourceVersion: input.sourceVersion,
    };
  }
}
```

### `tests/contracts/Policy.test.ts`

Verify interchangeable policy implementations, unchanged inputs, and preserved source versions.

```typescript
import type { IPolicy } from "../../contracts/IPolicy";
import type { SpecificationPolicyInput } from "../../examples/shared-policy/SpecificationPolicyInput";
import type { SpecificationAssignment } from "../../examples/shared-policy/SpecificationAssignment";
import { SpecificationInputPolicy } from "../../examples/shared-policy/SpecificationInputPolicy";
import { EmptyFindingsPolicy } from "../fakes/EmptyFindingsPolicy";

export async function verifyPolicies(): Promise<void> {
  const findings = Object.freeze(["SessionService creates sessions."]);
  const input: SpecificationPolicyInput = Object.freeze({
    goal: "Plan Google login.",
    acceptedFindings: findings,
    sourceVersion: "code-r4",
  });
  const policies: readonly IPolicy<SpecificationPolicyInput, SpecificationAssignment>[] = [
    new SpecificationInputPolicy(),
    new EmptyFindingsPolicy(),
  ];
  const copied = await policies[0].apply(input);
  const empty = await policies[1].apply(input);
  if (copied.findings === findings || copied.findings[0] !== findings[0]) {
    throw new Error("Policy must copy findings without changing their content.");
  }
  if (empty.findings.length !== 0 || findings.length !== 1) {
    throw new Error("Policy substitution must leave the input unchanged.");
  }
  if (copied.sourceVersion !== "code-r4" || empty.sourceVersion !== "code-r4") {
    throw new Error("Both policies must preserve source identity.");
  }
}
```

### `tests/contracts/Executor.test.ts`

Verify input/context delivery and completed, stopped, and failed fixture outcomes.

```typescript
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome";
import type { PartialProgress } from "../../contracts/outcomes/PartialProgress";
import { FakeExecutor } from "../fakes/FakeExecutor";
import { RecordingExecutionReporter } from "../fakes/RecordingExecutionReporter";

export async function verifyExecutorOutcomes(): Promise<void> {
  const context: IExecutionContext = {
    identity: { operationId: "op-1", runId: "run-1", stepRunId: "step-1" },
    scope: { scopeId: "scope-1", projectId: "fixture-project" },
    signal: new AbortController().signal,
    deadlineEpochMs: null,
    reporter: new RecordingExecutionReporter(),
  };
  const partial: PartialProgress = {
    summary: "Inspected session creation.",
    evidenceRefs: ["fixture:source/code-r4/session-service"],
    artifactRefs: [],
    unresolved: ["Session expiry not inspected."],
  };
  const outcomes: readonly ExecutionOutcome<string>[] = [
    { status: "completed", result: "Investigation report." },
    {
      status: "stopped",
      reason: { code: "limit-reached", message: "Iteration limit reached." },
      partial,
      pendingOperationRefs: [],
    },
    {
      status: "failed",
      error: { code: "FIXTURE_FAILURE", message: "Fixture operation failed." },
      partial,
      pendingOperationRefs: ["fixture:operation/uncertain-1"],
    },
  ];
  for (const outcome of outcomes) {
    const executor = new FakeExecutor<string, string>(outcome);
    const returned = await executor.execute("Investigate sessions.", context);
    const call = executor.snapshot()[0];
    if (returned !== outcome || call.input !== "Investigate sessions." || call.context !== context) {
      throw new Error("Executor must receive the input/context and return its configured envelope.");
    }
    // Data narrowing, not selection of interchangeable execution behavior.
    if (returned.status !== "completed" && returned.partial.unresolved.length !== 1) {
      throw new Error("Unsuccessful outcomes must retain unresolved work.");
    }
  }
}
```

### `tests/contracts/ResultContract.test.ts`

Verify acceptance of valid strings and rejection of invalid unknown values.

```typescript
import { StringResultContract } from "../fakes/StringResultContract";

export async function verifyValidation(): Promise<void> {
  const contract = new StringResultContract();
  const accepted = await contract.validate("A bounded report.");
  const rejected = await contract.validate({ report: "Not a string." });
  if (!accepted.valid || accepted.value !== "A bounded report.") {
    throw new Error("A valid string must retain its value.");
  }
  if (rejected.valid || rejected.issues[0].code !== "expected-string") {
    throw new Error("Non-string input must produce an explicit validation issue.");
  }
}
```

### `tests/unit/RuntimeDependencies.test.ts`

Verify deterministic clocks, identifier sequences, and recorded progress messages.

```typescript
import { FixedClock } from "../fakes/FixedClock";
import { SequenceIdGenerator } from "../fakes/SequenceIdGenerator";
import { RecordingExecutionReporter } from "../fakes/RecordingExecutionReporter";

export async function verifyRuntimeDependencies(): Promise<void> {
  const clock = new FixedClock(1000);
  if (clock.nowEpochMs() !== 1000 || clock.nowEpochMs() !== 1000) {
    throw new Error("The fixture clock must remain deterministic.");
  }
  const supplied = ["op-1", "op-2"];
  const ids = new SequenceIdGenerator(supplied);
  supplied[0] = "changed-after-construction";
  if (ids.nextId() !== "op-1" || ids.nextId() !== "op-2") {
    throw new Error("Identifiers must follow the copied fixture sequence.");
  }
  let exhausted = false;
  try {
    ids.nextId();
  } catch (error: unknown) {
    if (!(error instanceof Error) || error.message !== "Test identifier sequence exhausted.") {
      throw error;
    }
    exhausted = true;
  }
  if (!exhausted) throw new Error("Sequence exhaustion must be explicit.");

  const reporter = new RecordingExecutionReporter();
  await reporter.progress("Inspected session creation.");
  const snapshot = reporter.snapshot();
  await reporter.progress("Reached the iteration limit.");
  if (snapshot.length !== 1 || reporter.snapshot().length !== 2) {
    throw new Error("Reporter snapshots must not share the mutable internal array.");
  }
}
```

### `tests/unit/Errors.test.ts`

Verify direct `Error` inheritance, names, stable codes, and safe messages.

```typescript
import { UnknownRegistrationError } from "../../errors/UnknownRegistrationError";
import { PersistenceError } from "../../errors/PersistenceError";

export function verifyErrors(): void {
  const unknown = new UnknownRegistrationError("fixture-executor");
  const persistence = new PersistenceError("Could not save the fixture result.");
  if (!(unknown instanceof Error) || !(persistence instanceof Error)) {
    throw new Error("Custom errors must be Error instances.");
  }
  if (Object.getPrototypeOf(UnknownRegistrationError.prototype) !== Error.prototype ||
      Object.getPrototypeOf(PersistenceError.prototype) !== Error.prototype) {
    throw new Error("Custom errors must extend Error directly.");
  }
  if (unknown.name !== "UnknownRegistrationError" ||
      unknown.code !== "UNKNOWN_REGISTRATION" ||
      unknown.registrationId !== "fixture-executor" ||
      unknown.message !== "Unknown framework registration: fixture-executor") {
    throw new Error("Unknown-registration error metadata must remain stable.");
  }
  if (persistence.name !== "PersistenceError" ||
      persistence.code !== "PERSISTENCE_FAILED" ||
      persistence.message !== "Could not save the fixture result.") {
    throw new Error("Persistence error metadata must remain stable.");
  }
}
```

### `tests/contracts/PublicApi.compile.ts`

Imports the supported production declarations through `index.ts` and checks their types.

```typescript
import type {
  IPolicy, IClock, IIdGenerator, IResultContract,
  IExecutor, IExecutionContext, IExecutionReporter,
  ExecutionIdentity, ExecutionScopeRef, PartialProgress,
  ExecutionOutcome, ValidationResult,
} from "../../index";
import { UnknownRegistrationError, PersistenceError } from "../../index";

// Type-only fixture: no live resources or library operations are started.
export type PublicApiFixture = Readonly<{
  policy: IPolicy<string, number>;
  clock: IClock;
  ids: IIdGenerator;
  validator: IResultContract<string>;
  executor: IExecutor<string, string>;
  context: IExecutionContext;
  reporter: IExecutionReporter;
  identity: ExecutionIdentity;
  scope: ExecutionScopeRef;
  partial: PartialProgress;
  outcome: ExecutionOutcome<string>;
  validation: ValidationResult<string>;
  registrationError: InstanceType<typeof UnknownRegistrationError>;
  persistenceError: InstanceType<typeof PersistenceError>;
}>;
```

