export class CommandIdentityConflictError extends Error {
  readonly code = "COMMAND_IDENTITY_CONFLICT";

  constructor(message: string) {
    super(message);
    this.name = "CommandIdentityConflictError";
  }
}
