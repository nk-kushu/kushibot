export type PromptCachePolicyDecision =
  | Readonly<{ kind: "provider-default" }>
  | Readonly<{ kind: "keyed"; key: string }>
  | Readonly<{ kind: "unsupported"; code: "PROMPT_CACHE_KEY_UNSUPPORTED" }>;
