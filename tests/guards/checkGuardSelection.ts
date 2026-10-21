import { GuardRegistry } from "../../src/guards/GuardRegistry.js";
import { GuardSelectionService } from "../../src/guards/GuardSelectionService.js";
import { ConservativeGuardSelectionPolicy } from "../../src/guards/ConservativeGuardSelectionPolicy.js";
import { createLintGuard } from "../../examples/guards/createLintGuard.js";
import type { DecisionOutcome } from "../../src/decisions/DecisionOutcome.js";
export async function checkGuardSelection(): Promise<void> {
  const registry = new GuardRegistry();
  registry.registerCheck({ id: "recorded-lint", version: "1", async evaluate() { return null; } });
  registry.registerGuard(createLintGuard());
  registry.registerGuard({ id: "optional", version: "1", description: "Optional fixture review.", instructions: "Apply the configured optional fixture review.", rules: [{ id: "optional.rule", requirement: "Obtain fixture evidence.", blocking: true, checkIds: ["recorded-lint"] }] });
  let calls = 0, id = 0; let outcome: DecisionOutcome = { status: "answered", answer: { kind: "answered", choice: "exclude", supportingRefs: [] } };
  const service = new GuardSelectionService(registry, { async evaluate() { calls++; return outcome; } }, new ConservativeGuardSelectionPolicy(true), { nextId: () => `decision-${++id}` }, { nowEpochMs: () => 100 });
  const control = { operationId: "select-guards", signal: new AbortController().signal, deadlineEpochMs: 1000, timeoutMs: 100 };
  const selected = await service.select(["lint"], ["optional"], "TypeScript login handler changes.", control);
  if (selected.selection.guards.length !== 1 || selected.selection.guards[0].id !== "lint" || calls !== 1) throw new Error("Required guard removed or optional relevance ignored.");
  outcome = { status: "unavailable", code: "UNAVAILABLE" };
  if ((await service.select(["lint"], ["optional"], "TypeScript changes.", control)).selection.guards.length !== 2) throw new Error("Explicit fallback missing.");
  outcome = { status: "uncertain", operationId: "decision-uncertain" };
  if ((await service.select(["lint"], ["optional"], "TypeScript changes.", control)).selection.pendingOperationRefs[0] !== "decision-uncertain") throw new Error("Pending decision hidden.");
}
