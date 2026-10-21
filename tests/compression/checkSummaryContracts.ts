import { SummaryProposalContract } from "../../src/agentic/context/compression/SummaryProposalContract.js";
import { ExtractiveSummaryAcceptanceVerifier } from "../../src/agentic/context/compression/ExtractiveSummaryAcceptanceVerifier.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import type { IExecutionContext } from "../../src/executors/contracts/IExecutionContext.js";
export async function checkSummaryContracts(): Promise<void> {
  const sources = ["one", "two"].map(id => ({ id, kind: "observation" as const, sourceRef: `artifact:${id}`, revisionRef: "v1", text: "Callback expiry remains unverified.", priority: 1 }));
  const request = { sources, maxSummaryBytes: 8192 }; const contract = new SummaryProposalContract(request, new JsonValueContract());
  if ((await contract.validate({ points: [{ text: sources[0].text, sourceIds: ["one"] }] })).valid) throw new Error("Missing source silently omitted.");
  if ((await contract.validate({ points: [{ text: "Claim.", sourceIds: ["invented"] }] })).valid) throw new Error("Invented citation accepted.");
  const proposal = await contract.validate({ points: [{ text: sources[0].text, sourceIds: ["one", "two"] }] });
  if (!proposal.valid) throw new Error("Exact extraction rejected.");
  const context: IExecutionContext = { identity: { operationId: "summary-contract" }, scope: { scopeId: "scope", projectId: "project" }, signal: new AbortController().signal, deadlineEpochMs: null, reporter: { async progress() {} } };
  const verifier = new ExtractiveSummaryAcceptanceVerifier();
  if (!await verifier.verify(proposal.value, request, context) || await verifier.verify({ points: [{ text: "Callback expiry is verified.", sourceIds: ["one", "two"] }] }, request, context)) throw new Error("Unsupported certainty introduced.");
}
