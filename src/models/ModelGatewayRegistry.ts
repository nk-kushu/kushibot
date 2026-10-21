import type { IModelGatewayFactory } from "./contracts/IModelGatewayFactory.js";
import type { IModelGateway } from "./contracts/IModelGateway.js";
import type { ModelProfile } from "./ModelProfile.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class ModelGatewayRegistry {
  private readonly factories = new Map<string, IModelGatewayFactory>();
  register(providerId: string, factory: IModelGatewayFactory): void {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(providerId) || this.factories.has(providerId)) throw new ConfigurationError("Invalid or duplicate model provider registration.");
    this.factories.set(providerId, factory);
  }
  create(profile: ModelProfile): IModelGateway {
    const factory = this.factories.get(profile.providerId);
    if (factory === undefined) throw new ConfigurationError("Model provider is not registered.");
    return factory.create(Object.freeze({ ...profile }));
  }
}
