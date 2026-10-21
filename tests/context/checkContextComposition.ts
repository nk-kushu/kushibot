import { AgentContextComposer } from "../../src/agentic/context/AgentContextComposer.js";
import { ContextCompositionInputContract } from "../../src/agentic/context/ContextCompositionInputContract.js";
import { StableContextFormatter } from "../../src/agentic/context/StableContextFormatter.js";
import { DynamicContextFormatter } from "../../src/agentic/context/DynamicContextFormatter.js";
import { PriorityContextPolicy } from "../../src/agentic/context/PriorityContextPolicy.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { ModelRequestValidator } from "../../src/agentic/model/ModelRequestValidator.js";
import { FixtureModelInputSizer } from "./FixtureModelInputSizer.js";
import { createLoginContextFixture } from "../../examples/context/createLoginContextFixture.js";
import { ConsecutiveRequestsExample } from "../../examples/context/ConsecutiveRequestsExample.js";
import { OpenAiTextRequestMapper } from "../../src/agentic/model/openai/OpenAiTextRequestMapper.js";
import type { IPolicy } from "../../src/contracts/IPolicy.js";
import type { ContextPolicyInput } from "../../src/agentic/context/ContextPolicyInput.js";
import type { ContextPolicyDecision } from "../../src/agentic/context/ContextPolicyDecision.js";
export async function checkContextComposition(): Promise<void> {
  const profile = { id: "fixture", providerId: "openai", modelId: "fixture-model", contextTokens: 20000, maxOutputTokens: 1000, maxRequestBytes: 65536, maxResponseBytes: 65536, supportsPromptCacheKey: true };
  const limits = { maxInputTokens: 19000, maxOutputTokens: 1000, maxRequestBytes: 65536, maxOptionalFragments: 32 };
  const fixture = createLoginContextFixture(); const sizer = new FixtureModelInputSizer(); const stable = new StableContextFormatter(); const dynamic = new DynamicContextFormatter();
  let verified = true;
  const create = (maxInputTokens = limits.maxInputTokens, policy: IPolicy<ContextPolicyInput, ContextPolicyDecision> = new PriorityContextPolicy()) => new AgentContextComposer(profile, { ...limits, maxInputTokens }, new ContextCompositionInputContract(new JsonValueContract()), { async verify() { return verified; } }, policy, stable, dynamic, sizer, new ModelRequestValidator(), { nowEpochMs: () => 100 });
  const context = { identity: { operationId: "compose-one" }, scope: fixture.first.scope, signal: new AbortController().signal, deadlineEpochMs: 1000, reporter: { async progress() {} } };
  const example = await new ConsecutiveRequestsExample(create(), new OpenAiTextRequestMapper(), profile.modelId).build(context);
  if (!("sameInstructions" in example) || !example.sameInstructions || !example.sameAssignment || !example.changedEvidence) throw new Error("Stable/dynamic mapping failed.");
  const minimum = await sizer.upperBound({ instructions: stable.format(fixture.first), messages: dynamic.format(fixture.first, []) });
  const limited = await create(minimum).compose(fixture.first, context);
  if (limited.status !== "ready" || limited.context.droppedForSizeIds.length !== 2 || limited.context.included.length !== 1 || !limited.context.request.messages[0].text.includes("operation:unreconciled-check")) throw new Error("Required work lost during trimming.");
  if ((await create(minimum - 1).compose(fixture.first, context)).status !== "limit-reached") throw new Error("Required context silently dropped.");
  let invalid = false; try { await create(19000, { async apply() { return { orderedOptionalIds: ["invented"] }; } }).compose(fixture.first, context); } catch { invalid = true; }
  if (!invalid) throw new Error("Unknown selected source accepted.");
  verified = false; if ((await create().compose(fixture.first, context)).status !== "unverified") throw new Error("Unverified snapshot accepted.");
}
