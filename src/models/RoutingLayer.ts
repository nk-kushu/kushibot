import type { ModelCapability } from "./ModelCapability.js";
export type RoutingLayer = Readonly<{
  taskSummary?: string;
  allowedProfileIds?: readonly string[]; preferredProfileIds?: readonly string[];
  requiredCapabilities?: readonly ModelCapability[]; inputTokens?: number; outputTokens?: number;
  explicitProfileId?: string; allowFallback?: boolean;
}>;
