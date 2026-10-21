import { SpecificationInputPolicy } from "./SpecificationInputPolicy.js";

async function main(): Promise<void> {
  const policy = new SpecificationInputPolicy();
  const assignment = await policy.apply({
    goal: "Plan Google login while preserving password login.",
    acceptedFindings: ["Password login uses SessionService."],
    sourceVersion: "code-r4",
  });
  console.log(assignment);
}

void main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
