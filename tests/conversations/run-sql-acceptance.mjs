import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
  SqlConversationStore,
  sqliteConversationStatements,
  postgresqlConversationStatements,
  ConversationError,
  PersistenceError,
} from "../../dist/index.js";

// Real drivers live in this acceptance harness, not in the framework package.
class SqliteBinding {
  constructor(database) {
    this.database = database;
    this.tail = Promise.resolve();
  }
  static async open(filename) {
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(filename);
    db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=15000;");
    return new SqliteBinding(db);
  }
  async query(sql, parameters) {
    return this.enqueue(() => this.execute(sql, parameters));
  }
  execute(sql, parameters) {
    const statement = this.database.prepare(sql);
    if (/^\s*SELECT/i.test(sql)) return { rows: statement.all(...parameters), affectedRows: 0 };
    return { rows: [], affectedRows: Number(statement.run(...parameters).changes) };
  }
  transaction(work) {
    return this.enqueue(async () => {
      this.database.exec("BEGIN IMMEDIATE");
      try {
        const value = await work({
          query: async (sql, parameters) => this.execute(sql, parameters),
        });
        this.database.exec("COMMIT");
        return value;
      } catch (error) {
        this.database.exec("ROLLBACK");
        throw error;
      }
    });
  }
  migrationTransaction(work) {
    return this.transaction(work);
  }
  enqueue(work) {
    const result = this.tail.then(work);
    this.tail = result.catch(() => {});
    return result;
  }
  async close() {
    await this.tail;
    this.database.close();
  }
}

class PostgresBinding {
  constructor(pool) {
    this.pool = pool;
  }
  static async open() {
    const module = process.env.CONVERSATION_PG_DRIVER;
    if (!module || !process.env.CONVERSATION_DATABASE_URL)
      throw new Error("PostgreSQL requires CONVERSATION_PG_DRIVER and CONVERSATION_DATABASE_URL.");
    const pg = await import(pathToFileURL(module).href);
    const { Pool, types } = pg.default ?? pg;
    types.setTypeParser(20, (value) => {
      const parsed = Number(value);
      if (!Number.isSafeInteger(parsed)) throw new Error("Unsafe PostgreSQL integer.");
      return parsed;
    });
    return new PostgresBinding(
      new Pool({ connectionString: process.env.CONVERSATION_DATABASE_URL }),
    );
  }
  async query(sql, parameters) {
    return this.result(await this.pool.query(sql, parameters));
  }
  async transaction(work) {
    return this.transact(work, false);
  }
  async migrationTransaction(work) {
    return this.transact(work, true);
  }
  async transact(work, migration) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (migration) {
        await client.query("SET LOCAL lock_timeout='10s'");
        await client.query("SELECT pg_advisory_xact_lock(884112)");
      }
      const value = await work({
        query: async (sql, parameters) => this.result(await client.query(sql, parameters)),
      });
      await client.query("COMMIT");
      return value;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  result(value) {
    return { rows: value.rows, affectedRows: value.rowCount ?? 0 };
  }
  async close() {
    await this.pool.end();
  }
}

class FailSequenceOnce {
  constructor(database, statements) {
    this.database = database;
    this.statements = statements;
    this.armed = true;
  }
  query(sql, parameters) {
    return this.database.query(sql, parameters);
  }
  migrationTransaction(work) {
    return this.database.migrationTransaction(work);
  }
  transaction(work) {
    return this.database.transaction((tx) =>
      work({
        query: (sql, parameters) => {
          if (this.armed && sql === this.statements.advanceSequence) {
            this.armed = false;
            throw new Error("Injected failure after message INSERT.");
          }
          return tx.query(sql, parameters);
        },
      }),
    );
  }
}

// Simulate a committed transaction whose acknowledgement was lost to the caller.
class LoseCommitAcknowledgement {
  constructor(database) {
    this.database = database;
  }
  query(sql, parameters) {
    return this.database.query(sql, parameters);
  }
  migrationTransaction(work) {
    return this.database.migrationTransaction(work);
  }
  async transaction(work) {
    await this.database.transaction(work);
    throw new Error("Commit acknowledgement lost.");
  }
}

const worker = process.argv[2] === "--worker";
const postgres = process.argv[2] === "--postgres";
const statements = postgres ? postgresqlConversationStatements : sqliteConversationStatements;
const directory =
  !worker && !postgres ? await mkdtemp(join(tmpdir(), "kushibot-conversations-")) : null;
const filename = worker
  ? process.argv[3]
  : directory
    ? join(directory, "conversations.sqlite")
    : null;
const scope = worker
  ? JSON.parse(process.argv[4])
  : { scopeId: "scope-" + randomUUID(), projectId: "project", workspaceId: "workspace" };
const open = () => (postgres ? PostgresBinding.open() : SqliteBinding.open(filename));
let database = await open();

if (worker) {
  try {
    const store = new SqlConversationStore(database, statements, scope);
    for (let i = 0; i < 5; i++) {
      const id = `worker-${process.argv[5]}-${i}`;
      await store.appendMessage({
        threadId: "cross-process",
        messageId: id,
        commandId: id,
        role: "user",
        text: id,
        createdAtEpochMs: i,
      });
    }
  } finally {
    await database.close();
  }
  process.exit(0);
}

try {
  let store = new SqlConversationStore(database, statements, scope);
  await store.initialize();
  await store.initialize();
  const thread = { threadId: "thread-a", title: "Coding chat", createdAtEpochMs: 1700000000000 };
  assert.equal((await store.createThread(thread)).replayed, false);
  assert.equal((await store.createThread(thread)).replayed, true);
  await assert.rejects(
    async () => store.createThread({ ...thread, title: "Changed" }),
    (error) => error instanceof ConversationError && error.code === "IDENTITY_CONFLICT",
  );
  for (const threadId of ["thread-c", "thread-b"])
    await store.createThread({ ...thread, threadId });
  const page1 = await store.listThreads({ limit: 2 });
  assert.deepEqual(
    page1.items.map((t) => t.threadId),
    ["thread-a", "thread-b"],
  );
  assert.equal(page1.nextCursor, "thread-b");
  const page2 = await store.listThreads({ limit: 2, afterThreadId: page1.nextCursor });
  assert.deepEqual(
    page2.items.map((t) => t.threadId),
    ["thread-c"],
  );
  assert.equal(page2.nextCursor, null);
  const first = {
    threadId: thread.threadId,
    messageId: "message-1",
    commandId: "send-1",
    role: "user",
    text: "Build a feature 🐈",
    createdAtEpochMs: thread.createdAtEpochMs,
    runId: "run-1",
    sessionId: "session-1",
  };
  const saved = await store.appendMessage(first);
  assert.equal(saved.replayed, false);
  assert.equal(saved.message.sequence, 1);
  assert.equal((await store.appendMessage(first)).replayed, true);
  assert.deepEqual((await store.appendMessage(first)).message, saved.message);
  for (const conflict of [
    { text: "other" },
    { role: "assistant" },
    { messageId: "different-id" },
    { commandId: "different-command" },
    { runId: "other-run" },
    { sessionId: "other-session" },
    { createdAtEpochMs: 0 },
  ]) {
    await assert.rejects(
      async () => store.appendMessage({ ...first, ...conflict }),
      (error) => error instanceof ConversationError && error.code === "IDENTITY_CONFLICT",
    );
  }
  await store.appendMessage({
    ...first,
    messageId: "message-2",
    commandId: "send-2",
    role: "assistant",
    text: "Done",
    createdAtEpochMs: 0,
  });
  const history = await store.listMessages(thread.threadId, { limit: 1 });
  assert.equal(history.items[0].messageId, first.messageId);
  assert.equal(history.nextCursor, 1);
  const remainder = await store.listMessages(thread.threadId, { limit: 1, afterSequence: 1 });
  assert.equal(remainder.items[0].sequence, 2);
  assert.equal(remainder.items[0].role, "assistant");
  assert.equal(remainder.nextCursor, null);
  assert.equal(
    (await store.listMessages(thread.threadId, { limit: 10, afterSequence: 2 })).items.length,
    0,
  );
  const otherScopes = [
    { ...scope, scopeId: scope.scopeId + "-other" },
    { ...scope, projectId: "other" },
    { ...scope, workspaceId: "other" },
    { scopeId: scope.scopeId, projectId: scope.projectId },
  ];
  for (const otherScope of otherScopes) {
    const other = new SqlConversationStore(database, statements, otherScope);
    assert.equal(await other.getThread(thread.threadId), null);
    assert.equal(await other.getMessage(thread.threadId, first.messageId), null);
    assert.equal((await other.listThreads({ limit: 10 })).items.length, 0);
    await assert.rejects(
      async () => other.listMessages(thread.threadId, { limit: 10 }),
      (error) => error.code === "NOT_FOUND",
    );
    await assert.rejects(
      async () => other.appendMessage(first),
      (error) => error.code === "NOT_FOUND",
    );
    await other.createThread(thread);
    const isolated = await other.appendMessage(first);
    assert.equal(isolated.message.sequence, 1);
    assert.equal(isolated.replayed, false);
  }
  assert.equal(await store.getMessage("thread-b", first.messageId), null);
  await assert.rejects(
    async () => store.appendMessage({ ...first, threadId: "missing" }),
    (error) => error.code === "NOT_FOUND",
  );
  const failing = new SqlConversationStore(
    new FailSequenceOnce(database, statements),
    statements,
    scope,
  );
  const rollbackMessage = { ...first, messageId: "rollback", commandId: "rollback" };
  await assert.rejects(
    async () => failing.appendMessage(rollbackMessage),
    (error) => error instanceof PersistenceError,
  );
  assert.equal(await store.getMessage(thread.threadId, "rollback"), null);
  assert.equal((await store.appendMessage(rollbackMessage)).message.sequence, 3);
  const duplicates = await Promise.all(
    Array.from({ length: 10 }, () =>
      store.appendMessage({ ...first, messageId: "duplicate", commandId: "duplicate" }),
    ),
  );
  assert.equal(duplicates.filter((result) => !result.replayed).length, 1);
  assert(duplicates.every((result) => result.message.sequence === 4));
  const concurrent = await Promise.all(
    Array.from({ length: 20 }, (_, i) =>
      store.appendMessage({ ...first, messageId: `parallel-${i}`, commandId: `parallel-${i}` }),
    ),
  );
  assert.deepEqual(
    concurrent.map((result) => result.message.sequence).sort((a, b) => a - b),
    Array.from({ length: 20 }, (_, i) => i + 5),
  );
  const uncertain = new SqlConversationStore(
    new LoseCommitAcknowledgement(database),
    statements,
    scope,
  );
  const uncertainCommand = { ...first, messageId: "uncertain", commandId: "uncertain" };
  await assert.rejects(
    async () => uncertain.appendMessage(uncertainCommand),
    (error) => error instanceof PersistenceError,
  );
  const recovered = await store.appendMessage(uncertainCommand);
  assert.equal(recovered.replayed, true);
  assert.equal(recovered.message.sequence, 25);

  // Readers see committed data after rebuilding both driver and store.
  await database.close();
  database = await open();
  store = new SqlConversationStore(database, statements, scope);
  assert.deepEqual(await store.getMessage(thread.threadId, first.messageId), saved.message);
  const all = await store.listMessages(thread.threadId, { limit: 100 });
  assert.equal(all.items.length, 25);
  assert.equal(all.nextCursor, null);
  assert.deepEqual(
    all.items.map((m) => m.sequence),
    Array.from({ length: 25 }, (_, i) => i + 1),
  );
  await store.createThread({ ...thread, threadId: "cross-process" });
  if (!postgres) {
    await Promise.all(
      Array.from(
        { length: 4 },
        (_, i) =>
          new Promise((resolve, reject) => {
            const child = spawn(
              process.execPath,
              [
                new URL(import.meta.url).pathname,
                "--worker",
                filename,
                JSON.stringify(scope),
                String(i),
              ],
              { stdio: ["ignore", "ignore", "pipe"] },
            );
            let errors = "";
            child.stderr.on("data", (data) => {
              errors += data;
            });
            child.once("error", reject);
            child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(errors))));
          }),
      ),
    );
    const crossProcess = await store.listMessages("cross-process", { limit: 100 });
    assert.equal(crossProcess.items.length, 20);
    assert.deepEqual(
      crossProcess.items.map((message) => message.sequence),
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  }
  console.log(
    `${postgres ? "PostgreSQL" : "SQLite"} conversation acceptance passed: durability, ordering, pagination, scope isolation, links, retries, concurrent appends, and rollback.`,
  );
} finally {
  await database.close();
  if (directory) await rm(directory, { recursive: true, force: true });
}
