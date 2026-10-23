import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type {
  CreateConversationThread,
  AppendConversationMessage,
} from "./ConversationCommands.js";
import type { ConversationThread } from "./ConversationThread.js";
import type { ConversationMessage } from "./ConversationMessage.js";
import type {
  ConversationPage,
  ConversationThreadQuery,
  ConversationMessageQuery,
} from "./ConversationPage.js";

export interface IConversationStore {
  readonly scope: ExecutionScopeRef;
  createThread(
    command: CreateConversationThread,
  ): Promise<Readonly<{ thread: ConversationThread; replayed: boolean }>>;
  getThread(threadId: string): Promise<ConversationThread | null>;
  listThreads(
    query: ConversationThreadQuery,
  ): Promise<ConversationPage<ConversationThread, string>>;
  appendMessage(
    command: AppendConversationMessage,
  ): Promise<Readonly<{ message: ConversationMessage; replayed: boolean }>>;
  getMessage(threadId: string, messageId: string): Promise<ConversationMessage | null>;
  listMessages(
    threadId: string,
    query: ConversationMessageQuery,
  ): Promise<ConversationPage<ConversationMessage, number>>;
}
