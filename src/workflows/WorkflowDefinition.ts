import type { StepDefinition } from "./StepDefinition.js";
import type { WorkflowTransitionDefinition } from "./WorkflowTransitionDefinition.js";
export type WorkflowDefinition = Readonly<{ id: string; version: string; steps: readonly StepDefinition[]; transitions: readonly WorkflowTransitionDefinition[]; maxTotalAttempts: number }>;
