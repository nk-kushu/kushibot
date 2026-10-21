import type { WorkflowRunSnapshot } from "./WorkflowRunSnapshot.js";
import type { WorkflowRun } from "./WorkflowRun.js";
export interface IWorkflowRunStore{initialize(initial:WorkflowRunSnapshot):Promise<void>;read():Promise<WorkflowRunSnapshot>;mutate<T>(change:(run:WorkflowRun)=>T):Promise<T>;}
