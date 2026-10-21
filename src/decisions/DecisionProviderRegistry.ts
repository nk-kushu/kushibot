import type { IDecisionProvider } from "./IDecisionProvider.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";
export class DecisionProviderRegistry {
  private readonly providers = new Map<string, IDecisionProvider>();
  register(id: string, provider: IDecisionProvider): void {
    if (!/^[a-zA-Z0-9_.-]{1,64}$/.test(id) || this.providers.has(id)) throw new ConfigurationError("Invalid or duplicate decision provider.");
    this.providers.set(id, provider);
  }
  resolve(id: string): IDecisionProvider {
    const provider = this.providers.get(id);
    if (provider === undefined) throw new ConfigurationError("Decision provider is not registered.");
    return provider;
  }
}
