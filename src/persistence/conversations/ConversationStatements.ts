export type ConversationStatements = Readonly<{
  schema: readonly string[];
  insertThread: string;
  readThread: string;
  listThreads: string;
  lockThread: string;
  advanceSequence: string;
  readIdentity: string;
  insertMessage: string;
  readMessage: string;
  listMessages: string;
}>;
