import type { LifecycleRules } from "./LifecycleRules.js";
import type { LifecycleStatus } from "./LifecycleStatus.js";
import type { ExecutionKind } from "./ExecutionKind.js";
import { ConfigurationError } from "../../errors/ConfigurationError.js";

export class LifecycleDefinition {
  private readonly rules: LifecycleRules;

  constructor(rules: LifecycleRules) {
    const known: readonly LifecycleStatus[] = [
      "created", "queued", "active", "retry-wait", "waiting-for-approval", "paused",
      "interrupted", "recovering", "stopping", "completed", "failed", "stopped", "cancelled",
    ];
    const kinds: readonly ExecutionKind[] = ["workflow-run", "step-run", "agentic-session"];
    if (!kinds.includes(rules.kind) || typeof rules.version !== "string" || !rules.version.trim() ||
        !Array.isArray(rules.states) || !Array.isArray(rules.terminal) ||
        !rules.states.includes(rules.initial) || rules.states.some(state => !known.includes(state)) ||
        new Set(rules.states).size !== rules.states.length ||
        rules.terminal.some(state => !rules.states.includes(state)) ||
        rules.terminal.includes(rules.initial) || typeof rules.transitions !== "object" ||
        rules.transitions === null || Array.isArray(rules.transitions)) {
      throw new ConfigurationError("Invalid lifecycle definition.");
    }
    const transitions: Partial<Record<LifecycleStatus, readonly LifecycleStatus[]>> = {};
    for (const key of Object.keys(rules.transitions)) {
      const from = key as LifecycleStatus;
      const targets = rules.transitions[from];
      if (targets === undefined || !rules.states.includes(from) || !Array.isArray(targets) ||
          targets.some(to => !rules.states.includes(to)) || new Set(targets).size !== targets.length ||
          (rules.terminal.includes(from) && targets.length > 0)) {
        throw new ConfigurationError("Invalid lifecycle transition graph.");
      }
      transitions[from] = Object.freeze([...targets]);
    }
    this.rules = Object.freeze({
      ...rules,
      states: Object.freeze([...rules.states]),
      terminal: Object.freeze([...rules.terminal]),
      transitions: Object.freeze(transitions),
    });
  }

  get kind(): ExecutionKind { return this.rules.kind; }
  get version(): string { return this.rules.version; }
  get initial(): LifecycleStatus { return this.rules.initial; }
  hasStatus(status: LifecycleStatus): boolean { return this.rules.states.includes(status); }
  isTerminal(status: LifecycleStatus): boolean { return this.rules.terminal.includes(status); }
  allows(from: LifecycleStatus, to: LifecycleStatus): boolean {
    return this.rules.transitions[from]?.includes(to) ?? false;
  }
}
