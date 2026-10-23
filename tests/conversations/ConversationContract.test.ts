import { ConversationContract } from "../../src/conversations/ConversationContract.js";
import { SqlConversationStore } from "../../src/persistence/conversations/SqlConversationStore.js";
import { sqliteConversationStatements } from "../../src/persistence/conversations/sqliteConversationStatements.js";
import { ConversationError } from "../../src/errors/ConversationError.js";
import type { ISqlDatabase } from "../../src/persistence/sql/ISqlDatabase.js";

export async function verifyConversationContracts(): Promise<void> {
  const contract = new ConversationContract();
  const input = {
    threadId: "thread",
    messageId: "message",
    commandId: "command",
    role: "user" as const,
    text: "hello 🐈",
    createdAtEpochMs: 100,
  };
  const validated = contract.message(input);
  input.text = "mutated";
  if (validated.text !== "hello 🐈" || validated.runId !== null || !Object.isFrozen(validated)) {
    throw new Error("Message validation must snapshot immutable normalized content.");
  }
  const invalid = [
    null,
    [],
    { ...input, role: "system" },
    { ...input, text: " " },
    { ...input, text: "x".repeat(262145) },
    { ...input, text: "\uD800" },
    { ...input, text: "\uDC00" },
    { ...input, text: "bad\u0000text" },
    { ...input, messageId: "../escape" },
    { ...input, createdAtEpochMs: Number.NaN },
    { ...input, createdAtEpochMs: -1 },
    { ...input, runId: "" },
    { ...input, sessionId: 123 },
  ];
  for (const value of invalid) {
    let rejected = false;
    try {
      contract.message(value as typeof input);
    } catch (error) {
      if (!(error instanceof ConversationError) || error.code !== "INVALID_INPUT") throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Invalid conversation message accepted.");
  }
  const database: ISqlDatabase = {
    query: async () => {
      throw new Error("Validation must reject before SQL.");
    },
    transaction: async () => {
      throw new Error("Validation must reject before SQL.");
    },
    migrationTransaction: async () => {
      throw new Error("Validation must reject before SQL.");
    },
  };
  const store = new SqlConversationStore(database, sqliteConversationStatements, {
    scopeId: "s",
    projectId: "p",
  });
  const requests = [
    () => store.listMessages("thread", { limit: 0 }),
    () => store.listMessages("thread", { limit: 101 }),
    () => store.listMessages("thread", { limit: 1, afterSequence: -1 }),
    () => store.listThreads({ limit: 1, afterThreadId: "invalid/path" }),
    () => store.appendMessage({ ...input, text: "" }),
  ];
  for (const request of requests) {
    let rejected = false;
    try {
      await request();
    } catch (error) {
      if (!(error instanceof ConversationError) || error.code !== "INVALID_INPUT") throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Invalid repository query accepted.");
  }
}
