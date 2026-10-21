import type { IPolicy } from "../../src/contracts/IPolicy.js";
import type { SpecificationPolicyInput } from "../../examples/shared-policy/SpecificationPolicyInput.js";
import type { SpecificationAssignment } from "../../examples/shared-policy/SpecificationAssignment.js";
import { SpecificationInputPolicy } from "../../examples/shared-policy/SpecificationInputPolicy.js";
import { EmptyFindingsPolicy } from "../fakes/EmptyFindingsPolicy.js";

export async function verifyPolicies(): Promise<void> {
  const findings = Object.freeze(["SessionService creates sessions."]);
  const input: SpecificationPolicyInput = Object.freeze({
    goal: "Plan Google login.",
    acceptedFindings: findings,
    sourceVersion: "code-r4",
  });
  const policies: readonly IPolicy<SpecificationPolicyInput, SpecificationAssignment>[] = [
    new SpecificationInputPolicy(),
    new EmptyFindingsPolicy(),
  ];
  const copied = await policies[0].apply(input);
  const empty = await policies[1].apply(input);
  if (copied.findings === findings || copied.findings[0] !== findings[0]) {
    throw new Error("Policy must copy findings without changing their content.");
  }
  if (empty.findings.length !== 0 || findings.length !== 1) {
    throw new Error("Policy substitution must leave the input unchanged.");
  }
  if (copied.sourceVersion !== "code-r4" || empty.sourceVersion !== "code-r4") {
    throw new Error("Both policies must preserve source identity.");
  }
}
