export type PartialProgress = Readonly<{
  summary: string;
  evidenceRefs: readonly string[];
  artifactRefs: readonly string[];
  unresolved: readonly string[];
}>;
