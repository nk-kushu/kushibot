import type { IRecordCodec } from "../contracts/persistence/IRecordCodec.js";
import type { IResultContract } from "../contracts/validation/IResultContract.js";
import { JsonValueContract } from "./JsonValueContract.js";
import { InvalidPersistenceRecordError } from "../errors/InvalidPersistenceRecordError.js";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export class JsonRecordCodec<TRecord> implements IRecordCodec<TRecord> {
  constructor(
    private readonly contract: IResultContract<TRecord>,
    private readonly json: JsonValueContract,
    private readonly maxBytes: number,
  ) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
      throw new ConfigurationError("Invalid record byte limit.");
    }
  }

  async encode(value: unknown): Promise<string> {
    const json = await this.json.validate(value);
    if (!json.valid) throw new InvalidPersistenceRecordError("Record is not supported JSON.");
    const checked = await this.contract.validate(json.value);
    if (!checked.valid) throw new InvalidPersistenceRecordError("Record contract rejected the value.");
    const canonical = await this.json.validate(checked.value);
    if (!canonical.valid) throw new InvalidPersistenceRecordError("Validator returned unsupported data.");
    const serialized = JSON.stringify(canonical.value);
    this.checkSize(serialized);
    return serialized;
  }

  async decode(serialized: string): Promise<TRecord> {
    this.checkSize(serialized);
    let parsed: unknown;
    try {
      parsed = JSON.parse(serialized);
    } catch (error: unknown) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new InvalidPersistenceRecordError("Stored JSON is malformed.");
    }
    const json = await this.json.validate(parsed);
    if (!json.valid) throw new InvalidPersistenceRecordError("Stored JSON exceeds structural limits.");
    const checked = await this.contract.validate(json.value);
    if (!checked.valid) throw new InvalidPersistenceRecordError("Stored record is incompatible.");
    return checked.value;
  }

  private checkSize(serialized: string): void {
    if (typeof serialized !== "string" || new TextEncoder().encode(serialized).byteLength > this.maxBytes) {
      throw new InvalidPersistenceRecordError("Serialized record exceeds its byte limit.");
    }
  }
}
