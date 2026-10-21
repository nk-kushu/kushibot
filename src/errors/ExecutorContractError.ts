export class ExecutorContractError extends Error {
  readonly code = "EXECUTOR_CONTRACT_INVALID";
  constructor() { super("Executor registration, configuration, or returned outcome is invalid."); this.name = "ExecutorContractError"; }
}
