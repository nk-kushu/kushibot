export type SqlResult = Readonly<{
  rows: readonly Readonly<Record<string, unknown>>[];
  affectedRows: number;
}>;
