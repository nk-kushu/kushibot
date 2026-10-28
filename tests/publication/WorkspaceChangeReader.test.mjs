import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { WorkspaceChangeReader } from '../../.test-build/src/index.js';

const digest = { async hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); } };
async function fixture(change) {
  const data = new TextEncoder().encode(JSON.stringify(change));
  const reference = { artifactId: 'change', digest: await digest.hash(data), byteLength: data.length, mediaType: 'application/json', schemaId: 'workspace-change', schemaVersion: '1' };
  const reader = new WorkspaceChangeReader({ async read() { return { data, metadata: {} }; } }, digest);
  return { reference, reader };
}

test('reads the recorded versions and rejects a different path or digest', async () => {
  const change = { path: 'src/a.ts', before: 'old', after: 'new' };
  const { reference, reader } = await fixture(change);
  assert.deepEqual(await reader.read(reference, change.path), change);
  await assert.rejects(reader.read(reference, 'src/other.ts'));
  await assert.rejects(reader.read({ ...reference, digest: '0'.repeat(64) }, change.path));
});

test('rejects paths outside the workspace', async () => {
  const { reference, reader } = await fixture({ path: '../a', before: null, after: 'new' });
  await assert.rejects(reader.read(reference, '../a'));
});

test('builds a proposal from validated change evidence', async () => {
  const { WorkspaceProposalBuilder } = await import('../../.test-build/src/index.js');
  const change = { path: 'src/a.ts', before: 'old', after: 'new' };
  const { reference, reader } = await fixture(change);
  let body;
  const builder = new WorkspaceProposalBuilder(reader, { async create(value) { body = value; return { proposal: value }; } }, digest, {
    async write(request) { return { artifactId: 'after', digest: await digest.hash(request.data), byteLength: request.data.length, mediaType: request.mediaType, schemaId: null, schemaVersion: null }; },
  });
  const result = { summary: 'Update', baseSnapshotRef: 'base', resultSnapshotRef: 'result', changedPaths: [change.path], changeArtifactRefs: ['artifact:change'], unresolved: [] };
  const context = { scope: { scopeId: 'scope', projectId: 'project' }, signal: new AbortController().signal };
  await builder.create({ id: 'proposal', targetId: 'target', policy: { id: 'policy', version: '1' }, result, artifacts: { 'artifact:change': reference } }, context);
  assert.equal(body.sourceSnapshotRef, 'result');
  assert.equal(body.changes[0].beforeDigest, await digest.hash(new TextEncoder().encode('old')));
  assert.equal(body.changes[0].after.digest, await digest.hash(new TextEncoder().encode('new')));
  await assert.rejects(builder.create({ id: 'proposal', targetId: 'target', policy: { id: 'policy', version: '1' }, result: { ...result, unresolved: ['failed check'] }, artifacts: { 'artifact:change': reference } }, context));
});

test('local workspace artifacts persist proposal content and can be reopened', async t => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { LocalWorkspaceArtifacts, WorkspaceProposalBuilder } = await import('../../.test-build/src/index.js');
  const directory = await mkdtemp(path.join(tmpdir(), 'workspace-artifacts-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  let local = await LocalWorkspaceArtifacts.open('/example/workspace', directory);
  const data = new TextEncoder().encode(JSON.stringify({ path: 'a.txt', before: 'old', after: 'new' }));
  const ref = await local.services.store.write({ name: 'change', kind: 'workspace-change', mediaType: 'application/json', schemaId: 'workspace-change', schemaVersion: '1', sourceRefs: ['snapshot:base'], idempotencyKey: 'change:one', expiresAtEpochMs: null, data });
  const builder = new WorkspaceProposalBuilder(new WorkspaceChangeReader(local.services.store, digest), { async create(value) { return value; } }, digest, local.services.store);
  const result = { summary: 'Update', baseSnapshotRef: 'base', resultSnapshotRef: 'result', changedPaths: ['a.txt'], changeArtifactRefs: [`artifact:${ref.artifactId}`], unresolved: [] };
  const context = { scope: { scopeId: 'scope', projectId: 'project' }, signal: new AbortController().signal };
  const proposal = await builder.create({ id: 'proposal', targetId: 'target', policy: { id: 'policy', version: '1' }, result, artifacts: { [`artifact:${ref.artifactId}`]: ref } }, context);
  await local.close();
  local = await LocalWorkspaceArtifacts.open('/example/workspace', directory);
  t.after(() => local.close());
  const document = await local.services.store.read(proposal.changes[0].after, 65536);
  assert.equal(new TextDecoder().decode(document.data), 'new');
});

test('persists a proposal derived from a completed local coding result', async t => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { LocalWorkspaceArtifacts, LocalWorkspaceProposalService, NodeSqliteDatabase, sqlitePublicationStatements } = await import('../../.test-build/src/index.js');
  const directory = await mkdtemp(path.join(tmpdir(), 'proposal-service-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const local = await LocalWorkspaceArtifacts.open('/example/project', directory);
  const data = new TextEncoder().encode(JSON.stringify({ path: 'a.txt', before: 'old', after: 'new' }));
  const ref = await local.services.store.write({ name: 'change', kind: 'workspace-change', mediaType: 'application/json', schemaId: 'workspace-change', schemaVersion: '1', sourceRefs: ['snapshot:base'], idempotencyKey: 'change:one', expiresAtEpochMs: null, data });
  await local.close();
  const db = new NodeSqliteDatabase(path.join(directory, 'proposals.sqlite'));
  t.after(() => db.close());
  const input = { id: 'run', workspace: '/example/project', targetId: 'target', scope: { scopeId: 'actor', projectId: 'project' }, result: { summary: 'Update', baseSnapshotRef: 'base', resultSnapshotRef: 'result', changedPaths: ['a.txt'], changeArtifactRefs: [`artifact:${ref.artifactId}`], unresolved: [] }, artifacts: { [`artifact:${ref.artifactId}`]: ref } };
  const first = await new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory).create(input);
  const reopened = await new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory).create(input);
  assert.deepEqual(reopened, first);
  assert.equal(first.proposal.changes[0].path, 'a.txt');
  const review = await new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory).review(input);
  assert.deepEqual(review, { id: 'run', digest: first.proposal.digest, summary: 'Update', status: 'ready', changes: [{ path: 'a.txt', before: 'old', after: 'new' }] });
  await assert.rejects(new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory).review({ ...input, artifacts: {} }));
  assert.equal(await new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory).review({ ...input, id: 'missing' }), null);
});

test('applies only an approved recorded proposal and persists the outcome', async t => {
  const { mkdtemp, mkdir, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { LocalWorkspaceArtifacts, LocalWorkspaceProposalService, LocalWorkspacePublicationService, NodeSqliteDatabase, sqlitePublicationStatements, sqliteFilesystemReceiptStatements } = await import('../../.test-build/src/index.js');
  const directory = await mkdtemp(path.join(tmpdir(), 'publish-service-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace');
  await mkdir(workspace);
  await writeFile(path.join(workspace, 'a.txt'), 'old');
  const local = await LocalWorkspaceArtifacts.open(workspace, directory);
  const data = new TextEncoder().encode(JSON.stringify({ path: 'a.txt', before: 'old', after: 'new' }));
  const ref = await local.services.store.write({ name: 'change', kind: 'workspace-change', mediaType: 'application/json', schemaId: 'workspace-change', schemaVersion: '1', sourceRefs: ['snapshot:base'], idempotencyKey: 'change:one', expiresAtEpochMs: null, data });
  await local.close();
  const db = new NodeSqliteDatabase(path.join(directory, 'proposals.sqlite'));
  t.after(() => db.close());
  const input = { id: 'run', workspace, targetId: 'target', scope: { scopeId: 'actor', projectId: 'project' }, result: { summary: 'Update', baseSnapshotRef: 'base', resultSnapshotRef: 'result', changedPaths: ['a.txt'], changeArtifactRefs: [`artifact:${ref.artifactId}`], unresolved: [] }, artifacts: { [`artifact:${ref.artifactId}`]: ref } };
  const proposals = new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory);
  const record = await proposals.create(input);
  const publication = new LocalWorkspacePublicationService(db, proposals, sqlitePublicationStatements, sqliteFilesystemReceiptStatements, directory);
  await assert.rejects(publication.apply(input, '0'.repeat(64), 'alice'));
  assert.equal(await readFile(path.join(workspace, 'a.txt'), 'utf8'), 'old');
  const applied = await publication.apply(input, record.proposal.digest, 'alice');
  assert.equal(applied.effect.status, 'published');
  assert.equal(await readFile(path.join(workspace, 'a.txt'), 'utf8'), 'new');
  assert.deepEqual(await publication.apply(input, record.proposal.digest, 'alice'), applied);
  assert.equal((await proposals.review(input)).status, 'applied');
});

test('reports target conflict and keeps the changed project file', async t => {
  const { mkdtemp, mkdir, readFile, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const { LocalWorkspaceArtifacts, LocalWorkspaceProposalService, LocalWorkspacePublicationService, NodeSqliteDatabase, sqlitePublicationStatements, sqliteFilesystemReceiptStatements } = await import('../../.test-build/src/index.js');
  const directory = await mkdtemp(path.join(tmpdir(), 'publish-conflict-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const workspace = path.join(directory, 'workspace'); await mkdir(workspace);
  await writeFile(path.join(workspace, 'a.txt'), 'old');
  const local = await LocalWorkspaceArtifacts.open(workspace, directory);
  const data = new TextEncoder().encode(JSON.stringify({ path: 'a.txt', before: 'old', after: 'new' }));
  const ref = await local.services.store.write({ name: 'change', kind: 'workspace-change', mediaType: 'application/json', schemaId: 'workspace-change', schemaVersion: '1', sourceRefs: ['snapshot:base'], idempotencyKey: 'change:one', expiresAtEpochMs: null, data }); await local.close();
  const db = new NodeSqliteDatabase(path.join(directory, 'proposals.sqlite')); t.after(() => db.close());
  const input = { id: 'run', workspace, targetId: 'target', scope: { scopeId: 'actor', projectId: 'project' }, result: { summary: 'Update', baseSnapshotRef: 'base', resultSnapshotRef: 'result', changedPaths: ['a.txt'], changeArtifactRefs: [`artifact:${ref.artifactId}`], unresolved: [] }, artifacts: { [`artifact:${ref.artifactId}`]: ref } };
  const proposals = new LocalWorkspaceProposalService(db, sqlitePublicationStatements, directory);
  const record = await proposals.create(input);
  await writeFile(path.join(workspace, 'a.txt'), 'user changes');
  const publication = new LocalWorkspacePublicationService(db, proposals, sqlitePublicationStatements, sqliteFilesystemReceiptStatements, directory);
  const applied = await publication.apply(input, record.proposal.digest, 'alice');
  assert.deepEqual({ ...applied.effect }, { status: 'not-applied', code: 'TARGET_CHANGED' });
  assert.equal(await readFile(path.join(workspace, 'a.txt'), 'utf8'), 'user changes');
});
