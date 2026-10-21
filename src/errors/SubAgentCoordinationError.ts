export class SubAgentCoordinationError extends Error {
  readonly code = "SUB_AGENT_COORDINATION_INVALID";
  constructor() { super("Sub-agent binding, journal state, or command identity is invalid."); this.name = "SubAgentCoordinationError"; }
}
