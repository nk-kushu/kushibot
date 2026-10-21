import type { ModelCallControl } from "../../src/agentic/model/ModelCallControl.js";
import { ModelRouter } from "../../src/models/ModelRouter.js";
import { ModelGatewayRegistry } from "../../src/models/ModelGatewayRegistry.js";
export class LoginRoutingExample {
  constructor(private readonly router: ModelRouter, private readonly gateways: ModelGatewayRegistry) {}
  async preparePlanning(control: ModelCallControl) {
    const routed = await this.router.route("planning", [
      { allowedProfileIds: ["planner", "economical-text"], preferredProfileIds: ["economical-text"], requiredCapabilities: ["text"], allowFallback: true },
      { preferredProfileIds: ["planner"], inputTokens: 500, outputTokens: 100 },
    ], control);
    if (routed.kind !== "selected") return routed;
    return Object.freeze({ kind: "prepared" as const, decision: routed.decision, gateway: this.gateways.create(routed.decision.registration.profile) });
  }
}
