import type { ContextRuleInstruction } from "./ContextRuleInstruction.js";
import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { SkillGuidance } from "../../guards/SkillGuidance.js";
import type { ContextAssignment } from "./ContextAssignment.js";
import type { ContextFragment } from "./ContextFragment.js";
export type ContextCompositionInput = Readonly<{ snapshotRef: string; scope: ExecutionScopeRef;
  instructions: Readonly<{ revision: string; text: string }>; guidance: readonly SkillGuidance[]; requiredRules: readonly ContextRuleInstruction[]; assignment: ContextAssignment;
  requiredFragments: readonly ContextFragment[]; optionalFragments: readonly ContextFragment[] }>;
