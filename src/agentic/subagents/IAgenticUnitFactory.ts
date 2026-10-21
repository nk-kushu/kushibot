import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
import type { ChildAgentBinding } from "./ChildAgentBinding.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
export interface IAgenticUnitFactory { create(child: AdmittedSubAgent, context: IExecutionContext): Promise<ChildAgentBinding>; }
