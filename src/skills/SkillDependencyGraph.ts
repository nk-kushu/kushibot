import type { SkillDescriptor } from "./SkillDescriptor.js";

/** Reports the dependency problems that would otherwise leave required skills stuck. */
export class SkillDependencyGraph {
  private readonly byId: ReadonlyMap<string, SkillDescriptor>;

  constructor(private readonly skills: readonly SkillDescriptor[]) {
    this.byId = new Map(skills.map((skill) => [skill.id, skill]));
  }

  /** `a -> b` messages for dependencies on skills outside this set. */
  missing(): readonly string[] {
    return this.skills.flatMap((skill) =>
      skill.dependencies
        .filter((id) => !this.byId.has(id))
        .map((id) => `${skill.id} -> ${id}`),
    );
  }

  /** The first cycle found, as the skill IDs along it, or null. */
  cycle(): readonly string[] | null {
    const finished = new Set<string>();
    const visit = (id: string, path: readonly string[]): readonly string[] | null => {
      if (path.includes(id)) return [...path.slice(path.indexOf(id)), id];
      if (finished.has(id)) return null;
      for (const next of this.byId.get(id)?.dependencies ?? []) {
        const found = visit(next, [...path, id]);
        if (found) return found;
      }
      finished.add(id);
      return null;
    };
    for (const skill of this.skills) {
      const found = visit(skill.id, []);
      if (found) return found;
    }
    return null;
  }
}
