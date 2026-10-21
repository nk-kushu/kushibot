import type { ContextFragment } from "../ContextFragment.js";
export type SummaryRequest = Readonly<{ sources: readonly ContextFragment[]; maxSummaryBytes: number }>;
