export class UnknownRegistrationError extends Error {
  readonly code = "UNKNOWN_REGISTRATION";

  constructor(readonly registrationId: string) {
    super(`Unknown framework registration: ${registrationId}`);
    this.name = "UnknownRegistrationError";
  }
}
