import type { ExecutionIdentity } from "../runtime/ExecutionIdentity.js";
import type { ExecutionScopeRef } from "../runtime/ExecutionScopeRef.js";
import type { ExecutionOutcome } from "../outcomes/ExecutionOutcome.js";
import type { LifecycleSnapshot } from "../../domain/lifecycle/LifecycleSnapshot.js";
import type { FrameworkConfiguration } from "../../configuration/FrameworkConfiguration.js";
import type { RegistrationMetadata } from "../../composition/RegistrationMetadata.js";
import type { JsonValue } from "./JsonValue.js";

export type ExecutionRecord = Readonly<{
  schemaVersion: 1;
  scope: ExecutionScopeRef;
  identity: ExecutionIdentity;
  lifecycle: LifecycleSnapshot;
  definition: Readonly<{ id: string; version: string }>;
  configuration: FrameworkConfiguration;
  registrations: readonly RegistrationMetadata[];
  sourceRefs: readonly string[];
  checkpointRef: string | null;
  outcome: ExecutionOutcome<JsonValue> | null;
}>;
