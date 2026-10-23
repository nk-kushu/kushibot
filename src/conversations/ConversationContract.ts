import type { ExecutionScopeRef } from "../contracts/runtime/ExecutionScopeRef.js";
import type {
  CreateConversationThread,
  AppendConversationMessage,
} from "./ConversationCommands.js";
import { ConversationError } from "../errors/ConversationError.js";

/** Runtime validation and immutable input snapshots; no database or transport dependency. */
export class ConversationContract {
  id(value: unknown): string {
    if (typeof value !== "string" || !/^[A-Za-z0-9_.:-]{1,128}$/.test(value)) this.invalid();
    return value as string;
  }

  integer(value: unknown, minimum: number): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum)
      this.invalid();
    return value as number;
  }

  limit(value: unknown): number {
    const limit = this.integer(value, 1);
    if (limit > 100) this.invalid();
    return limit;
  }

  scope(value: ExecutionScopeRef): ExecutionScopeRef {
    this.object(value);
    if (Object.keys(value).some((key) => !["scopeId", "projectId", "workspaceId"].includes(key)))
      this.invalid();
    return Object.freeze({
      scopeId: this.id(value.scopeId),
      projectId: this.id(value.projectId),
      ...(value.workspaceId === undefined ? {} : { workspaceId: this.id(value.workspaceId) }),
    });
  }

  thread(value: CreateConversationThread): CreateConversationThread {
    this.object(value);
    return Object.freeze({
      threadId: this.id(value.threadId),
      title: this.text(value.title, 512),
      createdAtEpochMs: this.integer(value.createdAtEpochMs, 0),
    });
  }

  message(value: AppendConversationMessage): Required<AppendConversationMessage> {
    this.object(value);
    if (value.role !== "user" && value.role !== "assistant") this.invalid();
    return Object.freeze({
      threadId: this.id(value.threadId),
      messageId: this.id(value.messageId),
      commandId: this.id(value.commandId),
      role: value.role,
      text: this.text(value.text, 262144),
      createdAtEpochMs: this.integer(value.createdAtEpochMs, 0),
      runId: value.runId == null ? null : this.id(value.runId),
      sessionId: value.sessionId == null ? null : this.id(value.sessionId),
    });
  }

  object(value: unknown): void {
    if (value === null || typeof value !== "object" || Array.isArray(value)) this.invalid();
  }

  private text(value: unknown, maxBytes: number): string {
    if (
      typeof value !== "string" ||
      value.includes("\u0000") ||
      value.trim().length === 0 ||
      new TextEncoder().encode(value).byteLength > maxBytes ||
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)
    )
      this.invalid();
    return value as string;
  }

  private invalid(): never {
    throw new ConversationError("INVALID_INPUT");
  }
}
