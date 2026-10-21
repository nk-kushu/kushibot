import type { StepRunner } from "./StepRunner.js";
import type { IStepAttemptJournal } from "./IStepAttemptJournal.js";
import type { IStepContextVerifier } from "./IStepContextVerifier.js";
export interface IWorkflowStepRunnerFactory{create(journal:IStepAttemptJournal,verifier:IStepContextVerifier):StepRunner;}
