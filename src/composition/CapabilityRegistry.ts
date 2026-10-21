import type { ICapabilityRegistry } from "./ICapabilityRegistry.js";
import type { CapabilityRegistration } from "./CapabilityRegistration.js";
import type { RegistrationMetadata } from "./RegistrationMetadata.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
import { UnknownRegistrationError } from "../errors/UnknownRegistrationError.js";

export class CapabilityRegistry<TCapability> implements ICapabilityRegistry<TCapability> {
  private readonly entries = new Map<string, CapabilityRegistration<TCapability>>();

  constructor(registrations: readonly CapabilityRegistration<TCapability>[]) {
    for (const registration of registrations) {
      if (typeof registration !== "object" || registration === null ||
          typeof registration.metadata !== "object" || registration.metadata === null) {
        throw new ConfigurationError("Invalid capability registration.");
      }
      const metadata = this.copyMetadata(registration.metadata);
      if (this.entries.has(metadata.id)) throw new ConfigurationError("Duplicate capability registration.");
      this.entries.set(metadata.id, Object.freeze({ metadata, capability: registration.capability }));
    }
  }

  get(id: string): TCapability {
    return this.lookup(id).capability;
  }

  describe(id: string): RegistrationMetadata {
    return this.lookup(id).metadata;
  }

  private lookup(id: string): CapabilityRegistration<TCapability> {
    const entry = this.entries.get(id);
    if (entry === undefined) throw new UnknownRegistrationError(id);
    return entry;
  }

  private copyMetadata(metadata: RegistrationMetadata): RegistrationMetadata {
    const record = metadata as unknown as Record<string, unknown>;
    const metadataKeys = ["id", "implementationVersion", "configuration"];
    const metadataPrototype = Object.getPrototypeOf(record);
    const metadataDescriptors = Object.getOwnPropertyDescriptors(record);
    if ((metadataPrototype !== Object.prototype && metadataPrototype !== null) ||
        Reflect.ownKeys(record).some(key => typeof key !== "string") ||
        Object.keys(metadataDescriptors).length !== metadataKeys.length ||
        Object.keys(metadataDescriptors).some(key => !metadataKeys.includes(key)) ||
        metadataKeys.some(key => {
          const descriptor = metadataDescriptors[key];
          return descriptor === undefined || !descriptor.enumerable || !("value" in descriptor);
        })) {
      throw new ConfigurationError("Registration identity and version must be nonempty supported values.");
    }
    const id = metadataDescriptors.id?.value;
    const implementationVersion = metadataDescriptors.implementationVersion?.value;
    const configuration = metadataDescriptors.configuration?.value;
    if (typeof id !== "string" || id.trim().length === 0 ||
        typeof implementationVersion !== "string" || implementationVersion.trim().length === 0) {
      throw new ConfigurationError("Registration identity and version must be nonempty strings.");
    }
    if (typeof configuration !== "object" || configuration === null || Array.isArray(configuration)) {
      throw new ConfigurationError("Registration configuration must be a scalar-settings object.");
    }
    const configurationPrototype = Object.getPrototypeOf(configuration);
    if (configurationPrototype !== Object.prototype && configurationPrototype !== null) {
      throw new ConfigurationError("Registration configuration must be a plain scalar-settings object.");
    }
    if (Reflect.ownKeys(configuration).some(key => typeof key !== "string")) {
      throw new ConfigurationError("Registration settings cannot contain symbol keys.");
    }
    const descriptors = Object.getOwnPropertyDescriptors(configuration);
    const copied: Record<string, string | number | boolean | null> = Object.create(null);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!descriptor.enumerable || !("value" in descriptor)) {
        throw new ConfigurationError("Registration settings must be enumerable scalar values.");
      }
      const value: unknown = descriptor.value;
      const scalar = value === null || typeof value === "string" || typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value));
      if (!scalar) throw new ConfigurationError("Registration settings must be finite serializable scalars.");
      copied[key] = value;
    }
    return Object.freeze({
      id,
      implementationVersion,
      configuration: Object.freeze(copied),
    });
  }
}
