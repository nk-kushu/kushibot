import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { NodeSqliteDatabase, SqlFilesystemReceiptStore, sqliteFilesystemReceiptStatements } from '../../.test-build/src/index.js';

const scope = { scopeId: 'actor', projectId: 'project', workspaceId: 'workspace' };
const receipt = { operationId: 'op', proposalDigest: 'a'.repeat(64), targetId: 'target', beforeRevision: 'before', afterRevision: 'after', receiptRef: 'receipt:op' };

test('persists immutable receipts across reopen and isolates scopes and targets', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'publication-receipts-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'receipts.sqlite');
  let db = new NodeSqliteDatabase(file);
  let store = new SqlFilesystemReceiptStore(db, sqliteFilesystemReceiptStatements, scope, 'target');
  await store.initialize();
  await store.write(receipt);
  await store.write(receipt);
  await assert.rejects(store.write({ ...receipt, afterRevision: 'different' }));
  await db.close();
  db = new NodeSqliteDatabase(file);
  t.after(() => db.close());
  store = new SqlFilesystemReceiptStore(db, sqliteFilesystemReceiptStatements, scope, 'target');
  assert.deepEqual(await store.read('op'), receipt);
  const other = new SqlFilesystemReceiptStore(db, sqliteFilesystemReceiptStatements, { ...scope, projectId: 'other' }, 'target');
  assert.equal(await other.read('op'), null);
  const otherTarget = new SqlFilesystemReceiptStore(db, sqliteFilesystemReceiptStatements, scope, 'other');
  assert.equal(await otherTarget.read('op'), null);
  await assert.rejects(otherTarget.write(receipt));
});
