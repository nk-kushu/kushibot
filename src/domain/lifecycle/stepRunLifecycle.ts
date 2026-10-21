import { LifecycleDefinition } from "./LifecycleDefinition.js";

export const stepRunLifecycle = new LifecycleDefinition({
  kind: "step-run",
  version: "1",
  initial: "created",
  states: ["created", "active", "retry-wait", "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled"],
  terminal: ["completed", "failed", "stopped", "cancelled"],
  transitions: {
    "created": ["active", "stopping", "failed"],
    "active": ["retry-wait", "interrupted", "stopping", "completed", "failed", "stopped"],
    "retry-wait": ["active", "interrupted", "stopping", "failed", "stopped"],
    "interrupted": ["recovering", "stopping"],
    "recovering": ["active", "stopping", "failed", "stopped"],
    "stopping": ["recovering", "cancelled", "failed", "stopped"],
  },
});
