import type { DecisionRequest } from "./DecisionRequest.js";
import type { DecisionProviderResult } from "./DecisionProviderResult.js";
import type { ModelCallControl } from "../agentic/model/ModelCallControl.js";
export interface IDecisionProvider { evaluate(request: DecisionRequest, control: ModelCallControl): Promise<DecisionProviderResult>; }
