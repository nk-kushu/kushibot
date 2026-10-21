import type { PartialProgress } from "../contracts/outcomes/PartialProgress.js";
export type CollectedWork = Readonly<{ partial: PartialProgress; pendingOperationRefs: readonly string[] }>;
