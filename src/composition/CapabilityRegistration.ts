import type { RegistrationMetadata } from "./RegistrationMetadata.js";

export type CapabilityRegistration<TCapability> = Readonly<{
  metadata: RegistrationMetadata;
  capability: TCapability;
}>;
