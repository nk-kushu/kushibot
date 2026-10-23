# Durable conversations

Kushibot provides a reusable `IConversationStore` with a scope-bound
`SqlConversationStore` implementation and PostgreSQL/SQLite statement sets.
The package still does not bundle a database driver.

Conversation threads are application conversations, independent of any one
agent execution. Messages are append-only user or assistant text. Optional run
and session IDs link a message to agent work without making conversation history
an execution journal. The existing `ISessionJournal` remains a separate contract;
there is no automatic message capture or journal-to-chat projection.

## Usage

```ts
import { SqlConversationStore, postgresqlConversationStatements } from "kushibot";
import type { ISqlDatabase, IConversationStore } from "kushibot";

async function example(database: ISqlDatabase) {
  const store = new SqlConversationStore(database, postgresqlConversationStatements, {
    scopeId: "local",
    projectId: "project-1",
    workspaceId: "workspace-1",
  });
  await store.initialize();
  return saveConversation(store);
}

async function saveConversation(store: IConversationStore) {
  await store.createThread({
    threadId: "thread-1",
    title: "Implement project search",
    createdAtEpochMs: 1700000000000,
  });
  const command = {
    threadId: "thread-1",
    messageId: "message-1",
    commandId: "send-1",
    role: "user" as const,
    text: "Add project search",
    createdAtEpochMs: 1700000000001,
    runId: "run-1",
    sessionId: "session-1",
  };
  const first = await store.appendMessage(command);
  const retried = await store.appendMessage(command);
  // first.replayed === false, retried.replayed === true; both have sequence 1.
  const page = await store.listMessages("thread-1", { limit: 50 });
  return { first, retried, page };
}
```

Inject `IConversationStore` into consumers. Use `sqliteConversationStatements`
with the same class and a SQLite binding. Factories and HTTP endpoints are host
concerns; root exports are the supported package integration surface.

## Storage guarantees

- Every operation is bound to `scopeId`, `projectId`, and optional `workspaceId`.
  An absent workspace is distinct from every named workspace. These references
  partition storage; the host must authorize the actor before constructing a store.
- Thread creation is idempotent by thread ID within the effective scope. Reusing
  it with a different title or creation timestamp raises `IDENTITY_CONFLICT`.
- Message and command IDs are unique **within a thread**. Replay requires the same
  message ID, command ID, role, exact text, timestamp, and run/session references.
  Changed content or an ID collision raises `IDENTITY_CONFLICT`. Preserve timestamps
  and IDs on retry; do not regenerate them for every HTTP attempt.
- Each successful new append gets a contiguous sequence starting at one. Ordering
  follows serialized commit order, not caller timestamps, message IDs, or run IDs.
  A per-thread transactional write lock serializes concurrent writers. Message
  insertion and advancing the sequence counter commit or roll back together.
- History is paged in ascending sequence using `afterSequence`. Thread listing uses
  ascending binary thread ID with `afterThreadId`. Limits are 1–100. `nextCursor`
  is returned only when another row exists at read time; it is not a snapshot or
  a subscription. After reaching the tail, retain the last seen sequence to poll
  for future messages. Concurrent appends do not shift existing sequence cursors.
- IDs use the framework's ASCII identifier convention (1–128 characters).
  Titles are bounded to 512 UTF-8 bytes and message text to 256 KiB. Both require
  nonblank, well-formed text without NUL characters. Large attachments belong in
  artifact storage, referenced through a separately designed contract.
- Run/session references are optional identifiers, not foreign keys into execution
  tables. Hosts must verify the referenced execution exists, belongs to the scope,
  and may be linked by the actor. Messages can exist before execution starts;
  there is no automatic run launch or transcript generation.
- `getThread` and `getMessage` return `null` for missing/inaccessible scoped records.
  Appending to or listing history of a nonexistent thread raises `NOT_FOUND`.
  Inputs fail with `INVALID_INPUT`; malformed stored rows fail with `CORRUPT_RECORD`.
  Driver failures become a safe `PersistenceError` without exposing SQL/credentials.
- Appends do not support edits, deletes, renaming, system/tool message roles,
  branching, or token streaming. Those require explicit future contracts.

## Database binding and schema

`initialize()` runs the v1 thread/message schema in `migrationTransaction()`.
Tables are `kushibot_conversation_threads_v1` and
`kushibot_conversation_messages_v1`; all keys include effective scope and thread.
The schema includes message/command/sequence uniqueness and a scoped thread
foreign key. Initialize it during controlled application startup, before admitting
requests; there is no migration on individual reads/writes.

Follow `ISqlDatabase`: pin one connection for each transaction, roll back failed
callbacks, serialize migrations with bounded lock waits, and return safe JavaScript
numbers for BIGINT values and affected row counts. PostgreSQL bindings must convert
BIGINT result strings without losing precision. SQLite bindings must serialize
transactions, enable foreign keys, and use an appropriate write/busy policy across
connections. Handle busy/connection failures by retrying the complete operation
with the original command; the store does not retry a partially failed transaction.

Conversation tables and framework execution stores can share a database, but
`appendMessage()` owns its transaction. It is not atomic with launching a workflow,
changing application tasks, or writing another store. Hosts need durable launch
intent and reconciliation for those workflows. Unknown commit outcomes are resolved
by retrying the identical command and reading its saved receipt/message.

## Verification

The ordinary `npm test` suite checks runtime contracts and input rejection. Real
SQLite acceptance uses Node.js's built-in `node:sqlite` (use Node.js 24 or newer):

```sh
npm run test:conversations
```

This runs actual SQL against a temporary on-disk database, reopens it to verify
durability, injects a post-insert failure to verify rollback, and uses four child
processes to verify concurrent writers. It also checks retry conflicts, role/text
preservation, run/session links, scope isolation, and cursor boundaries.

For PostgreSQL, provide a host-installed `pg` driver module and a **disposable test
database**. The test adds isolated scope data; it does not clean a shared database.
No driver dependency is added to Kushibot:

```sh
CONVERSATION_PG_DRIVER=/absolute/path/node_modules/pg/lib/index.js \
CONVERSATION_DATABASE_URL=postgresql://user:password@localhost:5432/disposable_test \
npm run test:conversations:postgres
```

Both dialects run the same acceptance cases; PostgreSQL additionally exercises
concurrent transactions through separate pooled connections. This harness is an
example binding for tests, not an application database adapter.
