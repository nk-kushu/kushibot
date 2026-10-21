import type { GuardSelection } from "./GuardSelection.js";
import type { GuardTarget } from "./GuardTarget.js";
import type { GuardCheckRecord } from "./GuardCheckRecord.js";
export type GuardReport = Readonly<{ schemaVersion: 1; selection: GuardSelection; target: GuardTarget; checks: readonly GuardCheckRecord[]; pendingOperationRefs: readonly string[] }>;
