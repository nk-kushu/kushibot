import type { LifecycleSnapshot } from "../domain/lifecycle/LifecycleSnapshot.js";
export type StepRunSnapshot=Readonly<{stepId:string;stepRunId:string;invalidated:boolean;attemptId:string|null;lifecycle:LifecycleSnapshot}>;
