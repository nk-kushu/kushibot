import { CapabilityRegistry } from "../../src/composition/CapabilityRegistry.js";
import { ConfigurationError } from "../../src/errors/ConfigurationError.js";
import { UnknownRegistrationError } from "../../src/errors/UnknownRegistrationError.js";

export function verifyRegistry(): void {
  const capability = Object.freeze({ label: "fixture-policy" });
  const settings = { maxFindings: 2 };
  const registration = {
    metadata: { id: "fixture", implementationVersion: "1", configuration: settings },
    capability,
  };
  const registry = new CapabilityRegistry([registration]);
  settings.maxFindings = 999;
  if (registry.get("fixture") !== capability ||
      registry.describe("fixture").configuration.maxFindings !== 2 ||
      !Object.isFrozen(registry.describe("fixture").configuration)) {
    throw new Error("Registry must preserve capability identity and snapshot metadata.");
  }
  let unknown = false;
  try {
    registry.get("missing");
  } catch (error: unknown) {
    if (!(error instanceof UnknownRegistrationError)) throw error;
    unknown = true;
  }
  if (!unknown) throw new Error("Unknown registration must fail explicitly.");
  const invalidRegistrations: readonly (readonly typeof registration[])[] = [
    [registration, registration],
    [{ ...registration, metadata: { ...registration.metadata, id: " " } }],
    [{ ...registration, metadata: { ...registration.metadata, configuration: { maxFindings: Number.NaN } } }],
  ];
  for (const entries of invalidRegistrations) {
    let rejected = false;
    try {
      new CapabilityRegistry(entries);
    } catch (error: unknown) {
      if (!(error instanceof ConfigurationError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Invalid registry construction must fail explicitly.");
  }
}
