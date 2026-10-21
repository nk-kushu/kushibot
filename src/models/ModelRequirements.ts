import type { ModelCapability } from "./ModelCapability.js";
export type ModelRequirements = Readonly<{ capabilities: readonly ModelCapability[]; inputTokens: number; outputTokens: number }>;
