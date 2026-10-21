import type { ContextFixture } from "./ContextFixture.js";
import type { ContextCompositionInput } from "../../src/agentic/context/ContextCompositionInput.js";
export function createLoginContextFixture(): ContextFixture {
  const first: ContextCompositionInput = { snapshotRef: "snapshot:login-one", scope: { scopeId: "scope", projectId: "project", workspaceId: "workspace" },
    instructions: { revision: "framework:v1", text: "Work only in the permitted isolated workspace. Preserve password login. Publication requires its own approval." },
    guidance: [{ guardId: "lint", guardVersion: "1", instructions: "Follow configured lint rules. Only actual revision-bound check receipts establish check results.", ruleIds: ["lint.configured"] }],
    requiredRules: [{ guardId: "lint", guardVersion: "1", ruleId: "lint.configured", requirement: "The configured lint invocation must pass for the checked revision." }],
    assignment: { goal: "Review the Google login callback.", acceptanceCriteria: ["Preserve password login.", "Reject expired callback state."], unresolved: ["Verify callback-state expiry handling."], pendingOperationRefs: ["operation:unreconciled-check"] },
    requiredFragments: [{ id: "spec", kind: "source", revisionRef: "spec:v1", sourceRef: "artifact:login-spec", text: "Password login must remain available.", priority: 100 }],
    optionalFragments: [{ id: "recent-check", kind: "observation", revisionRef: "code:r4", sourceRef: "artifact:check-r4", text: "The saved check reports that expired callback state was accepted.", priority: 100 },
      { id: "old-note", kind: "summary", revisionRef: "notes:v1", sourceRef: "artifact:investigation", text: "An earlier authorized investigation located the callback handler.", priority: 10 }] };
  const second: ContextCompositionInput = { ...first, snapshotRef: "snapshot:login-two", optionalFragments: [
    { ...first.optionalFragments[0], revisionRef: "code:r5", sourceRef: "artifact:check-r5", text: "The updated check result is available for the revised callback implementation." }, first.optionalFragments[1],
  ] };
  return { first, second };
}
