import { OpenAiTextGatewayFactory } from "../../src/agentic/model/openai/OpenAiTextGatewayFactory.js";
import type { ModelProfile } from "../../src/models/ModelProfile.js";

export async function checkGatewayClock(): Promise<void> {
  const profile: ModelProfile = { id: "fixture", providerId: "openai", modelId: "fixture-model", contextTokens: 1000, maxOutputTokens: 100, maxRequestBytes: 4096, maxResponseBytes: 4096, supportsPromptCacheKey: true };
  const request = { instructions: "Test", messages: [{ role: "user" as const, text: "Hello" }], maxOutputTokens: 10, inputTokenUpperBound: 20, promptCacheKey: null };
  let calls = 0;
  const transport = () => ({ create: async () => { calls++; throw new Error("Fixture transport"); } });
  const controls = { timeoutMs: 1000, operationId: "clock-test", signal: new AbortController().signal, deadlineEpochMs: 1 };

  const defaultGateway = new OpenAiTextGatewayFactory(transport).create(profile);
  const expired = await defaultGateway.generate(request, controls);
  if (expired.errorCode !== "DEADLINE_BEFORE_DISPATCH" || calls !== 0)
    throw new Error("Default clock must reject an expired deadline without dispatch.");
  const dispatched = await defaultGateway.generate(request, { ...controls, deadlineEpochMs: Date.now() + 60_000 });
  if (dispatched.errorCode !== "TRANSPORT_USAGE_UNKNOWN" || Number(calls) !== 1)
    throw new Error("Default clock must allow dispatch before the deadline.");

  const customGateway = new OpenAiTextGatewayFactory(transport, { nowEpochMs: () => 0 }).create(profile);
  const custom = await customGateway.generate(request, { ...controls, deadlineEpochMs: 1000 });
  if (custom.errorCode !== "TRANSPORT_USAGE_UNKNOWN" || Number(calls) !== 2)
    throw new Error("An explicit clock must override the default clock.");
}
