import type { FrameworkConfiguration } from "../../src/configuration/FrameworkConfiguration.js";
import type { RegistrationMetadata } from "../../src/composition/RegistrationMetadata.js";
import type { SpecificationApplication } from "./SpecificationApplication.js";

export type ConfiguredApplication = Readonly<{
  application: SpecificationApplication;
  configuration: FrameworkConfiguration;
  policyMetadata: RegistrationMetadata;
}>;
