import type { GuardRule } from "./GuardRule.js";
export type GuardDefinition = Readonly<{ id: string; version: string; description: string; instructions: string; rules: readonly GuardRule[] }>;
