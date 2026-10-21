import type { ModelProfile } from "../../../models/ModelProfile.js";
export type PromptCachePolicyInput = Readonly<{ profile: ModelProfile; instructionRevision: string; instructions: string }>;
