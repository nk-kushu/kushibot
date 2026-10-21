import type { ExecutionKind } from "./ExecutionKind.js";
import type { LifecycleStatus } from "./LifecycleStatus.js";

export type LifecycleRules = Readonly<{
  kind: ExecutionKind;
  version: string;
  initial: LifecycleStatus;
  states: readonly LifecycleStatus[];
  terminal: readonly LifecycleStatus[];
  transitions: Readonly<Partial<Record<LifecycleStatus, readonly LifecycleStatus[]>>>;
}>;
