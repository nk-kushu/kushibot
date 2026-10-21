import type { JsonValue } from "../../contracts/persistence/JsonValue.js";
import type { ExecutionOutcome } from "../../contracts/outcomes/ExecutionOutcome.js";
export type SubAgentOutcome =
  | Readonly<{ status: "rejected"; code: string }>
  | Readonly<{ status: "pending"; childId: string; pendingOperationRefs: readonly string[] }>
  | Readonly<{ status: "returned"; childId: string; sessionId: string; outcome: ExecutionOutcome<JsonValue> }>;
