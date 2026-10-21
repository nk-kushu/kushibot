import { LifecycleDefinition } from "./LifecycleDefinition.js";

export const workflowRunLifecycle = new LifecycleDefinition({
  kind: "workflow-run",
  version: "1",
  initial: "created",
  states: ["created", "queued", "active", "waiting-for-approval", "paused", "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled"],
  terminal: ["completed", "failed", "stopped", "cancelled"],
  transitions: {
    "created": ["queued", "active", "stopping", "failed"],
    "queued": ["active", "stopping", "failed"],
    "active": ["waiting-for-approval", "paused", "interrupted", "stopping", "completed", "failed", "stopped"],
    "waiting-for-approval": ["active", "paused", "interrupted", "stopping", "failed", "stopped"],
    "paused": ["active", "interrupted", "stopping", "failed", "stopped"],
    "interrupted": ["recovering", "stopping"],
    "recovering": ["active", "stopping", "failed", "stopped"],
    "stopping": ["recovering", "cancelled", "failed", "stopped"],
  },
});
