export type ContextFragment = Readonly<{ id: string; kind: "source" | "observation" | "memory" | "summary" | "handoff";
  revisionRef: string; sourceRef: string; text: string; priority: number }>;
