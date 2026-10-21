import { UnknownRegistrationError } from "../../src/errors/UnknownRegistrationError.js";
import { PersistenceError } from "../../src/errors/PersistenceError.js";

export function verifyErrors(): void {
  const unknown = new UnknownRegistrationError("fixture-executor");
  const persistence = new PersistenceError("Could not save the fixture result.");
  if (!(unknown instanceof Error) || !(persistence instanceof Error)) {
    throw new Error("Custom errors must be Error instances.");
  }
  if (Object.getPrototypeOf(UnknownRegistrationError.prototype) !== Error.prototype ||
      Object.getPrototypeOf(PersistenceError.prototype) !== Error.prototype) {
    throw new Error("Custom errors must extend Error directly.");
  }
  if (unknown.name !== "UnknownRegistrationError" ||
      unknown.code !== "UNKNOWN_REGISTRATION" ||
      unknown.registrationId !== "fixture-executor" ||
      unknown.message !== "Unknown framework registration: fixture-executor") {
    throw new Error("Unknown-registration error metadata must remain stable.");
  }
  if (persistence.name !== "PersistenceError" ||
      persistence.code !== "PERSISTENCE_FAILED" ||
      persistence.message !== "Could not save the fixture result.") {
    throw new Error("Persistence error metadata must remain stable.");
  }
}
