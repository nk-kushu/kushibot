import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";

export type ConversationThread = Readonly<{
  threadId: string;
  scope: ExecutionScopeRef;
  title: string;
  createdAtEpochMs: number;
}>;
