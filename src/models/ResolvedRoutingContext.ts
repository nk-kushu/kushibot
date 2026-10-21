import type { ModelRequirements } from "./ModelRequirements.js";
export type ResolvedRoutingContext = Readonly<{
  schemaVersion: 1; role: string; taskSummary: string; allowedProfileIds: readonly string[]; preferredProfileIds: readonly string[];
  requirements: ModelRequirements; explicitProfileId: string | null; allowFallback: boolean;
}>;
