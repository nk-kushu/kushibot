import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";
export type WorkspaceEditingOutcome<TValue> =
  | Readonly<{ kind: "completed"; value: TValue }>
  | Readonly<{ kind: "busy" }>
  | Readonly<{ kind: "stopped"; reason: ExecutionStopReason }>;
