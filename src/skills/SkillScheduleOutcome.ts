import type { ExecutionStopReason } from "../execution-control/ExecutionStopReason.js";

export type SkillScheduleOutcome =
  | Readonly<{ status: "run"; skillId: string; reason: string }>
  | Readonly<{ status: "finished"; reason: string }>
  /** Required skills can never become eligible, or the model gave no usable choice. */
  | Readonly<{ status: "blocked"; code: string; message: string }>
  | Readonly<{ status: "stopped"; reason: ExecutionStopReason }>
  /** A model call's result or usage is unknown; the caller must not repeat its work blindly. */
  | Readonly<{ status: "uncertain"; operationId: string }>;
