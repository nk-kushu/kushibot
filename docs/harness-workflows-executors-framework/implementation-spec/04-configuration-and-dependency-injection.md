# 04. Configuration and Dependency Injection

## What We Implement Here

Create validated configuration resolution, typed capability registrations, and explicit constructor-based assembly. Defaults plus trusted overrides produce an immutable configuration; application composition selects a registered object and injects its dependencies. An offline example proves this wiring without building the full harness, opening resources, or making model calls.

Files relative to `/Users/niki/PersonalProjects/KushiBot`.

| File | TypeScript declaration |
| --- | --- |
| `configuration/FrameworkConfiguration.ts` | `type FrameworkConfiguration` |
| `configuration/ConfigurationOverrides.ts` | `type ConfigurationOverrides` |
| `configuration/FrameworkConfigurationContract.ts` | `class FrameworkConfigurationContract implements IResultContract<FrameworkConfiguration>` |
| `configuration/IConfigurationResolver.ts` | `interface IConfigurationResolver` |
| `configuration/FrameworkConfigurationResolver.ts` | `class FrameworkConfigurationResolver implements IConfigurationResolver` |
| `composition/RegistrationConfiguration.ts` | `type RegistrationConfiguration` |
| `composition/RegistrationMetadata.ts` | `type RegistrationMetadata` |
| `composition/CapabilityRegistration.ts` | `type CapabilityRegistration<TCapability>` |
| `composition/ICapabilityRegistry.ts` | `interface ICapabilityRegistry<TCapability>` |
| `errors/ConfigurationError.ts` | `class ConfigurationError extends Error` |
| `composition/CapabilityRegistry.ts` | `class CapabilityRegistry<TCapability> implements ICapabilityRegistry<TCapability>` |
| `composition/RuntimeDependencies.ts` | `type RuntimeDependencies` |
| `examples/configuration/SpecificationPreparation.ts` | `type SpecificationPreparation` |
| `examples/configuration/SpecificationApplication.ts` | `class SpecificationApplication` |
| `examples/configuration/ConfiguredApplication.ts` | `type ConfiguredApplication` |
| `examples/configuration/SpecificationApplicationFactory.ts` | `class SpecificationApplicationFactory` |
| `examples/configuration/ExampleClock.ts` | `class ExampleClock implements IClock` |
| `examples/configuration/ExampleIdGenerator.ts` | `class ExampleIdGenerator implements IIdGenerator` |
| `examples/configuration/main.ts` | `async function main()` |
| `tests/configuration/Configuration.test.ts` | `Configuration validation and resolution checks` |
| `tests/composition/CapabilityRegistry.test.ts` | `Typed registration checks` |
| `tests/composition/DependencyInjection.test.ts` | `Constructor-injection checks` |
| `tests/contracts/ConfigurationApi.compile.ts` | `Compile-only configuration API fixture` |
| `index.ts` | `Additional explicit type and value exports` |


## Rules Specific to These Files

General OOP, naming, and coding conventions are defined in [01. Scope and Implementation Roadmap](01-scope-and-implementation-roadmap.md). Reuse the contracts, errors, example data, and test support already delivered by [03. Core Contracts and Shared Policy](03-core-contracts-and-shared-policy.md).

| File or concept | Required rules |
| --- | --- |
| FrameworkConfiguration | The settings shown here are the initial configuration slice, not the entire future harness configuration. Logging is boolean plus a known level; maxIterations is a positive safe integer; sub-agent count and depth are nonnegative safe integers. Zero sub-agent count or depth disables that corresponding allowance. Runtime admission, effective-limit inheritance, and enforcement remain later capabilities. |
| Defaults and overrides | Defaults are explicitly supplied by trusted application code, copied, and validated. An explicit override wins over a default; absent keys retain defaults. Unknown keys, incorrect types, undefined supplied values, and invalid numbers are rejected rather than coerced or silently ignored. Resolved settings are new frozen scalar-only objects. |
| Configuration input | The unknown boundary represents decoded configuration data, not executable objects, functions, getters, SDK clients, or model-produced authority. Host code may read environment settings, using KUSHIBOT_ for library-owned variables, then explicitly parse and pass them here. This phase does not add hidden environment reads or recursive merging. |
| Configuration authority | These settings are trusted construction defaults/tuning, not effective permissions or unlimited allowances. A model cannot pass overrides to raise its limits. Resolve inherited effective limits, deadlines, scopes, required checks, and approval in their owning runtime components; defaults do not override stricter host/run constraints. |
| FrameworkConfigurationContract | Implement the existing IResultContract. Expected invalid data returns ValidationResult issues, not exceptions. Unexpected validator failure remains observable. No schema-library types leak into the public contract. |
| Registration metadata | Record a stable ID, implementation version, and reviewed flat scalar constructor settings. These are JSON-compatible snapshots; exclude secrets and credentials. This simple representation is deliberately flat: richer codecs belong to their owning configuration/persistence work. Metadata must match how the object was actually constructed. |
| CapabilityRegistry | Create one typed registry per capability family, not a global untyped service locator. Copy/freeze metadata, reject duplicate or blank IDs/versions and non-finite scalar values, and retain the supplied capability instance. Do not mutate registrations during a run or instantiate model-supplied class names. |
| Registry lookup | Unknown IDs raise the existing UnknownRegistrationError from page 03. Invalid trusted registry construction raises ConfigurationError, which directly extends built-in Error in errors/ConfigurationError.ts. Do not add duplicate error classes or classify failures through message matching. |
| Capabilities and invocation state | The registry returns the same supplied capability, not a fresh session. Only reuse implementations safe for that lifetime; per-run/session mutable objects come from their later scoped factories. A typed registry does not runtime-validate arbitrary JavaScript implementations or confer permission. |
| RuntimeDependencies | Inject the clock and ID generator from page 03 interfaces. This narrow bundle is not the future universal execution context. Host clients, trusted scope, workspace admission, and live cancellation retain their separate owners. |
| Composition and factories | The example factory chooses concrete collaborators and passes them directly to SpecificationApplication. The consumer receives a policy, not a registry. No globals, dependency discovery inside methods, provider-name switches, connections, schema initialization, automatic recovery, or resource shutdown occur here; those lifecycle details belong to spec 27. |
| Example configuration | Example numeric values are illustrative host choices, not recommended production defaults. SpecificationApplication demonstrates one policy call and dependency injection; it is not a runner and does not enforce the listed iteration/sub-agent settings. The returned configuration makes the construction result inspectable for later wiring. |
| Persistence and versions | describe() returns configuration metadata, not persisted evidence. This phase saves nothing. Later run records must retain effective settings and registration versions and validate compatibility on recovery; rebuilding objects cannot reset consumption or blindly apply new settings to an old run. |
| Future adapters and context | Add model/store/tool factory registrations through their owning typed interfaces when implemented. No placeholder IModelGateway or database contract is created here. Later composition must connect stable AgentContextComposer output to provider adapters, keep one shared workspace editing gate, and retain bounded partial outcomes. |
| Public exports | The index.ts snippet is additive to page 03 exports. Export supported configuration contracts/classes only; examples and tests are not production exports. Imports and constructors must not acquire resources. |
| Verification | The three runtime test files export test-runner-neutral check functions that must actually be invoked; compilation alone does not run them. ConfigurationApi.compile.ts is compile-only. These checks prove configuration and wiring, not real runtime admission, durable persistence, or provider compatibility. |

## TypeScript Code for Each File

Each heading is a separate source file. Page 03's supporting files already exist as dependencies. Add the index.ts exports below to the existing entry point rather than replacing its contents.

### `configuration/FrameworkConfiguration.ts`

Defines the resolved, readonly logging and agent-loop tuning settings for this foundation.

```typescript
export type FrameworkConfiguration = Readonly<{
  logEnabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  maxIterations: number;
  maxSubAgents: number;
  maxSubAgentDepth: number;
}>;
```

### `configuration/ConfigurationOverrides.ts`

Defines typed optional overrides for trusted application callers; external input still enters validation as unknown.

```typescript
import type { FrameworkConfiguration } from "./FrameworkConfiguration";

export type ConfigurationOverrides = Readonly<Partial<FrameworkConfiguration>>;
```

### `configuration/FrameworkConfigurationContract.ts`

Validates the complete configuration, rejecting unknown keys, invalid values, and unsafe integer limits.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { FrameworkConfiguration } from "./FrameworkConfiguration";

export class FrameworkConfigurationContract
  implements IResultContract<FrameworkConfiguration> {
  readonly id = "framework-configuration";
  readonly version = "1";

  async validate(value: unknown): Promise<ValidationResult<FrameworkConfiguration>> {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return this.invalid("", "Expected a configuration object.");
    }
    const data = value as Record<string, unknown>;
    const allowed = ["logEnabled", "logLevel", "maxIterations", "maxSubAgents", "maxSubAgentDepth"];
    const unexpected = Object.keys(data).find(key => !allowed.includes(key));
    if (unexpected !== undefined) return this.invalid(unexpected, "Unknown configuration field.");
    if (typeof data.logEnabled !== "boolean") return this.invalid("logEnabled", "Expected a boolean.");
    const level = data.logLevel;
    if (level !== "debug" && level !== "info" && level !== "warn" && level !== "error") {
      return this.invalid("logLevel", "Expected debug, info, warn, or error.");
    }
    const iterations = data.maxIterations;
    const children = data.maxSubAgents;
    const depth = data.maxSubAgentDepth;
    if (!this.isIntegerAtLeast(iterations, 1)) return this.invalid("maxIterations", "Expected a positive safe integer.");
    if (!this.isIntegerAtLeast(children, 0)) return this.invalid("maxSubAgents", "Expected a nonnegative safe integer.");
    if (!this.isIntegerAtLeast(depth, 0)) return this.invalid("maxSubAgentDepth", "Expected a nonnegative safe integer.");
    return {
      valid: true,
      value: Object.freeze({
        logEnabled: data.logEnabled,
        logLevel: level,
        maxIterations: iterations,
        maxSubAgents: children,
        maxSubAgentDepth: depth,
      }),
    };
  }

  private isIntegerAtLeast(value: unknown, minimum: number): value is number {
    return typeof value === "number" && Number.isSafeInteger(value) && value >= minimum;
  }

  private invalid(field: string, message: string): ValidationResult<FrameworkConfiguration> {
    return { valid: false, issues: [{ path: field ? [field] : [], code: "invalid-configuration", message }] };
  }
}
```

### `configuration/IConfigurationResolver.ts`

Defines resolution of defaults plus overrides into a validated configuration or explicit validation issues.

```typescript
import type { FrameworkConfiguration } from "./FrameworkConfiguration";
import type { ValidationResult } from "../contracts/validation/ValidationResult";

export interface IConfigurationResolver {
  resolve(overrides: unknown): Promise<ValidationResult<FrameworkConfiguration>>;
}
```

### `configuration/FrameworkConfigurationResolver.ts`

Copies host-supplied defaults, applies trusted overrides, and validates the resulting configuration.

```typescript
import type { IResultContract } from "../contracts/validation/IResultContract";
import type { ValidationResult } from "../contracts/validation/ValidationResult";
import type { FrameworkConfiguration } from "./FrameworkConfiguration";
import type { IConfigurationResolver } from "./IConfigurationResolver";

export class FrameworkConfigurationResolver implements IConfigurationResolver {
  private readonly defaults: FrameworkConfiguration;

  constructor(
    defaults: FrameworkConfiguration,
    private readonly contract: IResultContract<FrameworkConfiguration>,
  ) {
    this.defaults = Object.freeze({ ...defaults });
  }

  async resolve(overrides: unknown): Promise<ValidationResult<FrameworkConfiguration>> {
    const checkedDefaults = await this.contract.validate(this.defaults);
    if (!checkedDefaults.valid) return checkedDefaults;
    if (typeof overrides !== "object" || overrides === null || Array.isArray(overrides)) {
      return {
        valid: false,
        issues: [{ path: [], code: "invalid-overrides", message: "Expected an overrides object." }],
      };
    }
    // Every supplied key reaches the strict validator; unknown fields are not dropped.
    return this.contract.validate({ ...checkedDefaults.value, ...overrides });
  }
}
```

### `composition/RegistrationConfiguration.ts`

Holds flat, reviewed, non-secret scalar settings that can be recorded with a registration.

```typescript
export type RegistrationConfiguration = Readonly<
  Record<string, string | number | boolean | null>
>;
```

### `composition/RegistrationMetadata.ts`

Identifies a registered implementation and its effective non-secret constructor settings.

```typescript
import type { RegistrationConfiguration } from "./RegistrationConfiguration";

export type RegistrationMetadata = Readonly<{
  id: string;
  implementationVersion: string;
  configuration: RegistrationConfiguration;
}>;
```

### `composition/CapabilityRegistration.ts`

Pairs one constructed capability with its registration metadata.

```typescript
import type { RegistrationMetadata } from "./RegistrationMetadata";

export type CapabilityRegistration<TCapability> = Readonly<{
  metadata: RegistrationMetadata;
  capability: TCapability;
}>;
```

### `composition/ICapabilityRegistry.ts`

Exposes typed capability lookup and metadata inspection for a single capability family.

```typescript
import type { RegistrationMetadata } from "./RegistrationMetadata";

export interface ICapabilityRegistry<TCapability> {
  get(id: string): TCapability;
  describe(id: string): RegistrationMetadata;
}
```

### `errors/ConfigurationError.ts`

Reports invalid trusted composition or duplicate registrations with a stable code.

```typescript
export class ConfigurationError extends Error {
  readonly code = "INVALID_CONFIGURATION";

  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
```

### `composition/CapabilityRegistry.ts`

Builds a fixed typed registry, validates metadata, rejects duplicates, and snapshots its scalar configuration.

```typescript
import type { ICapabilityRegistry } from "./ICapabilityRegistry";
import type { CapabilityRegistration } from "./CapabilityRegistration";
import type { RegistrationMetadata } from "./RegistrationMetadata";
import { ConfigurationError } from "../errors/ConfigurationError";
import { UnknownRegistrationError } from "../errors/UnknownRegistrationError";

export class CapabilityRegistry<TCapability>
  implements ICapabilityRegistry<TCapability> {
  private readonly entries = new Map<string, CapabilityRegistration<TCapability>>();

  constructor(registrations: readonly CapabilityRegistration<TCapability>[]) {
    for (const registration of registrations) {
      const metadata = this.copyMetadata(registration.metadata);
      if (this.entries.has(metadata.id)) {
        throw new ConfigurationError("Duplicate capability registration.");
      }
      this.entries.set(metadata.id, Object.freeze({
        metadata,
        capability: registration.capability,
      }));
    }
  }

  get(id: string): TCapability {
    return this.lookup(id).capability;
  }

  describe(id: string): RegistrationMetadata {
    return this.lookup(id).metadata;
  }

  private lookup(id: string): CapabilityRegistration<TCapability> {
    const entry = this.entries.get(id);
    if (entry === undefined) throw new UnknownRegistrationError(id);
    return entry;
  }

  private copyMetadata(metadata: RegistrationMetadata): RegistrationMetadata {
    if (typeof metadata.id !== "string" || metadata.id.trim().length === 0 ||
        typeof metadata.implementationVersion !== "string" ||
        metadata.implementationVersion.trim().length === 0) {
      throw new ConfigurationError("Registration identity and version must be nonempty strings.");
    }
    const configuration = metadata.configuration;
    if (typeof configuration !== "object" || configuration === null || Array.isArray(configuration)) {
      throw new ConfigurationError("Registration configuration must be a scalar-settings object.");
    }
    for (const value of Object.values(configuration)) {
      const scalar = value === null || typeof value === "string" || typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value));
      if (!scalar) throw new ConfigurationError("Registration settings must be finite serializable scalars.");
    }
    return Object.freeze({
      id: metadata.id,
      implementationVersion: metadata.implementationVersion,
      configuration: Object.freeze({ ...configuration }),
    });
  }
}
```

### `composition/RuntimeDependencies.ts`

Groups the two narrow, host-supplied clock and identity capabilities used by the example.

```typescript
import type { IClock } from "../contracts/runtime/IClock";
import type { IIdGenerator } from "../contracts/runtime/IIdGenerator";

export type RuntimeDependencies = Readonly<{
  clock: IClock;
  ids: IIdGenerator;
}>;
```

### `examples/configuration/SpecificationPreparation.ts`

Records the example operation ID, start time, and produced assignment without claiming durable persistence.

```typescript
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment";

export type SpecificationPreparation = Readonly<{
  operationId: string;
  startedAtEpochMs: number;
  assignment: SpecificationAssignment;
}>;
```

### `examples/configuration/SpecificationApplication.ts`

Demonstrates a consumer receiving its selected policy, clock, and ID generator through constructor injection.

```typescript
import type { IPolicy } from "../../index";
import type { RuntimeDependencies } from "../../composition/RuntimeDependencies";
import type { SpecificationPolicyInput } from "../shared-policy/SpecificationPolicyInput";
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment";
import type { SpecificationPreparation } from "./SpecificationPreparation";

export class SpecificationApplication {
  constructor(
    private readonly policy: IPolicy<SpecificationPolicyInput, SpecificationAssignment>,
    private readonly runtime: RuntimeDependencies,
  ) {}

  async prepare(input: SpecificationPolicyInput): Promise<SpecificationPreparation> {
    const operationId = this.runtime.ids.nextId();
    const startedAtEpochMs = this.runtime.clock.nowEpochMs();
    const assignment = await this.policy.apply(input);
    return { operationId, startedAtEpochMs, assignment };
  }
}
```

### `examples/configuration/ConfiguredApplication.ts`

Returns the constructed example application alongside resolved settings and policy metadata.

```typescript
import type { FrameworkConfiguration } from "../../configuration/FrameworkConfiguration";
import type { RegistrationMetadata } from "../../composition/RegistrationMetadata";
import type { SpecificationApplication } from "./SpecificationApplication";

export type ConfiguredApplication = Readonly<{
  application: SpecificationApplication;
  configuration: FrameworkConfiguration;
  policyMetadata: RegistrationMetadata;
}>;
```

### `examples/configuration/SpecificationApplicationFactory.ts`

Resolves configuration, selects a registered policy, and explicitly constructs the consumer with injected dependencies.

```typescript
import type { IPolicy } from "../../index";
import type { IConfigurationResolver } from "../../configuration/IConfigurationResolver";
import type { ICapabilityRegistry } from "../../composition/ICapabilityRegistry";
import type { RuntimeDependencies } from "../../composition/RuntimeDependencies";
import type { ValidationResult } from "../../contracts/validation/ValidationResult";
import type { SpecificationPolicyInput } from "../shared-policy/SpecificationPolicyInput";
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment";
import type { ConfiguredApplication } from "./ConfiguredApplication";
import { SpecificationApplication } from "./SpecificationApplication";

export class SpecificationApplicationFactory {
  constructor(
    private readonly configuration: IConfigurationResolver,
    private readonly policies: ICapabilityRegistry<IPolicy<SpecificationPolicyInput, SpecificationAssignment>>,
    private readonly runtime: RuntimeDependencies,
  ) {}

  async create(overrides: unknown, policyId: string): Promise<ValidationResult<ConfiguredApplication>> {
    const resolved = await this.configuration.resolve(overrides);
    if (!resolved.valid) return resolved;
    const policy = this.policies.get(policyId);
    return {
      valid: true,
      value: {
        application: new SpecificationApplication(policy, this.runtime),
        configuration: resolved.value,
        policyMetadata: this.policies.describe(policyId),
      },
    };
  }
}
```

### `examples/configuration/ExampleClock.ts`

Supplies a fixed illustrative time without relying on real time or external services.

```typescript
import type { IClock } from "../../index";

export class ExampleClock implements IClock {
  nowEpochMs(): number {
    return 1000;
  }
}
```

### `examples/configuration/ExampleIdGenerator.ts`

Supplies deterministic, example-local IDs; it is not a production uniqueness implementation.

```typescript
import type { IIdGenerator } from "../../index";

export class ExampleIdGenerator implements IIdGenerator {
  private sequence = 0;

  nextId(): string {
    this.sequence += 1;
    return `example-operation-${this.sequence}`;
  }
}
```

### `examples/configuration/main.ts`

Assembles the resolver, typed registry, and application factory, then prepares one fixture assignment.

```typescript
import {
  CapabilityRegistry, FrameworkConfigurationContract, FrameworkConfigurationResolver,
} from "../../index";
import type { IPolicy, FrameworkConfiguration } from "../../index";
import type { SpecificationPolicyInput } from "../shared-policy/SpecificationPolicyInput";
import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment";
import { SpecificationInputPolicy } from "../shared-policy/SpecificationInputPolicy";
import { SpecificationApplicationFactory } from "./SpecificationApplicationFactory";
import { ExampleClock } from "./ExampleClock";
import { ExampleIdGenerator } from "./ExampleIdGenerator";

async function main(): Promise<void> {
  // Teaching values supplied by the host, not recommended library defaults.
  const defaults: FrameworkConfiguration = {
    logEnabled: false, logLevel: "info",
    maxIterations: 6, maxSubAgents: 2, maxSubAgentDepth: 1,
  };
  const resolver = new FrameworkConfigurationResolver(defaults, new FrameworkConfigurationContract());
  const policies = new CapabilityRegistry<IPolicy<SpecificationPolicyInput, SpecificationAssignment>>([
    {
      metadata: { id: "specification-input", implementationVersion: "1", configuration: {} },
      capability: new SpecificationInputPolicy(),
    },
  ]);
  const factory = new SpecificationApplicationFactory(resolver, policies, {
    clock: new ExampleClock(), ids: new ExampleIdGenerator(),
  });
  const constructed = await factory.create({ logLevel: "debug" }, "specification-input");
  if (!constructed.valid) throw new Error("Invalid example configuration.");
  const prepared = await constructed.value.application.prepare({
    goal: "Plan Google login.", acceptedFindings: ["Sessions use SessionService."], sourceVersion: "code-r4",
  });
  console.log({ configuration: constructed.value.configuration, prepared });
}

void main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
```

### `tests/configuration/Configuration.test.ts`

Checks precedence, valid defaults, rejected fields, integer limits, and independent resolved snapshots.

```typescript
import { FrameworkConfigurationContract } from "../../configuration/FrameworkConfigurationContract";
import { FrameworkConfigurationResolver } from "../../configuration/FrameworkConfigurationResolver";
import type { FrameworkConfiguration } from "../../configuration/FrameworkConfiguration";

export async function verifyConfiguration(): Promise<void> {
  const defaults: FrameworkConfiguration = {
    logEnabled: false, logLevel: "info", maxIterations: 6, maxSubAgents: 2, maxSubAgentDepth: 1,
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
    { ...defaults, maxIterations: 0 }, new FrameworkConfigurationContract(),
  );
  if ((await invalidDefaults.resolve({})).valid) throw new Error("Invalid defaults accepted.");
}
```

### `tests/composition/CapabilityRegistry.test.ts`

Checks lookup identity, duplicate rejection, metadata snapshots, unknown registrations, and invalid scalar settings.

```typescript
import { CapabilityRegistry } from "../../composition/CapabilityRegistry";
import { ConfigurationError } from "../../errors/ConfigurationError";
import { UnknownRegistrationError } from "../../errors/UnknownRegistrationError";

export function verifyRegistry(): void {
  const capability = Object.freeze({ label: "fixture-policy" });
  const settings = { maxFindings: 2 };
  const registration = {
    metadata: { id: "fixture", implementationVersion: "1", configuration: settings },
    capability,
  };
  const registry = new CapabilityRegistry([registration]);
  settings.maxFindings = 999;
  if (registry.get("fixture") !== capability ||
      registry.describe("fixture").configuration.maxFindings !== 2 ||
      !Object.isFrozen(registry.describe("fixture").configuration)) {
    throw new Error("Registry must preserve capability identity and snapshot metadata.");
  }
  let unknown = false;
  try { registry.get("missing"); }
  catch (error: unknown) {
    if (!(error instanceof UnknownRegistrationError)) throw error;
    unknown = true;
  }
  if (!unknown) throw new Error("Unknown registration must fail explicitly.");
  for (const entries of [
    [registration, registration],
    [{ ...registration, metadata: { ...registration.metadata, id: " " } }],
    [{ ...registration, metadata: { ...registration.metadata, configuration: { limit: NaN } } }],
  ]) {
    let rejected = false;
    try { new CapabilityRegistry(entries); }
    catch (error: unknown) {
      if (!(error instanceof ConfigurationError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Invalid registry construction must fail explicitly.");
  }
}
```

### `tests/composition/DependencyInjection.test.ts`

Checks factory assembly, injected time and IDs, configuration rejection, and independent invocation data.

```typescript
import type { IPolicy } from "../../contracts/IPolicy";
import { FrameworkConfigurationResolver } from "../../configuration/FrameworkConfigurationResolver";
import { FrameworkConfigurationContract } from "../../configuration/FrameworkConfigurationContract";
import { CapabilityRegistry } from "../../composition/CapabilityRegistry";
import { SpecificationInputPolicy } from "../../examples/shared-policy/SpecificationInputPolicy";
import type { SpecificationPolicyInput } from "../../examples/shared-policy/SpecificationPolicyInput";
import type { SpecificationAssignment } from "../../examples/shared-policy/SpecificationAssignment";
import { SpecificationApplicationFactory } from "../../examples/configuration/SpecificationApplicationFactory";
import { FixedClock } from "../fakes/FixedClock";
import { SequenceIdGenerator } from "../fakes/SequenceIdGenerator";

export async function verifyInjection(): Promise<void> {
  const resolver = new FrameworkConfigurationResolver({
    logEnabled: false, logLevel: "info", maxIterations: 6, maxSubAgents: 2, maxSubAgentDepth: 1,
  }, new FrameworkConfigurationContract());
  const registry = new CapabilityRegistry<IPolicy<SpecificationPolicyInput, SpecificationAssignment>>([
    { metadata: { id: "input", implementationVersion: "1", configuration: {} }, capability: new SpecificationInputPolicy() },
  ]);
  const factory = new SpecificationApplicationFactory(resolver, registry, {
    clock: new FixedClock(1000), ids: new SequenceIdGenerator(["op-a", "op-b"]),
  });
  if ((await factory.create({ maxIterations: -1 }, "input")).valid) {
    throw new Error("Invalid configuration must not construct an application.");
  }
  const built = await factory.create({}, "input");
  if (!built.valid) throw new Error("Valid assembly failed.");
  const a = await built.value.application.prepare({ goal: "First", acceptedFindings: ["A"], sourceVersion: "r1" });
  const b = await built.value.application.prepare({ goal: "Second", acceptedFindings: ["B"], sourceVersion: "r2" });
  if (a.operationId !== "op-a" || b.operationId !== "op-b" || a.startedAtEpochMs !== 1000 ||
      a.assignment.goal !== "First" || b.assignment.goal !== "Second" || a.assignment.findings === b.assignment.findings) {
    throw new Error("Injected dependencies and invocation data were not preserved.");
  }
}
```

### `tests/contracts/ConfigurationApi.compile.ts`

Checks that the new contracts and constructors are available through the root public API.

```typescript
import type {
  FrameworkConfiguration, ConfigurationOverrides, IConfigurationResolver,
  RegistrationConfiguration, RegistrationMetadata, CapabilityRegistration,
  ICapabilityRegistry, RuntimeDependencies,
} from "../../index";
import {
  FrameworkConfigurationContract, FrameworkConfigurationResolver,
  CapabilityRegistry, ConfigurationError,
} from "../../index";

export type ConfigurationApiFixture = Readonly<{
  configuration: FrameworkConfiguration;
  overrides: ConfigurationOverrides;
  resolver: IConfigurationResolver;
  settings: RegistrationConfiguration;
  metadata: RegistrationMetadata;
  registration: CapabilityRegistration<string>;
  registry: ICapabilityRegistry<string>;
  runtime: RuntimeDependencies;
  validatorClass: typeof FrameworkConfigurationContract;
  resolverClass: typeof FrameworkConfigurationResolver;
  registryClass: typeof CapabilityRegistry;
  errorClass: typeof ConfigurationError;
}>;
```

### `index.ts`

Adds configuration and composition exports while retaining page 03 exports; excludes example classes and test support.

```typescript
export type { FrameworkConfiguration } from "./configuration/FrameworkConfiguration";
export type { ConfigurationOverrides } from "./configuration/ConfigurationOverrides";
export type { IConfigurationResolver } from "./configuration/IConfigurationResolver";
export { FrameworkConfigurationContract } from "./configuration/FrameworkConfigurationContract";
export { FrameworkConfigurationResolver } from "./configuration/FrameworkConfigurationResolver";
export type { RegistrationConfiguration } from "./composition/RegistrationConfiguration";
export type { RegistrationMetadata } from "./composition/RegistrationMetadata";
export type { CapabilityRegistration } from "./composition/CapabilityRegistration";
export type { ICapabilityRegistry } from "./composition/ICapabilityRegistry";
export type { RuntimeDependencies } from "./composition/RuntimeDependencies";
export { CapabilityRegistry } from "./composition/CapabilityRegistry";
export { ConfigurationError } from "./errors/ConfigurationError";
```
