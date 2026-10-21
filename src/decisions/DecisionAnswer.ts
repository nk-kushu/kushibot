export type DecisionAnswer =
  | Readonly<{ kind: "answered"; choice: string; supportingRefs: readonly string[] }>
  | Readonly<{ kind: "abstained"; supportingRefs: readonly string[] }>;
