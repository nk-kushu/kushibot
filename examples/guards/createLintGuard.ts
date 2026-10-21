import type { GuardDefinition } from "../../src/guards/GuardDefinition.js";
export function createLintGuard(): GuardDefinition {
  return Object.freeze({ id: "lint", version: "1", description: "Follow configured lint rules for changed TypeScript source.",
    instructions: "Follow the repository lint configuration. Preserve behavior while correcting diagnostics. An instruction or model assertion is not a lint-process receipt.",
    rules: Object.freeze([Object.freeze({ id: "lint.configured", requirement: "The configured lint invocation must pass for the checked revision.", blocking: true, checkIds: Object.freeze(["recorded-lint"]) })]) });
}
