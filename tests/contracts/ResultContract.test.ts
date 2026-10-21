import { StringResultContract } from "../fakes/StringResultContract.js";

export async function verifyValidation(): Promise<void> {
  const contract = new StringResultContract();
  const accepted = await contract.validate("A bounded report.");
  const rejected = await contract.validate({ report: "Not a string." });
  if (!accepted.valid || accepted.value !== "A bounded report.") {
    throw new Error("A valid string must retain its value.");
  }
  if (rejected.valid || rejected.issues[0].code !== "expected-string") {
    throw new Error("Non-string input must produce an explicit validation issue.");
  }
}
