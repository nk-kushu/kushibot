import type { ToolObservation } from "../ToolObservation.js";
export type ToolOperationClaimResult =
  | Readonly<{ kind: "acquired" }>
  | Readonly<{ kind: "pending" }>
  | Readonly<{ kind: "completed"; observation: ToolObservation }>;
