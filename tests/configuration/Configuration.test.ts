import { FrameworkConfigurationContract } from "../../src/configuration/FrameworkConfigurationContract.js";
import { FrameworkConfigurationResolver } from "../../src/configuration/FrameworkConfigurationResolver.js";
import type { FrameworkConfiguration } from "../../src/configuration/FrameworkConfiguration.js";

export async function verifyConfiguration(): Promise<void> {
  const defaults: FrameworkConfiguration = {
    logEnabled: false,
    logLevel: "info",
    maxIterations: 6,
    maxSubAgents: 2,
    maxSubAgentDepth: 1,
  };
  const resolver = new FrameworkConfigurationResolver(defaults, new FrameworkConfigurationContract());
  const first = await resolver.resolve({ maxIterations: 3 });
  const second = await resolver.resolve({});
  if (!first.valid || !second.valid || first.value.maxIterations !== 3 ||
      second.value.maxIterations !== 6 || first.value === second.value || !Object.isFrozen(first.value)) {
    throw new Error("Overrides and immutable snapshots must remain independent.");
  }
  for (const invalid of [null, [], { unknown: true }, { logEnabled: "true" },
    { logLevel: "verbose" }, { maxIterations: 0 }, { maxIterations: Infinity },
    { maxSubAgents: -1 }, { maxSubAgentDepth: 0.5 }, { maxIterations: undefined }]) {
    if ((await resolver.resolve(invalid)).valid) throw new Error("Invalid configuration accepted.");
  }
  const invalidDefaults = new FrameworkConfigurationResolver(
    { ...defaults, maxIterations: 0 },
    new FrameworkConfigurationContract(),
  );
  if ((await invalidDefaults.resolve({})).valid) throw new Error("Invalid defaults accepted.");
}
