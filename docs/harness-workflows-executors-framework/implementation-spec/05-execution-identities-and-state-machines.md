# 05. Execution Identities and State Machines

## What We Implement Here

Create validated execution identities and the in-memory lifecycle foundations for workflow runs, step runs, and agentic sessions. Define legal transitions, cancellation intent, pending-operation tracking, immutable snapshots, and compatible restoration. Add deterministic examples and tests; actual workflow execution, database concurrency, effect reconciliation, approval, and publication are implemented by their later owning components.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `errors/InvalidExecutionIdentityError.ts` | `class InvalidExecutionIdentityError extends Error` |
| `contracts/runtime/ExecutionIdentityContract.ts` | `class ExecutionIdentityContract implements IResultContract<ExecutionIdentity>` |
| `contracts/runtime/ExecutionIdentityFactory.ts` | `class ExecutionIdentityFactory` |
| `domain/lifecycle/ExecutionKind.ts` | `type ExecutionKind` |
| `domain/lifecycle/LifecycleStatus.ts` | `type LifecycleStatus` |
| `domain/lifecycle/LifecycleRules.ts` | `type LifecycleRules` |
| `domain/lifecycle/LifecycleDefinition.ts` | `class LifecycleDefinition` |
| `domain/lifecycle/workflowRunLifecycle.ts` | `const workflowRunLifecycle` |
| `domain/lifecycle/stepRunLifecycle.ts` | `const stepRunLifecycle` |
| `domain/lifecycle/agenticSessionLifecycle.ts` | `const agenticSessionLifecycle` |
| `domain/lifecycle/LifecycleEvidence.ts` | `type LifecycleEvidence` |
| `domain/lifecycle/LifecycleSnapshot.ts` | `type LifecycleSnapshot` |
| `domain/lifecycle/LifecycleSnapshotContract.ts` | `class LifecycleSnapshotContract implements IResultContract<LifecycleSnapshot>` |
| `errors/InvalidLifecycleTransitionError.ts` | `class InvalidLifecycleTransitionError extends Error` |
| `errors/InvalidLifecycleSnapshotError.ts` | `class InvalidLifecycleSnapshotError extends Error` |
| `domain/lifecycle/ExecutionLifecycle.ts` | `class ExecutionLifecycle` |
| `tests/runtime/ExecutionIdentity.test.ts` | `Identity creation and validation checks` |
| `tests/domain/ExecutionLifecycle.test.ts` | `Lifecycle transition checks` |
| `tests/domain/LifecycleRestoration.test.ts` | `Snapshot restoration checks` |
| `examples/lifecycle/main.ts` | `async function main()` |
| `index.ts` | `Additional explicit type and value exports` |
| `tests/contracts/LifecycleApi.compile.ts` | `Compile-only lifecycle API fixture` |


## Rules Specific to These Files

General OOP and file conventions remain in [01](01-scope-and-implementation-roadmap.md). Reuse [03](03-core-contracts-and-shared-policy.md) contracts and [04](04-configuration-and-dependency-injection.md) configuration/error support. The snippets add files; do not duplicate those existing declarations.

| File or concept | Required rules |
| --- | --- |
| ExecutionIdentity | Keep the page-03 data shape. Workflow-backed steps require runId; direct sessions may omit run/step IDs. Child sessions retain selected run/step ancestry, receive a fresh sessionId, and link to the parent's operation. IDs identify work, not authority or proof that work ran. |
| ExecutionIdentityContract | Validate decoded data before using it. Require nonempty strings, reject unknown or explicitly undefined fields, require runId when stepRunId exists, and reject self-parenting. This structural check cannot detect an ancestor cycle, a forged project scope, an unrecorded parent, or cross-run linkage; later trusted records must establish those relationships. |
| ExecutionIdentityFactory | The injected generator must provide suitably unique IDs for the intended execution scope. The example generator is not production-safe uniqueness. A new step execution/fix gets a new stepRunId. New attempts/model/tool calls get new operation IDs under the existing step/session. Redelivery of the same admitted operation reuses its recorded ID instead of calling the factory again. Attempt counters and durable redelivery are later runner/store responsibilities. |
| Lifecycle definitions | The three profiles are versioned immutable transition graphs, not workflow process graphs. LifecycleDefinition copies nested arrays and transition data. It does not select interchangeable execution behavior by status; ordinary state guards check invariants. Changing the published graph requires compatibility handling rather than silently loading old snapshots under new rules. |
| ExecutionLifecycle | This is a shared local state component, not WorkflowEngine, WorkflowRun, StepRun, or AgenticSession itself. Those later aggregate classes own a private lifecycle and enforce their domain-specific invariants. No public writable status field or arbitrary state setter is exposed. |
| Completion evidence | A local completed transition needs an acceptedResultRef and no pending operations. A paused run needs a checkpointRef; waiting-for-approval needs a proposalRef. These are references supplied by trusted coordinators, not factual verification. Later aggregate owners must enforce actual required checks, source/proposal matching, durability, and publication receipts before calling the transition. |
| Pending operations | Register pending work before dispatch in the later runtime. Duplicate pending reference recording is idempotent locally. Interrupted/recovering state preserves references; do not terminate, retry, pause, wait for approval, or resume from recovery while incompatible effects remain pending. Removing a reference is a trusted record of reconciliation, not the reconciliation algorithm. |
| Cancellation | requestCancellation records intent and moves to stopping. It does not prove a remote action stopped. cancelled requires no pending operations. With cancellation intent set, only stopping/recovering/cancelled/failed are supported; no return to active or completed. A failure after cancellation remains explicit. Terminal executions are never revived automatically. |
| Stopped and failed | Terminal status says work ended; it does not erase file changes or prove no effects. PartialProgress and ExecutionOutcome remain the page-03 outcome records saved by later owners, rather than being duplicated inside this lifecycle snapshot. A stopped child still supplies partial evidence to its parent under runtime acceptance rules. |
| Snapshots | Return frozen state and nested reference collections. Restore from validated decoded data of the exact schema, lifecycle kind, and graph version; do not infer status from logs or coerce incompatible data. Snapshots do not serialize live clients, AbortSignal, credentials, notebook contents, private reasoning, or the entire workflow result. |
| Revision | Increment the local revision on each effective mutation. Invalid transitions leave it unchanged; already-recorded pending operations and repeated cancellation intent do not increment it. This is not database compare-and-set, a distributed lease, or command deduplication across workers. Spec 06 must enforce expected revision atomically; spec 24 reconciles crashes and uncertain effects. |
| Error classes | All three errors extend built-in Error directly and live in their own root errors/ files. Unknown data is rejected through ValidationResult; restore/factory/transition boundaries raise the appropriate named error. Do not silently restart a rejected snapshot or normalize every error into success. |
| Resource limits and control | State transitions do not reserve tokens, extend a deadline, release an editing gate, grant permissions, or perform tool calls. Runtime control and the workspace scheduler remain responsible. A completed child does not complete its parent, and separate lifecycle instances do not isolate shared files. |
| Later execution owners | Full WorkflowRun/StepRun behavior is delivered with workflow execution, and full AgenticSession with spec 19. Publication's lifecycle belongs to spec 26, not these profiles. Queue admission, retries, checkpoints, notebooks, approval handling, budget enforcement, and event recording are not simulated as completed capabilities here. |
| Examples and tests | IDs and references are fixture values. Example reconciliation is explicitly supplied by fixture code, not evidence of a real write. Runtime check functions must be invoked by the selected test runner; LifecycleApi.compile.ts is compile-only. Passing these checks establishes local state rules, not durable recovery or safe publication. |
| Public API | Append index.ts exports to those from previous phases. Reuse page-03 IResultContract, IIdGenerator, ExecutionIdentity, and ValidationResult. Do not create a generic state-machine interface that duplicates IPolicy or a second workflow engine. |

## TypeScript Code for Each File

Each heading below is a separate file. Reuse page 03 and 04 dependencies; the index.ts snippet is additive. Types and state objects shown here describe the foundation, while later owners enforce external evidence and persistence guarantees.

### `errors/InvalidExecutionIdentityError.ts`

Reports malformed identity data or an invalid parent/child identity relationship.

```typescript
export class InvalidExecutionIdentityError extends Error {
  readonly code = "INVALID_EXECUTION_IDENTITY";
  constructor(message: string) {
    super(message);
    this.name = "InvalidExecutionIdentityError";
  }
}
```

### `contracts/runtime/ExecutionIdentityContract.ts`

Checks unknown identity data before factories or restoration consumers use it.

```typescript
import type { IResultContract } from "../validation/IResultContract";
import type { ValidationResult } from "../validation/ValidationResult";
import type { ExecutionIdentity } from "./ExecutionIdentity";

export class ExecutionIdentityContract implements IResultContract<ExecutionIdentity> {
  readonly id = "execution-identity";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<ExecutionIdentity>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return this.invalid("Expected identity data.");
    }
    const data = value as Record<string, unknown>;
    const keys = ["operationId", "runId", "stepRunId", "sessionId", "parentOperationId"];
    if (Object.keys(data).some(key => !keys.includes(key)) ||
        !this.isId(data.operationId) ||
        keys.slice(1).some(key => key in data && !this.isId(data[key]))) {
      return this.invalid("Identity fields must be supported nonempty identifiers.");
    }
    if ((data.stepRunId !== undefined && data.runId === undefined) ||
        data.parentOperationId === data.operationId) {
      return this.invalid("Invalid identity relationship.");
    }
    return { valid: true, value: Object.freeze({ ...data }) as ExecutionIdentity };
  }

  private isId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private invalid(message: string): ValidationResult<ExecutionIdentity> {
    return { valid: false, issues: [{ path: [], code: "invalid-identity", message }] };
  }
}
```

### `contracts/runtime/ExecutionIdentityFactory.ts`

Creates distinct run, step, session, and child-operation identities using the injected ID generator.

```typescript
import type { IIdGenerator } from "./IIdGenerator";
import type { IResultContract } from "../validation/IResultContract";
import type { ExecutionIdentity } from "./ExecutionIdentity";
import { InvalidExecutionIdentityError } from "../../errors/InvalidExecutionIdentityError";

export class ExecutionIdentityFactory {
  constructor(
    private readonly ids: IIdGenerator,
    private readonly contract: IResultContract<ExecutionIdentity>,
  ) {}

  async createRun(): Promise<ExecutionIdentity> {
    return this.checked({ operationId: this.ids.nextId(), runId: this.ids.nextId() });
  }

  async createStep(parent: ExecutionIdentity): Promise<ExecutionIdentity> {
    const run = await this.checked(parent);
    if (run.runId === undefined || run.stepRunId !== undefined || run.sessionId !== undefined) {
      throw new InvalidExecutionIdentityError("A step requires a workflow-run parent identity.");
    }
    return this.checked({
      operationId: this.ids.nextId(), runId: run.runId,
      stepRunId: this.ids.nextId(), parentOperationId: run.operationId,
    });
  }

  async createSession(parent?: ExecutionIdentity): Promise<ExecutionIdentity> {
    const owner = parent === undefined ? undefined : await this.checked(parent);
    return this.checked({
      ...(owner === undefined ? {} : owner),
      operationId: this.ids.nextId(), sessionId: this.ids.nextId(),
      ...(owner === undefined ? {} : { parentOperationId: owner.operationId }),
    });
  }

  async createOperation(parent: ExecutionIdentity): Promise<ExecutionIdentity> {
    const owner = await this.checked(parent);
    return this.checked({ ...owner, operationId: this.ids.nextId(), parentOperationId: owner.operationId });
  }

  private async checked(value: unknown): Promise<ExecutionIdentity> {
    const validated = await this.contract.validate(value);
    if (!validated.valid) throw new InvalidExecutionIdentityError("Identity validation failed.");
    return validated.value;
  }
}
```

### `domain/lifecycle/ExecutionKind.ts`

Identifies the owner of a lifecycle without choosing a provider or executor implementation.

```typescript
export type ExecutionKind = "workflow-run" | "step-run" | "agentic-session";
```

### `domain/lifecycle/LifecycleStatus.ts`

Defines the supported status vocabulary; each lifecycle profile allows only its own subset.

```typescript
export type LifecycleStatus =
  | "created" | "queued" | "active" | "retry-wait" | "waiting-for-approval"
  | "paused" | "interrupted" | "recovering" | "stopping"
  | "completed" | "failed" | "stopped" | "cancelled";
```

### `domain/lifecycle/LifecycleRules.ts`

Describes an immutable versioned lifecycle graph and its terminal states.

```typescript
import type { ExecutionKind } from "./ExecutionKind";
import type { LifecycleStatus } from "./LifecycleStatus";

export type LifecycleRules = Readonly<{
  kind: ExecutionKind;
  version: string;
  initial: LifecycleStatus;
  states: readonly LifecycleStatus[];
  terminal: readonly LifecycleStatus[];
  transitions: Readonly<Partial<Record<LifecycleStatus, readonly LifecycleStatus[]>>>;
}>;
```

### `domain/lifecycle/LifecycleDefinition.ts`

Validates and copies lifecycle rules, exposing graph queries without permitting callers to mutate the graph.

```typescript
import type { LifecycleRules } from "./LifecycleRules";
import type { LifecycleStatus } from "./LifecycleStatus";
import type { ExecutionKind } from "./ExecutionKind";
import { ConfigurationError } from "../../errors/ConfigurationError";

export class LifecycleDefinition {
  private readonly rules: LifecycleRules;

  constructor(rules: LifecycleRules) {
    const known: readonly LifecycleStatus[] = [
      "created", "queued", "active", "retry-wait", "waiting-for-approval", "paused",
      "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled",
    ];
    if (!["workflow-run", "step-run", "agentic-session"].includes(rules.kind) ||
        !rules.version.trim() || !rules.states.includes(rules.initial) ||
        rules.states.some(state => !known.includes(state)) ||
        new Set(rules.states).size !== rules.states.length ||
        rules.terminal.some(state => !rules.states.includes(state)) ||
        rules.terminal.includes(rules.initial)) {
      throw new ConfigurationError("Invalid lifecycle definition.");
    }
    const transitions: Partial<Record<LifecycleStatus, readonly LifecycleStatus[]>> = {};
    for (const key of Object.keys(rules.transitions)) {
      const from = key as LifecycleStatus;
      const targets = rules.transitions[from] ?? [];
      if (!rules.states.includes(from) || targets.some(to => !rules.states.includes(to)) ||
          (rules.terminal.includes(from) && targets.length > 0)) {
        throw new ConfigurationError("Invalid lifecycle transition graph.");
      }
      transitions[from] = Object.freeze([...targets]);
    }
    this.rules = Object.freeze({
      ...rules, states: Object.freeze([...rules.states]), terminal: Object.freeze([...rules.terminal]),
      transitions: Object.freeze(transitions),
    });
  }

  get kind(): ExecutionKind { return this.rules.kind; }
  get version(): string { return this.rules.version; }
  get initial(): LifecycleStatus { return this.rules.initial; }
  hasStatus(status: LifecycleStatus): boolean { return this.rules.states.includes(status); }
  isTerminal(status: LifecycleStatus): boolean { return this.rules.terminal.includes(status); }
  allows(from: LifecycleStatus, to: LifecycleStatus): boolean {
    return this.rules.transitions[from]?.includes(to) ?? false;
  }
}
```

### `domain/lifecycle/workflowRunLifecycle.ts`

Defines the version-1 workflow-run lifecycle graph as validated immutable data.

```typescript
import { LifecycleDefinition } from "./LifecycleDefinition";

export const workflowRunLifecycle = new LifecycleDefinition({
  kind: "workflow-run",
  version: "1",
  initial: "created",
  states: ["created", "queued", "active", "waiting-for-approval", "paused", "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled"],
  terminal: ["completed", "failed", "stopped", "cancelled"],
  transitions: {
    "created": ["queued", "active", "stopping", "failed"],
    "queued": ["active", "stopping", "failed"],
    "active": ["waiting-for-approval", "paused", "interrupted", "stopping", "completed", "failed", "stopped"],
    "waiting-for-approval": ["active", "paused", "interrupted", "stopping", "failed", "stopped"],
    "paused": ["active", "interrupted", "stopping", "failed", "stopped"],
    "interrupted": ["recovering", "stopping"],
    "recovering": ["active", "stopping", "failed", "stopped"],
    "stopping": ["recovering", "cancelled", "failed", "stopped"],
  },
});
```

### `domain/lifecycle/stepRunLifecycle.ts`

Defines the version-1 step-run lifecycle graph as validated immutable data.

```typescript
import { LifecycleDefinition } from "./LifecycleDefinition";

export const stepRunLifecycle = new LifecycleDefinition({
  kind: "step-run",
  version: "1",
  initial: "created",
  states: ["created", "active", "retry-wait", "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled"],
  terminal: ["completed", "failed", "stopped", "cancelled"],
  transitions: {
    "created": ["active", "stopping", "failed"],
    "active": ["retry-wait", "interrupted", "stopping", "completed", "failed", "stopped"],
    "retry-wait": ["active", "interrupted", "stopping", "failed", "stopped"],
    "interrupted": ["recovering", "stopping"],
    "recovering": ["active", "stopping", "failed", "stopped"],
    "stopping": ["recovering", "cancelled", "failed", "stopped"],
  },
});
```

### `domain/lifecycle/agenticSessionLifecycle.ts`

Defines the version-1 agentic-session lifecycle graph as validated immutable data.

```typescript
import { LifecycleDefinition } from "./LifecycleDefinition";

export const agenticSessionLifecycle = new LifecycleDefinition({
  kind: "agentic-session",
  version: "1",
  initial: "created",
  states: ["created", "active", "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled"],
  terminal: ["completed", "failed", "stopped", "cancelled"],
  transitions: {
    "created": ["active", "stopping", "failed"],
    "active": ["interrupted", "stopping", "completed", "failed", "stopped"],
    "interrupted": ["recovering", "stopping"],
    "recovering": ["active", "stopping", "failed", "stopped"],
    "stopping": ["recovering", "cancelled", "failed", "stopped"],
  },
});
```

### `domain/lifecycle/LifecycleEvidence.ts`

Carries accepted-result, checkpoint, or proposal references supplied by the owning trusted coordinator.

```typescript
export type LifecycleEvidence = Readonly<{
  acceptedResultRef?: string;
  checkpointRef?: string;
  proposalRef?: string;
}>;
```

### `domain/lifecycle/LifecycleSnapshot.ts`

Captures serializable lifecycle state, revision, cancellation intent, pending operations, and evidence references.

```typescript
import type { ExecutionKind } from "./ExecutionKind";
import type { LifecycleStatus } from "./LifecycleStatus";
import type { LifecycleEvidence } from "./LifecycleEvidence";

export type LifecycleSnapshot = Readonly<{
  schemaVersion: 1;
  kind: ExecutionKind;
  definitionVersion: string;
  executionId: string;
  status: LifecycleStatus;
  revision: number;
  cancellationRequested: boolean;
  pendingOperationRefs: readonly string[];
  evidence: LifecycleEvidence;
}>;
```

### `domain/lifecycle/LifecycleSnapshotContract.ts`

Validates unknown snapshots against the selected graph and rejects inconsistent terminal or cancellation state.

```typescript
import type { IResultContract } from "../../contracts/validation/IResultContract";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { LifecycleSnapshot } from "./LifecycleSnapshot";
import type { LifecycleStatus } from "./LifecycleStatus";
import { LifecycleDefinition } from "./LifecycleDefinition";

export class LifecycleSnapshotContract implements IResultContract<LifecycleSnapshot> {
  readonly id = "lifecycle-snapshot";
  readonly version = "1";
  constructor(private readonly definition: LifecycleDefinition) {}

  async validate(value: unknown): Promise<ValidationResult<LifecycleSnapshot>> {
    if (!this.record(value)) return this.invalid();
    const keys = ["schemaVersion", "kind", "definitionVersion", "executionId", "status", "revision",
      "cancellationRequested", "pendingOperationRefs", "evidence"];
    if (Object.keys(value).some(key => !keys.includes(key)) || value.schemaVersion !== 1 ||
        value.kind !== this.definition.kind || value.definitionVersion !== this.definition.version ||
        !this.reference(value.executionId) || typeof value.status !== "string" ||
        !this.definition.hasStatus(value.status as LifecycleStatus) ||
        typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
        typeof value.cancellationRequested !== "boolean" || !Array.isArray(value.pendingOperationRefs) ||
        !value.pendingOperationRefs.every(ref => this.reference(ref)) ||
        new Set(value.pendingOperationRefs).size !== value.pendingOperationRefs.length ||
        !this.record(value.evidence)) return this.invalid();
    const evidence = value.evidence;
    const allowedEvidence = ["acceptedResultRef", "checkpointRef", "proposalRef"];
    if (Object.keys(evidence).some(key => !allowedEvidence.includes(key) || !this.reference(evidence[key]))) {
      return this.invalid();
    }
    const status = value.status as LifecycleStatus;
    if ((this.definition.isTerminal(status) && value.pendingOperationRefs.length > 0) ||
        (["created", "queued", "paused", "retry-wait", "waiting-for-approval"].includes(status) && value.pendingOperationRefs.length > 0) ||
        (status === "completed" && !this.reference(evidence.acceptedResultRef)) ||
        (status === "paused" && !this.reference(evidence.checkpointRef)) ||
        (status === "waiting-for-approval" && !this.reference(evidence.proposalRef)) ||
        (status === "cancelled" && !value.cancellationRequested) ||
        (value.cancellationRequested && !["stopping", "recovering", "cancelled", "failed"].includes(status))) {
      return this.invalid();
    }
    // Every field was checked above before constructing this typed snapshot.
    return { valid: true, value: Object.freeze({
      schemaVersion: 1, kind: this.definition.kind, definitionVersion: this.definition.version,
      executionId: value.executionId, status, revision: value.revision,
      cancellationRequested: value.cancellationRequested,
      pendingOperationRefs: Object.freeze([...value.pendingOperationRefs]),
      evidence: Object.freeze({ ...evidence }),
    }) };
  }

  private record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  private reference(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
  private invalid(): ValidationResult<LifecycleSnapshot> {
    return { valid: false, issues: [{ path: [], code: "invalid-lifecycle-snapshot", message: "Incompatible or inconsistent lifecycle snapshot." }] };
  }
}
```

### `errors/InvalidLifecycleTransitionError.ts`

Reports a forbidden lifecycle change or an unmet local transition invariant.

```typescript
export class InvalidLifecycleTransitionError extends Error {
  readonly code = "INVALID_LIFECYCLE_TRANSITION";
  constructor(message: string) {
    super(message);
    this.name = "InvalidLifecycleTransitionError";
  }
}
```

### `errors/InvalidLifecycleSnapshotError.ts`

Reports rejected restoration data without coercing it into a valid state.

```typescript
export class InvalidLifecycleSnapshotError extends Error {
  readonly code = "INVALID_LIFECYCLE_SNAPSHOT";
  constructor(message: string) {
    super(message);
    this.name = "InvalidLifecycleSnapshotError";
  }
}
```

### `domain/lifecycle/ExecutionLifecycle.ts`

Owns local lifecycle transitions, revision changes, pending-operation bookkeeping, cancellation intent, and validated restoration.

```typescript
import { LifecycleDefinition } from "./LifecycleDefinition";
import { LifecycleSnapshotContract } from "./LifecycleSnapshotContract";
import type { LifecycleSnapshot } from "./LifecycleSnapshot";
import type { LifecycleStatus } from "./LifecycleStatus";
import type { LifecycleEvidence } from "./LifecycleEvidence";
import { InvalidLifecycleTransitionError } from "../../errors/InvalidLifecycleTransitionError";
import { InvalidLifecycleSnapshotError } from "../../errors/InvalidLifecycleSnapshotError";

export class ExecutionLifecycle {
  private constructor(
    private readonly definition: LifecycleDefinition,
    private state: LifecycleSnapshot,
  ) {}

  static create(definition: LifecycleDefinition, executionId: string): ExecutionLifecycle {
    if (typeof executionId !== "string" || !executionId.trim()) {
      throw new InvalidLifecycleSnapshotError("Expected an execution identifier.");
    }
    return new ExecutionLifecycle(definition, Object.freeze({
      schemaVersion: 1, kind: definition.kind, definitionVersion: definition.version,
      executionId, status: definition.initial, revision: 0, cancellationRequested: false,
      pendingOperationRefs: Object.freeze([]), evidence: Object.freeze({}),
    }));
  }

  static async restore(definition: LifecycleDefinition, data: unknown): Promise<ExecutionLifecycle> {
    const checked = await new LifecycleSnapshotContract(definition).validate(data);
    if (!checked.valid) throw new InvalidLifecycleSnapshotError("Snapshot restoration rejected.");
    return new ExecutionLifecycle(definition, checked.value);
  }

  snapshot(): LifecycleSnapshot { return this.state; }

  transition(to: LifecycleStatus, evidence: LifecycleEvidence = {}): void {
    this.move(to, evidence, this.state.cancellationRequested);
  }

  requestCancellation(): void {
    if (this.state.cancellationRequested) return;
    this.move("stopping", {}, true);
  }

  recordPendingOperation(reference: string): void {
    if (this.state.status !== "active" || this.state.cancellationRequested || !this.reference(reference)) {
      throw new InvalidLifecycleTransitionError("Cannot admit pending work in this state.");
    }
    if (this.state.pendingOperationRefs.includes(reference)) return;
    this.commit({ ...this.state, pendingOperationRefs: Object.freeze([...this.state.pendingOperationRefs, reference]) });
  }

  recordReconciledOperation(reference: string): void {
    if (!this.state.pendingOperationRefs.includes(reference)) {
      throw new InvalidLifecycleTransitionError("Unknown pending operation.");
    }
    // Only the owning coordinator may call this after establishing actual effects/usage.
    this.commit({ ...this.state, pendingOperationRefs: Object.freeze(
      this.state.pendingOperationRefs.filter(ref => ref !== reference),
    ) });
  }

  private move(to: LifecycleStatus, evidence: LifecycleEvidence, cancellationRequested: boolean): void {
    if (!this.definition.allows(this.state.status, to)) {
      throw new InvalidLifecycleTransitionError("Transition is not allowed by this lifecycle.");
    }
    if (Object.keys(evidence).some(key => !["acceptedResultRef", "checkpointRef", "proposalRef"].includes(key)) ||
        Object.values(evidence).some(value => !this.reference(value))) {
      throw new InvalidLifecycleTransitionError("Invalid evidence reference.");
    }
    const merged = Object.freeze({ ...this.state.evidence, ...evidence });
    if ((this.definition.isTerminal(to) && this.state.pendingOperationRefs.length > 0) ||
        (["completed", "paused", "waiting-for-approval", "retry-wait"].includes(to) && this.state.pendingOperationRefs.length > 0) ||
        (to === "active" && this.state.status === "recovering" && this.state.pendingOperationRefs.length > 0) ||
        (to === "completed" && !merged.acceptedResultRef) ||
        (to === "paused" && !merged.checkpointRef) ||
        (to === "waiting-for-approval" && !merged.proposalRef) ||
        (to === "cancelled" && !cancellationRequested) ||
        (cancellationRequested && !["stopping", "recovering", "cancelled", "failed"].includes(to))) {
      throw new InvalidLifecycleTransitionError("Required lifecycle evidence or reconciliation is missing.");
    }
    this.commit({ ...this.state, status: to, evidence: merged, cancellationRequested });
  }

  private commit(next: LifecycleSnapshot): void {
    if (!Number.isSafeInteger(this.state.revision + 1)) {
      throw new InvalidLifecycleTransitionError("Lifecycle revision exhausted.");
    }
    this.state = Object.freeze({ ...next, revision: this.state.revision + 1 });
  }

  private reference(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }
}
```

### `tests/runtime/ExecutionIdentity.test.ts`

Checks parent links, independent child sessions, direct sessions, and invalid parent identities.

```typescript
import { ExecutionIdentityFactory } from "../../contracts/runtime/ExecutionIdentityFactory";
import { ExecutionIdentityContract } from "../../contracts/runtime/ExecutionIdentityContract";
import { InvalidExecutionIdentityError } from "../../errors/InvalidExecutionIdentityError";
import { SequenceIdGenerator } from "../fakes/SequenceIdGenerator";

export async function verifyIdentities(): Promise<void> {
  const contract = new ExecutionIdentityContract();
  const factory = new ExecutionIdentityFactory(new SequenceIdGenerator(
    Array.from({ length: 30 }, (_, i) => `fixture-${i + 1}`),
  ), contract);
  const run = await factory.createRun();
  const step = await factory.createStep(run);
  const parent = await factory.createSession(step);
  const child = await factory.createSession(parent);
  const operation = await factory.createOperation(child);
  const direct = await factory.createSession();
  if (step.runId !== run.runId || step.parentOperationId !== run.operationId ||
      child.sessionId === parent.sessionId || child.stepRunId !== step.stepRunId ||
      child.parentOperationId !== parent.operationId || operation.sessionId !== child.sessionId ||
      operation.parentOperationId !== child.operationId || direct.runId !== undefined) {
    throw new Error("Identity linkage was not preserved.");
  }
  for (const invalid of [{ operationId: "" }, { operationId: "x", parentOperationId: "x" },
    { operationId: "x", stepRunId: "step-without-run" }, { operationId: "x", unknown: true }]) {
    if ((await contract.validate(invalid)).valid) throw new Error("Invalid identity accepted.");
  }
  let rejected = false;
  try { await factory.createStep(parent); }
  catch (error: unknown) {
    if (!(error instanceof InvalidExecutionIdentityError)) throw error;
    rejected = true;
  }
  if (!rejected) throw new Error("A step must not become another workflow-run parent.");
}
```

### `tests/domain/ExecutionLifecycle.test.ts`

Checks valid and invalid transitions, revision changes, pending-operation guards, cancellation, and terminal immutability.

```typescript
import { ExecutionLifecycle } from "../../domain/lifecycle/ExecutionLifecycle";
import { workflowRunLifecycle } from "../../domain/lifecycle/workflowRunLifecycle";
import { stepRunLifecycle } from "../../domain/lifecycle/stepRunLifecycle";
import { agenticSessionLifecycle } from "../../domain/lifecycle/agenticSessionLifecycle";
import { InvalidLifecycleTransitionError } from "../../errors/InvalidLifecycleTransitionError";

export function verifyLifecycles(): void {
  for (const definition of [workflowRunLifecycle, stepRunLifecycle, agenticSessionLifecycle]) {
    const life = ExecutionLifecycle.create(definition, `fixture-${definition.kind}`);
    const before = life.snapshot();
    let rejected = false;
    try { life.transition("completed", { acceptedResultRef: "fixture:result/1" }); }
    catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleTransitionError)) throw error;
      rejected = true;
    }
    if (!rejected || life.snapshot() !== before) throw new Error("Invalid transition mutated state.");
    life.transition("active");
    life.recordPendingOperation("fixture:operation/write-1");
    life.requestCancellation();
    if (life.snapshot().status !== "stopping") throw new Error("Cancellation must first record intent.");
    rejected = false;
    try { life.transition("cancelled"); }
    catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleTransitionError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Pending effects must block terminal cancellation.");
    life.recordReconciledOperation("fixture:operation/write-1");
    life.transition("cancelled");
    if (life.snapshot().revision !== 5 || !Object.isFrozen(life.snapshot().pendingOperationRefs)) {
      throw new Error("Lifecycle revisions and snapshot isolation must be preserved.");
    }
    rejected = false;
    try { life.transition("active"); }
    catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleTransitionError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Terminal history must not be revived.");
  }
  const completed = ExecutionLifecycle.create(stepRunLifecycle, "step-completed");
  completed.transition("active");
  completed.transition("completed", { acceptedResultRef: "fixture:accepted-result/1" });
  if (completed.snapshot().status !== "completed") throw new Error("Valid completion failed.");
}
```

### `tests/domain/LifecycleRestoration.test.ts`

Checks exact restoration, graph/version mismatch, inconsistent snapshots, and preserved pending operations.

```typescript
import { ExecutionLifecycle } from "../../domain/lifecycle/ExecutionLifecycle";
import { workflowRunLifecycle } from "../../domain/lifecycle/workflowRunLifecycle";
import { stepRunLifecycle } from "../../domain/lifecycle/stepRunLifecycle";
import { InvalidLifecycleSnapshotError } from "../../errors/InvalidLifecycleSnapshotError";

export async function verifyRestoration(): Promise<void> {
  const life = ExecutionLifecycle.create(workflowRunLifecycle, "run-restore");
  life.transition("active");
  life.recordPendingOperation("fixture:operation/unknown-write");
  life.transition("interrupted");
  const saved = JSON.parse(JSON.stringify(life.snapshot()));
  const restored = await ExecutionLifecycle.restore(workflowRunLifecycle, saved);
  if (JSON.stringify(restored.snapshot()) !== JSON.stringify(saved)) {
    throw new Error("Restoration must preserve status, references, and revision.");
  }
  restored.transition("recovering");
  restored.recordReconciledOperation("fixture:operation/unknown-write");
  restored.transition("active");
  for (const invalid of [
    { ...saved, schemaVersion: 2 }, { ...saved, definitionVersion: "unknown" },
    { ...saved, revision: -1 }, { ...saved, status: "completed" },
    { ...saved, status: "paused", evidence: { checkpointRef: "fixture:checkpoint/1" } },
    { ...saved, status: "created" },
    { ...saved, cancellationRequested: true },
    { ...saved, pendingOperationRefs: ["duplicate", "duplicate"] },
  ]) {
    let rejected = false;
    try { await ExecutionLifecycle.restore(workflowRunLifecycle, invalid); }
    catch (error: unknown) {
      if (!(error instanceof InvalidLifecycleSnapshotError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Inconsistent restoration must be rejected.");
  }
  let incompatible = false;
  try { await ExecutionLifecycle.restore(stepRunLifecycle, saved); }
  catch (error: unknown) {
    if (!(error instanceof InvalidLifecycleSnapshotError)) throw error;
    incompatible = true;
  }
  if (!incompatible) throw new Error("Snapshot owner kind must match.");
}
```

### `examples/lifecycle/main.ts`

Creates a run/step/session identity chain and shows interruption, restoration, and reconciliation using fixture references.

```typescript
import {
  ExecutionIdentityContract, ExecutionIdentityFactory, ExecutionLifecycle,
  agenticSessionLifecycle,
} from "../../index";
import { ExampleIdGenerator } from "../configuration/ExampleIdGenerator";

async function main(): Promise<void> {
  const identities = new ExecutionIdentityFactory(new ExampleIdGenerator(), new ExecutionIdentityContract());
  const run = await identities.createRun();
  const step = await identities.createStep(run);
  const session = await identities.createSession(step);
  const operation = await identities.createOperation(session);
  if (session.sessionId === undefined) throw new Error("Expected a session identity.");
  const lifecycle = ExecutionLifecycle.create(agenticSessionLifecycle, session.sessionId);
  lifecycle.transition("active");
  lifecycle.recordPendingOperation(operation.operationId);
  lifecycle.transition("interrupted");
  const serialized = JSON.stringify(lifecycle.snapshot());
  const restored = await ExecutionLifecycle.restore(agenticSessionLifecycle, JSON.parse(serialized));
  restored.transition("recovering");
  // Fixture only: in production a coordinator first establishes actual effects/usage.
  restored.recordReconciledOperation(operation.operationId);
  restored.transition("active");
  restored.transition("stopped");
  console.log({ run, step, session, lifecycle: restored.snapshot() });
}

void main().catch((error: unknown) => { console.error(error); throw error; });
```

### `index.ts`

Adds lifecycle and identity exports without replacing page 03 or page 04 exports.

```typescript
export { ExecutionIdentityContract } from "./contracts/runtime/ExecutionIdentityContract";
export { ExecutionIdentityFactory } from "./contracts/runtime/ExecutionIdentityFactory";
export type { ExecutionKind } from "./domain/lifecycle/ExecutionKind";
export type { LifecycleStatus } from "./domain/lifecycle/LifecycleStatus";
export type { LifecycleRules } from "./domain/lifecycle/LifecycleRules";
export type { LifecycleEvidence } from "./domain/lifecycle/LifecycleEvidence";
export type { LifecycleSnapshot } from "./domain/lifecycle/LifecycleSnapshot";
export { LifecycleDefinition } from "./domain/lifecycle/LifecycleDefinition";
export { LifecycleSnapshotContract } from "./domain/lifecycle/LifecycleSnapshotContract";
export { ExecutionLifecycle } from "./domain/lifecycle/ExecutionLifecycle";
export { workflowRunLifecycle } from "./domain/lifecycle/workflowRunLifecycle";
export { stepRunLifecycle } from "./domain/lifecycle/stepRunLifecycle";
export { agenticSessionLifecycle } from "./domain/lifecycle/agenticSessionLifecycle";
export { InvalidExecutionIdentityError } from "./errors/InvalidExecutionIdentityError";
export { InvalidLifecycleTransitionError } from "./errors/InvalidLifecycleTransitionError";
export { InvalidLifecycleSnapshotError } from "./errors/InvalidLifecycleSnapshotError";
```

### `tests/contracts/LifecycleApi.compile.ts`

Checks public type and value exports without starting execution.

```typescript
import type {
  ExecutionKind, LifecycleStatus, LifecycleRules, LifecycleEvidence, LifecycleSnapshot,
} from "../../index";
import {
  ExecutionIdentityContract, ExecutionIdentityFactory, ExecutionLifecycle,
  LifecycleDefinition, LifecycleSnapshotContract, workflowRunLifecycle,
  stepRunLifecycle, agenticSessionLifecycle, InvalidExecutionIdentityError,
  InvalidLifecycleTransitionError, InvalidLifecycleSnapshotError,
} from "../../index";

export type LifecycleApiFixture = Readonly<{
  kind: ExecutionKind; status: LifecycleStatus; rules: LifecycleRules;
  evidence: LifecycleEvidence; snapshot: LifecycleSnapshot;
  identityContract: typeof ExecutionIdentityContract;
  identityFactory: typeof ExecutionIdentityFactory;
  lifecycle: typeof ExecutionLifecycle;
  definition: typeof LifecycleDefinition;
  snapshotContract: typeof LifecycleSnapshotContract;
  workflow: typeof workflowRunLifecycle; step: typeof stepRunLifecycle;
  session: typeof agenticSessionLifecycle;
  identityError: typeof InvalidExecutionIdentityError;
  transitionError: typeof InvalidLifecycleTransitionError;
  snapshotError: typeof InvalidLifecycleSnapshotError;
}>;
```
