import type { RegistrationRef } from "../contracts/RegistrationRef.js";
export type WorkflowTransitionDefinition = Readonly<{ id: string; fromStepId: string; toStepId: string; policy: RegistrationRef; maxTraversals: number }>;
