import {
  CapabilityRegistry,
  FrameworkConfigurationContract,
  FrameworkConfigurationResolver,
} from "../../src/index.js";
import type { IPolicy } from "../../src/index.js";
import type { FrameworkConfiguration } from "../../src/configuration/FrameworkConfiguration.js";
import type { SpecificationPolicyInput } from "../shared-policy/SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment.js";
import { SpecificationInputPolicy } from "../shared-policy/SpecificationInputPolicy.js";
import { SpecificationApplicationFactory } from "./SpecificationApplicationFactory.js";
import { ExampleClock } from "./ExampleClock.js";
import { ExampleIdGenerator } from "./ExampleIdGenerator.js";

async function main(): Promise<void> {
  const defaults: FrameworkConfiguration = {
    logEnabled: false,
    logLevel: "info",
    maxIterations: 6,
    maxSubAgents: 2,
    maxSubAgentDepth: 1,
  };
  const resolver = new FrameworkConfigurationResolver(defaults, new FrameworkConfigurationContract());
  const policies = new CapabilityRegistry<IPolicy<SpecificationPolicyInput, SpecificationAssignment>>([
    {
      metadata: { id: "specification-input", implementationVersion: "1", configuration: {} },
      capability: new SpecificationInputPolicy(),
    },
  ]);
  const factory = new SpecificationApplicationFactory(resolver, policies, {
    clock: new ExampleClock(),
    ids: new ExampleIdGenerator(),
  });
  const constructed = await factory.create({ logLevel: "debug" }, "specification-input");
  if (!constructed.valid) throw new Error("Invalid example configuration.");
  const prepared = await constructed.value.application.prepare({
    goal: "Plan Google login.",
    acceptedFindings: ["Sessions use SessionService."],
    sourceVersion: "code-r4",
  });
  console.log({ configuration: constructed.value.configuration, prepared });
}

void main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
