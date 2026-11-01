/** How a skill takes part in scheduling; "off" skills never reach the scheduler. */
export type SkillSelection = "automatic" | "required";

/** The short description the scheduler sees. Full instructions stay with the skill's session. */
export type SkillDescriptor = Readonly<{
  id: string;
  name: string;
  purpose: string;
  /** Workflow phases the skill applies to; a skill may apply to several. */
  phases: readonly string[];
  /** Skills whose completed results this one needs first. */
  dependencies: readonly string[];
  /** Named inputs the host must report as available before this skill can run. */
  requiredInputs?: readonly string[];
  selection: SkillSelection;
}>;
