import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";

/** Sequence is assigned atomically by the store, starting at one per thread. */
export type ConversationMessage = Readonly<{
  threadId: string;
  messageId: string;
  commandId: string;
  scope: ExecutionScopeRef;
  sequence: number;
  role: "user" | "assistant";
  text: string;
  createdAtEpochMs: number;
  runId: string | null;
  sessionId: string | null;
}>;
