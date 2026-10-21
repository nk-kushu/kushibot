import type { ModelProfileRegistration } from "./ModelProfileRegistration.js";
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext.js";
export type ModelRoutingDecision = Readonly<{ operationId: string; registration: ModelProfileRegistration; context: ResolvedRoutingContext; policyId: string; policyVersion: string; reasonCode: string }>;
