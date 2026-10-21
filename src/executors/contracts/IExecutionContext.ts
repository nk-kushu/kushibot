import type { ExecutionIdentity } from "../../contracts/runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { IExecutionReporter } from "./IExecutionReporter.js";

/** Invocation controls. Runtime owners enforce the referenced scope, deadline, and cancellation. */
export interface IExecutionContext {
  readonly identity: ExecutionIdentity;
  readonly scope: ExecutionScopeRef;
  readonly signal: AbortSignal;
  readonly deadlineEpochMs: number | null;
  readonly reporter: IExecutionReporter;
}
