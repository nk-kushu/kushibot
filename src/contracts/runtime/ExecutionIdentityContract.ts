import type { IResultContract } from "../validation/IResultContract.js";
import type { ValidationResult } from "../validation/ValidationResult.js";
import type { ExecutionIdentity } from "./ExecutionIdentity.js";

export class ExecutionIdentityContract implements IResultContract<ExecutionIdentity> {
  readonly id = "execution-identity";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<ExecutionIdentity>> {
    if (!this.record(value)) {
      return this.invalid("Expected identity data.");
    }
    const keys = ["operationId", "runId", "stepRunId", "sessionId", "parentOperationId"];
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.keys(descriptors).some(key => !keys.includes(key)) ||
        keys.some(key => key in descriptors && (!descriptors[key]?.enumerable || !("value" in descriptors[key]!)))) {
      return this.invalid("Identity fields must be supported nonempty identifiers.");
    }
    const data: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    for (const [key, descriptor] of Object.entries(descriptors)) data[key] = descriptor.value;
    if (!this.isId(data.operationId) ||
        keys.slice(1).some(key => key in data && !this.isId(data[key]))) {
      return this.invalid("Identity fields must be supported nonempty identifiers.");
    }
    if ((data.stepRunId !== undefined && data.runId === undefined) || data.parentOperationId === data.operationId) {
      return this.invalid("Invalid identity relationship.");
    }
    return { valid: true, value: Object.freeze({ ...data }) as ExecutionIdentity };
  }

  private record(value: unknown): value is Record<string, unknown> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return false;
    return !Reflect.ownKeys(value).some(key => typeof key !== "string");
  }

  private isId(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
  }

  private invalid(message: string): ValidationResult<ExecutionIdentity> {
    return { valid: false, issues: [{ path: [], code: "invalid-identity", message }] };
  }
}
