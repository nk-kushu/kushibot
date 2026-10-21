import type { ResolvedRoutingContext } from "./ResolvedRoutingContext.js";
import type { ModelProfileRegistration } from "./ModelProfileRegistration.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
export type ModelSelectionInput = Readonly<{ context: ResolvedRoutingContext; candidates: readonly ModelProfileRegistration[]; control: ModelCallControl }>;
