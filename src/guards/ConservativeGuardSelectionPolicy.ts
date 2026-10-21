import type { IPolicy } from "../contracts/IPolicy.js";
import type { GuardSelectionInput } from "./GuardSelectionInput.js";
import type { GuardSelection } from "./GuardSelection.js";
export class ConservativeGuardSelectionPolicy implements IPolicy<GuardSelectionInput, GuardSelection> {
  constructor(private readonly includeOptionalOnFailure: boolean) {}
  async apply(input: GuardSelectionInput): Promise<GuardSelection> {
    const selected = new Map(input.required.map(guard => [guard.id, guard]));
    const unresolved = new Set(input.unevaluated); const pending: string[] = [];
    for (const item of input.optional) {
      if (item.outcome.status === "answered") {
        if (item.outcome.answer.choice === "include") selected.set(item.guard.id, item.guard);
        else if (item.outcome.answer.choice !== "exclude") unresolved.add(item.guard.id);
      } else {
        if (this.includeOptionalOnFailure) selected.set(item.guard.id, item.guard); else unresolved.add(item.guard.id);
        if (item.outcome.status === "uncertain") pending.push(item.outcome.operationId);
      }
    }
    return Object.freeze({ schemaVersion: 1 as const, guards: Object.freeze([...selected.values()]), unresolvedGuardIds: Object.freeze([...unresolved]), pendingOperationRefs: Object.freeze(pending) });
  }
}
