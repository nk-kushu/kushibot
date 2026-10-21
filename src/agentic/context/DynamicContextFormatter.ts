import type { ModelMessage } from "../model/ModelMessage.js";
import type { ContextCompositionInput } from "./ContextCompositionInput.js";
import type { ContextFragment } from "./ContextFragment.js";
export class DynamicContextFormatter {
  format(input: ContextCompositionInput, optional: readonly ContextFragment[]): readonly ModelMessage[] {
    return Object.freeze([
      Object.freeze({ role: "user" as const, text: JSON.stringify({ assignment: { goal: input.assignment.goal, acceptanceCriteria: input.assignment.acceptanceCriteria, unresolved: input.assignment.unresolved, pendingOperationRefs: input.assignment.pendingOperationRefs } }) }),
      Object.freeze({ role: "user" as const, text: JSON.stringify({ requiredContext: input.requiredFragments.map(fragment => this.data(fragment)), optionalContext: optional.map(fragment => this.data(fragment)) }) }),
    ]);
  }
  private data(fragment: ContextFragment) { return { id: fragment.id, kind: fragment.kind, revisionRef: fragment.revisionRef, sourceRef: fragment.sourceRef, text: fragment.text }; }
}
