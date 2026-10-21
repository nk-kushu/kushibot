import type { RegistrationConfiguration } from "./RegistrationConfiguration.js";

export type RegistrationMetadata = Readonly<{
  id: string;
  implementationVersion: string;
  configuration: RegistrationConfiguration;
}>;
