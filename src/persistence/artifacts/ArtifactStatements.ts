export type ArtifactStatements = Readonly<{
  schema: readonly string[]; readVersion: string; installVersion: string;
  ensureScope: string; lockScope: string; totals: string;
  findOperation: string; load: string; insertMetadata: string; insertChunk: string; readChunk: string;
  countPins: string; hasPin: string; insertPin: string; deletePin: string;
  deleteChunks: string; deleteMetadata: string;
}>;
