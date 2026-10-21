import type { ExecutorMetadata } from "../executors/ExecutorMetadata.js";
import type { RegistrationRef } from "../contracts/RegistrationRef.js";
export type StepDefinition = Readonly<{ id: string; dependencies: readonly string[]; executor: ExecutorMetadata; inputPolicy: RegistrationRef; acceptancePolicy: RegistrationRef; maxAttempts: number }>;
