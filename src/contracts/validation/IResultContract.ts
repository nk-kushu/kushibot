import type { ValidationResult } from "./ValidationResult.js";

/** Validates result data, without asserting factual truth or task acceptance. */
export interface IResultContract<TResult> {
  readonly id: string;
  readonly version: string;
  validate(value: unknown): Promise<ValidationResult<TResult>>;
}
