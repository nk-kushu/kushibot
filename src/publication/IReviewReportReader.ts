import type { ReviewReport } from "./ReviewReport.js";
import type { IExecutionContext } from "../executors/contracts/IExecutionContext.js";
export interface IReviewReportReader {read(reference:string,context:IExecutionContext):Promise<ReviewReport|null>;}
