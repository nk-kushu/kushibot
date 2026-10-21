import type { IPolicy,StepAcceptanceInput,StepAcceptanceDecision } from "../../src/index.js";
export type LoginAcceptancePolicies=Readonly<{investigate:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>;specify:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>;edit:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>;verify:IPolicy<StepAcceptanceInput,StepAcceptanceDecision>}>;
