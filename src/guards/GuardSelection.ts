import type { GuardDefinition } from "./GuardDefinition.js";
export type GuardSelection = Readonly<{ schemaVersion: 1; guards: readonly GuardDefinition[]; unresolvedGuardIds: readonly string[]; pendingOperationRefs: readonly string[] }>;
