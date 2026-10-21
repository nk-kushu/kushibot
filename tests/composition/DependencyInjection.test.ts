import type { IPolicy } from "../../src/contracts/IPolicy.js";
import { FrameworkConfigurationResolver } from "../../src/configuration/FrameworkConfigurationResolver.js";
import { FrameworkConfigurationContract } from "../../src/configuration/FrameworkConfigurationContract.js";
import { CapabilityRegistry } from "../../src/composition/CapabilityRegistry.js";
import { SpecificationInputPolicy } from "../../examples/shared-policy/SpecificationInputPolicy.js";
import type { SpecificationPolicyInput } from "../../examples/shared-policy/SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "../../examples/shared-policy/SpecificationAssignment.js";
import { SpecificationApplicationFactory } from "../../examples/configuration/SpecificationApplicationFactory.js";
import { FixedClock } from "../fakes/FixedClock.js";
import { SequenceIdGenerator } from "../fakes/SequenceIdGenerator.js";

export async function verifyInjection(): Promise<void> {
  const resolver = new FrameworkConfigurationResolver({
    logEnabled: false,
    logLevel: "info",
    maxIterations: 6,
    maxSubAgents: 2,
    maxSubAgentDepth: 1,
  }, new FrameworkConfigurationContract());
  const registry = new CapabilityRegistry<IPolicy<SpecificationPolicyInput, SpecificationAssignment>>([
    {
      metadata: { id: "input", implementationVersion: "1", configuration: {} },
      capability: new SpecificationInputPolicy(),
    },
  ]);
  const factory = new SpecificationApplicationFactory(resolver, registry, {
    clock: new FixedClock(1000),
    ids: new SequenceIdGenerator(["op-a", "op-b"]),
  });
  if ((await factory.create({ maxIterations: -1 }, "input")).valid) {
    throw new Error("Invalid configuration must not construct an application.");
  }
  const built = await factory.create({}, "input");
  if (!built.valid) throw new Error("Valid assembly failed.");
  const a = await built.value.application.prepare({ goal: "First", acceptedFindings: ["A"], sourceVersion: "r1" });
  const b = await built.value.application.prepare({ goal: "Second", acceptedFindings: ["B"], sourceVersion: "r2" });
  if (a.operationId !== "op-a" || b.operationId !== "op-b" || a.startedAtEpochMs !== 1000 ||
      a.assignment.goal !== "First" || b.assignment.goal !== "Second" ||
      a.assignment.findings === b.assignment.findings) {
    throw new Error("Injected dependencies and invocation data were not preserved.");
  }
}
