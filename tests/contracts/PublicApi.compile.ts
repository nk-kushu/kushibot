import type {
  IPolicy,
  IClock,
  IIdGenerator,
  IResultContract,
  IExecutor,
  IExecutionContext,
  IExecutionReporter,
  ExecutionIdentity,
  ExecutionScopeRef,
  PartialProgress,
  ExecutionOutcome,
  ValidationResult,
} from "../../src/index.js";
import { UnknownRegistrationError, PersistenceError } from "../../src/index.js";

export type PublicApiFixture = Readonly<{
  policy: IPolicy<string, number>;
  clock: IClock;
  ids: IIdGenerator;
  validator: IResultContract<string>;
  executor: IExecutor<string, string>;
  context: IExecutionContext;
  reporter: IExecutionReporter;
  identity: ExecutionIdentity;
  scope: ExecutionScopeRef;
  partial: PartialProgress;
  outcome: ExecutionOutcome<string>;
  validation: ValidationResult<string>;
  registrationError: InstanceType<typeof UnknownRegistrationError>;
  persistenceError: InstanceType<typeof PersistenceError>;
}>;
