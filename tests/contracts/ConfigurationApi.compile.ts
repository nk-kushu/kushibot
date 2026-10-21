import type {
  FrameworkConfiguration,
  ConfigurationOverrides,
  IConfigurationResolver,
  RegistrationConfiguration,
  RegistrationMetadata,
  CapabilityRegistration,
  ICapabilityRegistry,
  RuntimeDependencies,
} from "../../src/index.js";
import {
  FrameworkConfigurationContract,
  FrameworkConfigurationResolver,
  CapabilityRegistry,
  ConfigurationError,
} from "../../src/index.js";

export type ConfigurationApiFixture = Readonly<{
  configuration: FrameworkConfiguration;
  overrides: ConfigurationOverrides;
  resolver: IConfigurationResolver;
  settings: RegistrationConfiguration;
  metadata: RegistrationMetadata;
  registration: CapabilityRegistration<string>;
  registry: ICapabilityRegistry<string>;
  runtime: RuntimeDependencies;
  validatorClass: typeof FrameworkConfigurationContract;
  resolverClass: typeof FrameworkConfigurationResolver;
  registryClass: typeof CapabilityRegistry;
  errorClass: typeof ConfigurationError;
}>;
