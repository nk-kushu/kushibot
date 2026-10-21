export class AgentSessionError extends Error {
  readonly code = "AGENT_SESSION_INVALID";
  constructor() { super("Agent session configuration or lifecycle is invalid."); this.name = "AgentSessionError"; }
}
