import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { StepInputPolicyInput } from "./StepInputPolicyInput.js";
export type StepRunRequest=Readonly<{workflow:RegistrationRef;stepId:string;view:StepInputPolicyInput}>;
