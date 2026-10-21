import type { BudgetReservation } from "../../usage/BudgetReservation.js";
import type { UsageAmounts } from "../../usage/UsageAmounts.js";
import type { WorkflowRunSnapshot } from "../WorkflowRunSnapshot.js";
import type { IExecutionContext } from "../../executors/contracts/IExecutionContext.js";
import type { RecoveryObservation } from "./RecoveryObservation.js";
export interface IUsageRecoverySource{read(reservation:BudgetReservation,run:WorkflowRunSnapshot,context:IExecutionContext):Promise<RecoveryObservation<UsageAmounts>>;}
