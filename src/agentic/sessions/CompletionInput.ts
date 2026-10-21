import type { SessionView } from "./SessionView.js";
export type CompletionInput<TResult> = Readonly<{ candidate: TResult; view: SessionView }>;
