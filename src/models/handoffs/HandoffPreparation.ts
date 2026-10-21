import type { ModelHandoff } from "./ModelHandoff.js";
export type HandoffPreparation =
  | Readonly<{ kind: "prepared"; handoff: ModelHandoff; requiresSourceRevalidation: true }>
  | Readonly<{ kind: "blocked"; reasonCode: "UNRESOLVED_OPERATIONS"; pendingOperationRefs: readonly string[] }>;
