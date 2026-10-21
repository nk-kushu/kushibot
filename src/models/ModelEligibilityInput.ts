import type { ModelProfileRegistration } from "./ModelProfileRegistration.js";
import type { ResolvedRoutingContext } from "./ResolvedRoutingContext.js";
import type { RoutingBudgetView } from "./RoutingBudgetView.js";
export type ModelEligibilityInput = Readonly<{ candidate: ModelProfileRegistration; context: ResolvedRoutingContext; budget: RoutingBudgetView }>;
