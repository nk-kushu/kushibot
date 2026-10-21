export type OpenAiTextRequest = Readonly<{
  model: string; instructions: string;
  input: readonly Readonly<{ role: "user" | "assistant"; content: string }>[];
  max_output_tokens: number; store: false; stream: false; truncation: "disabled"; prompt_cache_key?: string;
}>;
