export class GuardConfigurationError extends Error {
  readonly code = "GUARD_CONFIGURATION_INVALID";
  constructor() { super("Guard definition, selection, target, or report configuration is invalid."); this.name = "GuardConfigurationError"; }
}
