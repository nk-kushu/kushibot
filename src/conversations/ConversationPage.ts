export type ConversationPage<T, TCursor> = Readonly<{
  items: readonly T[];
  nextCursor: TCursor | null;
}>;

/** Threads are ordered by binary thread ID; messages by assigned sequence. */
export type ConversationThreadQuery = Readonly<{ afterThreadId?: string; limit: number }>;
export type ConversationMessageQuery = Readonly<{ afterSequence?: number; limit: number }>;
