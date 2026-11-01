import type { SkillDescriptor } from "./SkillDescriptor.js";

/** `phase` scopes the result, so a skill can also run in its other phases; absent means all. */
export type CompletedSkill = Readonly<{ skillId: string; summary: string; phase?: string }>;

/** One question to the scheduler: which skill runs next for this goal in this phase? */
export type SkillSchedule = Readonly<{
  goal: string;
  phase: string;
  skills: readonly SkillDescriptor[];
  completed: readonly CompletedSkill[];
  /** Inputs that exist right now; a skill needing any other cannot run yet. */
  availableInputs?: readonly string[];
}>;
