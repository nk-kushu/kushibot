export class AgentMemoryError extends Error {
 readonly code="AGENT_MEMORY_INVALID";
 constructor(){super("Memory record, scope, source evidence, or revision is invalid.");this.name="AgentMemoryError";}
}
