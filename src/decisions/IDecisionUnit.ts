import type { DecisionRequest } from "./DecisionRequest.js";
import type { DecisionOutcome } from "./DecisionOutcome.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
export interface IDecisionUnit { evaluate(request: DecisionRequest, control: ModelCallControl): Promise<DecisionOutcome>; }
