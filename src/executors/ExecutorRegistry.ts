import type { IExecutorRegistration } from "./contracts/IExecutorRegistration.js";
import { ExecutorContractError } from "../errors/ExecutorContractError.js";
import { UnknownRegistrationError } from "../errors/UnknownRegistrationError.js";
export class ExecutorRegistry {
  private readonly registrations = new Map<string,IExecutorRegistration>();
  register(registration: IExecutorRegistration): void {
    const metadata = registration.metadata;
    if (![metadata.id,metadata.version,metadata.inputContractId,metadata.inputContractVersion,metadata.resultContractId,metadata.resultContractVersion].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value)) ||
        this.registrations.size >= 128) throw new ExecutorContractError();
    const key = this.key(metadata.id,metadata.version); if (this.registrations.has(key)) throw new ExecutorContractError();
    this.registrations.set(key,Object.freeze({metadata:Object.freeze({...metadata}),execute:registration.execute.bind(registration)}));
  }
  resolve(id: string, version: string): IExecutorRegistration { if (![id,version].every(value => /^[A-Za-z0-9_.:-]{1,128}$/.test(value))) throw new ExecutorContractError(); const value = this.registrations.get(this.key(id,version)); if (value === undefined) throw new UnknownRegistrationError(id + "@" + version); return value; }
  list(): readonly import("./ExecutorMetadata.js").ExecutorMetadata[] { return Object.freeze([...this.registrations.values()].map(value => value.metadata)); }
  private key(id: string, version: string): string { return JSON.stringify([id,version]); }
}
