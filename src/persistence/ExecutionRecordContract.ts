import type { IResultContract } from "../contracts/validation/IResultContract.js";
import type { ValidationResult } from "../contracts/validation/ValidationResult.js";
import type { ExecutionRecord } from "../contracts/persistence/ExecutionRecord.js";
import { ExecutionIdentityContract } from "../contracts/runtime/ExecutionIdentityContract.js";
import { FrameworkConfigurationContract } from "../configuration/FrameworkConfigurationContract.js";
import { LifecycleSnapshotContract } from "../domain/lifecycle/LifecycleSnapshotContract.js";
import { workflowRunLifecycle } from "../domain/lifecycle/workflowRunLifecycle.js";
import { stepRunLifecycle } from "../domain/lifecycle/stepRunLifecycle.js";
import { agenticSessionLifecycle } from "../domain/lifecycle/agenticSessionLifecycle.js";
import { JsonValueContract } from "./JsonValueContract.js";

export class ExecutionRecordContract implements IResultContract<ExecutionRecord> {
  readonly id = "execution-record";
  readonly version = "1";
  private readonly lifecycles = new Map([
    ["workflow-run", new LifecycleSnapshotContract(workflowRunLifecycle)],
    ["step-run", new LifecycleSnapshotContract(stepRunLifecycle)],
    ["agentic-session", new LifecycleSnapshotContract(agenticSessionLifecycle)],
  ]);

  constructor(
    private readonly json: JsonValueContract,
    private readonly identities: ExecutionIdentityContract,
    private readonly configuration: FrameworkConfigurationContract,
  ) {}

  async validate(value: unknown): Promise<ValidationResult<ExecutionRecord>> {
    const copied = await this.json.validate(value);
    if (!copied.valid || !this.record(copied.value)) return this.invalid();
    const data = copied.value;
    if (!this.exact(data, ["schemaVersion", "scope", "identity", "lifecycle", "definition", "configuration",
      "registrations", "sourceRefs", "checkpointRef", "outcome"]) || data.schemaVersion !== 1 ||
        !this.record(data.scope) || !this.reference(data.scope.scopeId) || !this.reference(data.scope.projectId) ||
        Object.keys(data.scope).some(key => !["scopeId", "projectId", "workspaceId"].includes(key)) ||
        ("workspaceId" in data.scope && !this.reference(data.scope.workspaceId)) ||
        !this.record(data.definition) || !this.exact(data.definition, ["id", "version"]) ||
        !this.reference(data.definition.id) || !this.reference(data.definition.version) ||
        !this.record(data.lifecycle) || typeof data.lifecycle.kind !== "string" ||
        !this.references(data.sourceRefs) || !(data.checkpointRef === null || this.reference(data.checkpointRef)) ||
        !Array.isArray(data.registrations)) return this.invalid();

    const [identity, configuration] = await Promise.all([
      this.identities.validate(data.identity),
      this.configuration.validate(data.configuration),
    ]);
    const lifecycleContract = this.lifecycles.get(data.lifecycle.kind);
    if (!identity.valid || !configuration.valid || lifecycleContract === undefined) return this.invalid();
    const lifecycle = await lifecycleContract.validate(data.lifecycle);
    if (!lifecycle.valid) return this.invalid();

    const executionId = lifecycle.value.kind === "workflow-run"
      ? identity.value.runId
      : lifecycle.value.kind === "step-run"
        ? identity.value.stepRunId
        : identity.value.sessionId;
    if (executionId !== lifecycle.value.executionId) return this.invalid();

    const registrations = data.registrations;
    if (registrations.some(item => !this.registration(item)) ||
        new Set(registrations.map(item => (item as Record<string, unknown>).id)).size !== registrations.length ||
        !this.outcome(data.outcome)) return this.invalid();
    if (this.record(data.outcome) && data.outcome.status !== "completed" &&
        Array.isArray(data.outcome.pendingOperationRefs) &&
        data.outcome.pendingOperationRefs.some(ref => !lifecycle.value.pendingOperationRefs.includes(ref as string))) {
      return this.invalid();
    }

    const status = lifecycle.value.status;
    const outcome = data.outcome;
    if ((status === "completed" && (!this.record(outcome) || outcome.status !== "completed")) ||
        (status === "failed" && (!this.record(outcome) || outcome.status !== "failed")) ||
        (["stopped", "cancelled"].includes(status) && (!this.record(outcome) || outcome.status !== "stopped")) ||
        (status === "cancelled" && this.record(outcome) &&
          (!this.record(outcome.reason) || outcome.reason.code !== "cancelled"))) return this.invalid();

    return { valid: true, value: data as unknown as ExecutionRecord };
  }

  private registration(value: unknown): boolean {
    return this.record(value) && this.exact(value, ["id", "implementationVersion", "configuration"]) &&
      this.reference(value.id) && this.reference(value.implementationVersion) && this.record(value.configuration) &&
      Object.keys(value.configuration).every(key => Object.prototype.hasOwnProperty.call(value.configuration, key)) &&
      Object.values(value.configuration).every(item => item === null ||
        ["string", "boolean"].includes(typeof item) || (typeof item === "number" && Number.isFinite(item)));
  }

  private outcome(value: unknown): boolean {
    if (value === null) return true;
    if (!this.record(value)) return false;
    if (value.status === "completed") return this.exact(value, ["status", "result"]);
    if (value.status !== "stopped" && value.status !== "failed") return false;
    if (!this.exact(value, ["status", value.status === "stopped" ? "reason" : "error", "partial", "pendingOperationRefs"]) ||
        !this.record(value.partial) ||
        !this.exact(value.partial, ["summary", "evidenceRefs", "artifactRefs", "unresolved"]) ||
        typeof value.partial.summary !== "string" || !this.references(value.partial.evidenceRefs) ||
        !this.references(value.partial.artifactRefs) || !this.references(value.partial.unresolved) ||
        !this.references(value.pendingOperationRefs)) return false;
    const detail = value.status === "stopped" ? value.reason : value.error;
    if (!this.record(detail) || !this.exact(detail, ["code", "message"]) ||
        !this.reference(detail.code) || typeof detail.message !== "string") return false;
    return value.status === "failed" ||
      ["limit-reached", "deadline-reached", "cancelled", "no-progress"].includes(detail.code);
  }

  private record(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private reference(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private references(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every(item => this.reference(item));
  }

  private exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
    return Object.keys(value).length === keys.length &&
      keys.every(key => Object.prototype.hasOwnProperty.call(value, key));
  }

  private invalid(): ValidationResult<ExecutionRecord> {
    return {
      valid: false,
      issues: [{ path: [], code: "invalid-execution-record", message: "Execution record is invalid or incompatible." }],
    };
  }
}
