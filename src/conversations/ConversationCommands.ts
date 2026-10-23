export type CreateConversationThread = Readonly<{
  threadId: string;
  title: string;
  createdAtEpochMs: number;
}>;

/** Reuse all fields, including timestamp, when retrying a command. */
export type AppendConversationMessage = Readonly<{
  threadId: string;
  messageId: string;
  commandId: string;
  role: "user" | "assistant";
  text: string;
  createdAtEpochMs: number;
  runId?: string | null;
  sessionId?: string | null;
}>;
