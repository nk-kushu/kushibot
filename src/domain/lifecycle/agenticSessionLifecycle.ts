import { LifecycleDefinition } from "./LifecycleDefinition.js";

export const agenticSessionLifecycle = new LifecycleDefinition({
  kind: "agentic-session",
  version: "1",
  initial: "created",
  states: ["created", "active", "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled"],
  terminal: ["completed", "failed", "stopped", "cancelled"],
  transitions: {
    "created": ["active", "stopping", "failed"],
    "active": ["interrupted", "stopping", "completed", "failed", "stopped"],
    "interrupted": ["recovering", "stopping"],
    "recovering": ["active", "stopping", "failed", "stopped"],
    "stopping": ["recovering", "cancelled", "failed", "stopped"],
  },
});
