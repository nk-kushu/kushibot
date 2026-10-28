import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { FilesystemPublicationTarget } from '../../.test-build/src/index.js';

const hash = async bytes => createHash('sha256').update(bytes).digest('hex');
const digest = { hash };
const bytes = text => new TextEncoder().encode(text);
const ctx = { signal: new AbortController().signal, deadlineEpochMs: null };

async function setup(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'publication-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const data = bytes('new');
  const ref = { artifactId: 'a', digest: await hash(data), byteLength: data.length, mediaType: 'text/plain', schemaId: null, schemaVersion: null };
  let receipt = null;
  const store = { async read() { return receipt; }, async write(value) { receipt = value; } };
  const target = new FilesystemPublicationTarget(root, 'target', { async read() { return { data, metadata: {} }; } }, digest, store, { nowEpochMs: () => 1 });
  const proposal = { id: 'p', digest: 'digest', targetId: 'target', targetRevision: 'baseline', changes: [{ path: 'a.txt', beforeDigest: await hash(bytes('old')), after: ref }] };
  const command = { operationId: 'op', proposalDigest: 'digest' };
  return { root, proposal, command, target, store, ref };
}

test('applies a matching baseline and reconciles from its receipt', async t => {
  const { root, target, proposal, command } = await setup(t);
  await writeFile(path.join(root, 'a.txt'), 'old');
  assert.equal((await target.apply(proposal, command, ctx)).status, 'published');
  assert.equal(await readFile(path.join(root, 'a.txt'), 'utf8'), 'new');
  assert.equal((await target.reconcile(proposal, command, ctx)).status, 'published');
});

test('rejects a stale baseline before writing any files', async t => {
  const { root, target, proposal, command, ref } = await setup(t);
  await writeFile(path.join(root, 'a.txt'), 'changed');
  proposal.changes.push({ path: 'new.txt', beforeDigest: null, after: ref });
  assert.deepEqual(await target.apply(proposal, command, ctx), { status: 'not-applied', code: 'TARGET_CHANGED' });
  await assert.rejects(readFile(path.join(root, 'new.txt')));
});

test('does not follow a symlink target', async t => {
  const { root, target, proposal, command } = await setup(t);
  await writeFile(path.join(root, 'outside.txt'), 'old');
  await symlink(path.join(root, 'outside.txt'), path.join(root, 'a.txt'));
  assert.equal((await target.apply(proposal, command, ctx)).status, 'not-applied');
  assert.equal(await readFile(path.join(root, 'outside.txt'), 'utf8'), 'old');
});

test('does not claim success if receipt storage fails', async t => {
  const { root, target, proposal, command, store } = await setup(t);
  await writeFile(path.join(root, 'a.txt'), 'old');
  store.write = async () => { throw new Error('receipt failed'); };
  assert.equal((await target.apply(proposal, command, ctx)).status, 'unknown');
  assert.equal((await target.reconcile(proposal, command, ctx)).status, 'unknown');
});
