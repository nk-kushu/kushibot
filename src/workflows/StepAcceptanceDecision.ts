import type { StepResultAcceptance } from "./StepResultAcceptance.js";
export type StepAcceptanceDecision = Exclude<StepResultAcceptance,Readonly<{status:"not-evaluated";code:string;message:string}>>;
