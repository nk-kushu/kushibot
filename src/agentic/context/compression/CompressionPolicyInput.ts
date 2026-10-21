import type { ContextFragment } from "../ContextFragment.js";
export type CompressionPolicyInput = Readonly<{ candidates: readonly Pick<ContextFragment, "id" | "kind" | "priority">[]; maxSources: number }>;
