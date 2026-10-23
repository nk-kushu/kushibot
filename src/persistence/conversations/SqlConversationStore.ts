import type { ExecutionScopeRef } from "../../contracts/runtime/ExecutionScopeRef.js";
import type { IConversationStore } from "../../conversations/IConversationStore.js";
import type { ConversationThread } from "../../conversations/ConversationThread.js";
import type { ConversationMessage } from "../../conversations/ConversationMessage.js";
import type {
  CreateConversationThread,
  AppendConversationMessage,
} from "../../conversations/ConversationCommands.js";
import type {
  ConversationPage,
  ConversationThreadQuery,
  ConversationMessageQuery,
} from "../../conversations/ConversationPage.js";
import type { ISqlDatabase } from "../sql/ISqlDatabase.js";
import type { ISqlExecutor } from "../sql/ISqlExecutor.js";
import type { ConversationStatements } from "./ConversationStatements.js";
import { ConversationContract } from "../../conversations/ConversationContract.js";
import { ConversationError } from "../../errors/ConversationError.js";
import { PersistenceError } from "../../errors/PersistenceError.js";

/** Driver-neutral durable conversation repository, bound to one trusted effective scope. */
export class SqlConversationStore implements IConversationStore {
  readonly scope: ExecutionScopeRef;
  private readonly scopeKey: readonly string[];
  private readonly contract = new ConversationContract();

  constructor(
    private readonly db: ISqlDatabase,
    private readonly sql: ConversationStatements,
    scope: ExecutionScopeRef,
  ) {
    this.scope = this.contract.scope(scope);
    this.scopeKey = Object.freeze([
      this.scope.scopeId,
      this.scope.projectId,
      this.scope.workspaceId ?? "",
    ]);
  }

  initialize(): Promise<void> {
    return this.storage(async () =>
      this.db.migrationTransaction(async (tx) => {
        for (const statement of this.sql.schema) await tx.query(statement, []);
      }),
    );
  }

  createThread(
    input: CreateConversationThread,
  ): Promise<Readonly<{ thread: ConversationThread; replayed: boolean }>> {
    const command = this.contract.thread(input);
    return this.storage(() =>
      this.db.transaction(async (tx) => {
        const inserted = await tx.query(this.sql.insertThread, [
          ...this.scopeKey,
          command.threadId,
          command.title,
          command.createdAtEpochMs,
        ]);
        if (inserted.affectedRows !== 0 && inserted.affectedRows !== 1) this.corrupt();
        const thread = await this.loadThread(tx, command.threadId);
        if (thread === null) this.corrupt();
        if (thread.title !== command.title || thread.createdAtEpochMs !== command.createdAtEpochMs)
          this.conflict();
        return Object.freeze({ thread, replayed: inserted.affectedRows === 0 });
      }),
    );
  }

  getThread(threadId: string): Promise<ConversationThread | null> {
    const id = this.contract.id(threadId);
    return this.storage(() => this.loadThread(this.db, id));
  }

  listThreads(
    query: ConversationThreadQuery,
  ): Promise<ConversationPage<ConversationThread, string>> {
    this.contract.object(query);
    const after = query.afterThreadId === undefined ? "" : this.contract.id(query.afterThreadId);
    const limit = this.contract.limit(query.limit);
    return this.storage(async () => {
      const rows = (await this.db.query(this.sql.listThreads, [...this.scopeKey, after, limit + 1]))
        .rows;
      if (rows.length > limit + 1) this.corrupt();
      const threads = rows.map((row) => this.threadRow(row));
      let previous = after;
      for (const thread of threads) {
        if (thread.threadId <= previous) this.corrupt();
        previous = thread.threadId;
      }
      const items = Object.freeze(threads.slice(0, limit));
      return Object.freeze({
        items,
        nextCursor: threads.length > limit ? items[items.length - 1].threadId : null,
      });
    });
  }

  appendMessage(
    input: AppendConversationMessage,
  ): Promise<Readonly<{ message: ConversationMessage; replayed: boolean }>> {
    const command = this.contract.message(input);
    return this.storage(() =>
      this.db.transaction(async (tx) => {
        const key = [...this.scopeKey, command.threadId];
        // Serializes writers per thread on PostgreSQL and obtains SQLite's write lock.
        if ((await tx.query(this.sql.lockThread, key)).affectedRows !== 1)
          throw new ConversationError("NOT_FOUND");
        const existing = (
          await tx.query(this.sql.readIdentity, [...key, command.messageId, command.commandId])
        ).rows;
        if (existing.length > 0) {
          if (existing.length !== 1) this.conflict();
          const message = this.messageRow(existing[0]);
          if (message.threadId !== command.threadId || !this.sameMessage(message, command))
            this.conflict();
          return Object.freeze({ message, replayed: true });
        }
        const threadRows = (await tx.query(this.sql.readThread, key)).rows;
        if (threadRows.length !== 1 || this.threadRow(threadRows[0]).threadId !== command.threadId)
          this.corrupt();
        const sequence = this.contract.integer(threadRows[0].next_sequence, 1);
        if (!Number.isSafeInteger(sequence + 1))
          throw new ConversationError("INVALID_INPUT", "Conversation sequence exhausted.");
        const inserted = await tx.query(this.sql.insertMessage, [
          ...key,
          command.messageId,
          command.commandId,
          sequence,
          command.role,
          command.text,
          command.createdAtEpochMs,
          command.runId,
          command.sessionId,
        ]);
        if (inserted.affectedRows !== 1) this.corrupt();
        if (
          (await tx.query(this.sql.advanceSequence, [sequence + 1, ...key, sequence]))
            .affectedRows !== 1
        )
          this.corrupt();
        const message = Object.freeze({ ...command, scope: this.scope, sequence });
        return Object.freeze({ message, replayed: false });
      }),
    );
  }

  getMessage(threadId: string, messageId: string): Promise<ConversationMessage | null> {
    const thread = this.contract.id(threadId),
      message = this.contract.id(messageId);
    return this.storage(async () => {
      const rows = (await this.db.query(this.sql.readMessage, [...this.scopeKey, thread, message]))
        .rows;
      if (rows.length === 0) return null;
      if (rows.length !== 1) this.corrupt();
      const result = this.messageRow(rows[0]);
      if (result.threadId !== thread || result.messageId !== message) this.corrupt();
      return result;
    });
  }

  listMessages(
    threadId: string,
    query: ConversationMessageQuery,
  ): Promise<ConversationPage<ConversationMessage, number>> {
    const thread = this.contract.id(threadId);
    this.contract.object(query);
    const after =
      query.afterSequence === undefined ? 0 : this.contract.integer(query.afterSequence, 0);
    const limit = this.contract.limit(query.limit);
    return this.storage(async () => {
      if ((await this.loadThread(this.db, thread)) === null)
        throw new ConversationError("NOT_FOUND");
      const rows = (
        await this.db.query(this.sql.listMessages, [...this.scopeKey, thread, after, limit + 1])
      ).rows;
      if (rows.length > limit + 1) this.corrupt();
      const messages = rows.map((row) => this.messageRow(row));
      let previous = after;
      for (const message of messages) {
        if (message.threadId !== thread || message.sequence <= previous) this.corrupt();
        previous = message.sequence;
      }
      const items = Object.freeze(messages.slice(0, limit));
      return Object.freeze({
        items,
        nextCursor: messages.length > limit ? items[items.length - 1].sequence : null,
      });
    });
  }

  private async loadThread(tx: ISqlExecutor, threadId: string): Promise<ConversationThread | null> {
    const rows = (await tx.query(this.sql.readThread, [...this.scopeKey, threadId])).rows;
    if (rows.length === 0) return null;
    if (rows.length !== 1) this.corrupt();
    const thread = this.threadRow(rows[0]);
    if (thread.threadId !== threadId) this.corrupt();
    return thread;
  }

  private threadRow(row: Readonly<Record<string, unknown>>): ConversationThread {
    try {
      const value = this.contract.thread({
        threadId: row.thread_id as string,
        title: row.title as string,
        createdAtEpochMs: row.created_at as number,
      });
      this.contract.integer(row.next_sequence, 1);
      return Object.freeze({ ...value, scope: this.scope });
    } catch {
      return this.corrupt();
    }
  }

  private messageRow(row: Readonly<Record<string, unknown>>): ConversationMessage {
    try {
      if (
        row.scope_id !== this.scope.scopeId ||
        row.project_id !== this.scope.projectId ||
        row.workspace_key !== (this.scope.workspaceId ?? "") ||
        (row.run_id !== null && typeof row.run_id !== "string") ||
        (row.session_id !== null && typeof row.session_id !== "string")
      )
        this.corrupt();
      const value = this.contract.message({
        threadId: row.thread_id as string,
        messageId: row.message_id as string,
        commandId: row.command_id as string,
        role: row.role as "user" | "assistant",
        text: row.text as string,
        createdAtEpochMs: row.created_at as number,
        runId: row.run_id as string | null,
        sessionId: row.session_id as string | null,
      });
      return Object.freeze({
        ...value,
        scope: this.scope,
        sequence: this.contract.integer(row.sequence, 1),
      });
    } catch {
      return this.corrupt();
    }
  }

  private sameMessage(
    message: ConversationMessage,
    command: Required<AppendConversationMessage>,
  ): boolean {
    return (
      message.messageId === command.messageId &&
      message.commandId === command.commandId &&
      message.role === command.role &&
      message.text === command.text &&
      message.createdAtEpochMs === command.createdAtEpochMs &&
      message.runId === command.runId &&
      message.sessionId === command.sessionId
    );
  }

  private conflict(): never {
    throw new ConversationError("IDENTITY_CONFLICT");
  }
  private corrupt(): never {
    throw new ConversationError("CORRUPT_RECORD");
  }
  private async storage<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof ConversationError || error instanceof PersistenceError) throw error;
      throw new PersistenceError("Conversation persistence failed.");
    }
  }
}
