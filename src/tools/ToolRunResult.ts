export type ToolRunResult =
  | Readonly<{ kind: "not-started" }>
  | Readonly<{ kind: "returned"; value: unknown }>
  | Readonly<{ kind: "uncertain" }>;
