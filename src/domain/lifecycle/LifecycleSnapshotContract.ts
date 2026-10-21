import type { IResultContract } from "../../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../../contracts/validation/ValidationResult.js";
import type { LifecycleSnapshot } from "./LifecycleSnapshot.js";
import type { LifecycleStatus } from "./LifecycleStatus.js";
import { LifecycleDefinition } from "./LifecycleDefinition.js";

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
        typeof value.cancellationRequested !== "boolean" || !this.references(value.pendingOperationRefs) ||
        new Set(value.pendingOperationRefs).size !== value.pendingOperationRefs.length ||
        !this.record(value.evidence)) return this.invalid();
    const evidence = value.evidence;
    const allowedEvidence = ["acceptedResultRef", "checkpointRef", "proposalRef"];
    if (Object.keys(evidence).some(key => !allowedEvidence.includes(key)) ||
        Object.keys(evidence).some(key => !this.reference(evidence[key]))) return this.invalid();
    const status = value.status as LifecycleStatus;
    if ((this.definition.isTerminal(status) && value.pendingOperationRefs.length > 0) ||
        (["created", "queued", "paused", "retry-wait", "waiting-for-approval"].includes(status) &&
          value.pendingOperationRefs.length > 0) ||
        (status === "completed" && !this.reference(evidence.acceptedResultRef)) ||
        (status === "paused" && !this.reference(evidence.checkpointRef)) ||
        (status === "waiting-for-approval" && !this.reference(evidence.proposalRef)) ||
        (status === "cancelled" && !value.cancellationRequested) ||
        (value.cancellationRequested && !["stopping", "recovering", "cancelled", "failed"].includes(status))) {
      return this.invalid();
    }
    return {
      valid: true,
      value: Object.freeze({
        schemaVersion: 1,
        kind: this.definition.kind,
        definitionVersion: this.definition.version,
        executionId: value.executionId,
        status,
        revision: value.revision,
        cancellationRequested: value.cancellationRequested,
        pendingOperationRefs: Object.freeze([...value.pendingOperationRefs]),
        evidence: Object.freeze({ ...evidence }),
      }),
    };
  }

  private record(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    if (Reflect.ownKeys(value).some(key => typeof key !== "string")) return false;
    return Object.values(Object.getOwnPropertyDescriptors(value)).every(
      descriptor => descriptor.enumerable && "value" in descriptor,
    );
  }

  private reference(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private references(value: unknown): value is readonly string[] {
    if (!Array.isArray(value) || Reflect.ownKeys(value).length !== value.length + 1) return false;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor) ||
          !this.reference(descriptor.value)) return false;
    }
    return true;
  }

  private invalid(): ValidationResult<LifecycleSnapshot> {
    return {
      valid: false,
      issues: [{ path: [], code: "invalid-lifecycle-snapshot", message: "Incompatible or inconsistent lifecycle snapshot." }],
    };
  }
}
