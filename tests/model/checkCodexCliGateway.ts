import assert from "node:assert/strict";
import { mkdtemp, copyFile, chmod, mkdir, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CodexCliTextGatewayFactory } from "../../src/agentic/model/codex/CodexCliTextGatewayFactory.js";
import { CodexCliReplyMapper } from "../../src/agentic/model/codex/CodexCliReplyMapper.js";
import type { ModelProfile } from "../../src/models/ModelProfile.js";
import type { ModelCallControl } from "../../src/agentic/model/ModelCallControl.js";
import type { ICodexCliTransport } from "../../src/agentic/model/codex/ICodexCliTransport.js";

export async function checkCodexCliGateway(): Promise<void> {
  const profile: ModelProfile = { id: "codex-test", providerId: "codex-cli", modelId: "fixture",
    contextTokens: 10000, maxOutputTokens: 1000, maxRequestBytes: 8192, maxResponseBytes: 16384, supportsPromptCacheKey: false };
  const request = { instructions: "Return JSON.\nPreserve roles.", messages: [
    { role: "user" as const, text: "First" }, { role: "assistant" as const, text: "Previous" },
    { role: "user" as const, text: "Next" }], maxOutputTokens: 100, inputTokenUpperBound: 200, promptCacheKey: null };
  const control = (): ModelCallControl => ({ operationId: "codex-call", timeoutMs: 5000,
    deadlineEpochMs: null, signal: new AbortController().signal });
  const events = [
    { type: "thread.started", thread_id: "fixture-thread" },
    { type: "item.completed", item: { type: "agent_message", text: "Progress" } },
    { type: "item.completed", item: { type: "agent_message", text: "Final" } },
    { type: "turn.completed", usage: { input_tokens: 90, cached_input_tokens: 40, output_tokens: 20, reasoning_output_tokens: 5 } },
  ];
  const mapper = new CodexCliReplyMapper();
  const raw = { stdout: events.map(event => JSON.stringify(event)).join("\n"), exitCode: 0 };
  const mapped = mapper.map(raw, profile);
  assert.equal(mapped.text, "Final");
  assert.equal(mapper.map({ ...raw, stdout: '{"type":"error","message":"Reconnecting..."}\n' + raw.stdout }, profile).status, "completed");
  assert.deepEqual(mapped.usage, { inputTokens: 90, cachedInputTokens: 40, outputTokens: 20, reasoningTokens: 5 });
  for (const invalid of ["not-json", JSON.stringify(events[0]), raw.stdout + '\n{"type":"turn.failed"}',
    raw.stdout.replace('"cached_input_tokens":40', '"cached_input_tokens":999'),
    raw.stdout + '\n{"type":"item.completed","item":{"type":"command_execution"}}']) {
    assert.equal(mapper.map({ stdout: invalid, exitCode: 0 }, profile).status, "unavailable");
  }
  assert.equal(mapper.map({ ...raw, exitCode: 1 }, profile).status, "unavailable");

  // A timed-out call keeps its slot occupied until the underlying transport settles.
  let settle!: (value: { stdout: string; exitCode: number }) => void;
  let signal: AbortSignal | undefined;
  const transport: ICodexCliTransport = { run: async input => {
    signal = input.signal;
    return new Promise(resolve => { settle = resolve; });
  } };
  const gateway = new CodexCliTextGatewayFactory({}, { nowEpochMs: () => 100 }, () => transport).create(profile);
  assert.equal((await gateway.generate(request, { ...control(), deadlineEpochMs: 99 })).errorCode, "DEADLINE_BEFORE_DISPATCH");
  const cancelled = new AbortController(); cancelled.abort();
  assert.equal((await gateway.generate(request, { ...control(), signal: cancelled.signal })).errorCode, "CANCELLED_BEFORE_DISPATCH");
  assert.equal((await gateway.generate(request, { ...control(), timeoutMs: 10 })).errorCode, "TIMEOUT_USAGE_UNKNOWN");
  assert.equal(signal?.aborted, true);
  assert.equal((await gateway.generate(request, control())).errorCode, "TRANSPORT_BUSY_OR_UNRESOLVED");
  settle(raw);
  await new Promise(resolve => setTimeout(resolve, 0));
  const controller = new AbortController();
  const pending = gateway.generate(request, { ...control(), signal: controller.signal });
  await Promise.resolve();
  controller.abort();
  assert.equal((await pending).errorCode, "CANCELLED_USAGE_UNKNOWN");
  settle(raw);

  // Exercise the real child-process transport using a local executable fixture.
  const root = await mkdtemp(join(tmpdir(), "kushibot-codex-test-"));
  try {
    const executable = join(root, "fake-codex");
    await copyFile(join(process.cwd(), "tests/model/fixtures/codex-cli.mjs"), executable);
    await chmod(executable, 0o700);
    const codexHome = join(root, "auth-home");
    await mkdir(codexHome);
    const factory = new CodexCliTextGatewayFactory({ executable, codexHome });
    const reply = await factory.create(profile).generate(request, control());
    assert.equal(reply.status, "completed");
    const observed = JSON.parse(reply.text);
    assert.deepEqual(observed.input.messages, request.messages);
    assert.equal(observed.codexHome, codexHome);
    assert.equal(observed.hasApiKey, false);
    assert.ok(observed.args.includes("--ignore-user-config"));
    assert.ok(observed.args.includes('cli_auth_credentials_store="file"'));
    assert.ok(observed.args.includes("read-only"));
    assert.ok(observed.args.some((arg: string) => arg.startsWith("developer_instructions=") && arg.includes("Return JSON.")));
    await assert.rejects(access(observed.cwd)); // Temporary working directory was removed.
    const missing = new CodexCliTextGatewayFactory({ executable: join(root, "missing"), codexHome }).create(profile);
    assert.equal((await missing.generate(request, control())).errorCode, "TRANSPORT_USAGE_UNKNOWN");
    for (const modelId of ["overflow", "auth-failure"]) {
      const result = await factory.create({ ...profile, modelId, maxResponseBytes: 1024 }).generate(request, control());
      assert.equal(result.status, "unavailable");
      assert.equal(result.text, "");
      assert.equal(result.usage, null);
    }
    const hanging = factory.create({ ...profile, modelId: "hang" });
    assert.equal((await hanging.generate(request, { ...control(), timeoutMs: 100 })).errorCode, "TIMEOUT_USAGE_UNKNOWN");
    // Give the killed fixture time to close, then verify the gateway accepts another call.
    let recovered = false;
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 20));
      const result = await hanging.generate(request, { ...control(), timeoutMs: 10 });
      if (result.errorCode !== "TRANSPORT_BUSY_OR_UNRESOLVED") { recovered = true; break; }
    }
    assert.equal(recovered, true);
    assert.throws(() => factory.create({ ...profile, supportsPromptCacheKey: true }));
    assert.throws(() => factory.create({ ...profile, providerId: "openai" }));
  } finally { await rm(root, { recursive: true, force: true }); }
}
