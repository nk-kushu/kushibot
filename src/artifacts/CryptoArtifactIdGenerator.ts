import type { IIdGenerator } from "../contracts/runtime/IIdGenerator.js";

export class CryptoArtifactIdGenerator implements IIdGenerator {
  constructor(private readonly random: Pick<Crypto, "getRandomValues">) {}

  nextId(): string {
    const bytes = this.random.getRandomValues(new Uint8Array(24));
    return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
  }
}
