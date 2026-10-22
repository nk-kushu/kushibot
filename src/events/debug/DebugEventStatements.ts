export type DebugEventStatements = Readonly<{
  schema: readonly string[]; ensureStream: string; lockStream: string;
  find: string; counter: string; advance: string; insert: string; page: string;
}>;
