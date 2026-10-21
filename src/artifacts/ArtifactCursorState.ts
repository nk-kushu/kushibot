export type ArtifactCursorState = Readonly<{
  artifactId: string; digest: string; mode: "page" | "search"; query: string;
  offset: number; nextLine: number;
}>;
