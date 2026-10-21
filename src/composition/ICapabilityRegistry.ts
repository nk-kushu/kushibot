import type { RegistrationMetadata } from "./RegistrationMetadata.js";

export interface ICapabilityRegistry<TCapability> {
  get(id: string): TCapability;
  describe(id: string): RegistrationMetadata;
}
