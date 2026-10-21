import { ContextCompressionService } from "../../src/agentic/context/compression/ContextCompressionService.js";
import { ContextSummaryInstaller } from "../../src/agentic/context/compression/ContextSummaryInstaller.js";
import { ContiguousObservationCompressionPolicy } from "../../src/agentic/context/compression/ContiguousObservationCompressionPolicy.js";
import { DuplicateObservationSummaryProvider } from "../../src/agentic/context/compression/DuplicateObservationSummaryProvider.js";
import { ExtractiveSummaryAcceptanceVerifier } from "../../src/agentic/context/compression/ExtractiveSummaryAcceptanceVerifier.js";
import { ContextCompositionInputContract } from "../../src/agentic/context/ContextCompositionInputContract.js";
import { StableContextFormatter } from "../../src/agentic/context/StableContextFormatter.js";
import { DynamicContextFormatter } from "../../src/agentic/context/DynamicContextFormatter.js";
import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { FixtureModelInputSizer } from "../context/FixtureModelInputSizer.js";
import { createLoginContextFixture } from "../../examples/context/createLoginContextFixture.js";
import type { IContextSummaryProvider } from "../../src/agentic/context/compression/IContextSummaryProvider.js";
export async function checkCompressionFlow(): Promise<void> {
  const json = new JsonValueContract(); const contract = new ContextCompositionInputContract(json); const base = createLoginContextFixture().first;
  const input = { ...base, optionalFragments: ["one", "two", "three"].map(id => ({ id, kind: "observation" as const, sourceRef: `artifact:${id}`, revisionRef: "source-v1", text: "The callback still needs expiry verification. ".repeat(40), priority: 10 })) };
  const context = { identity: { operationId: "summary-one" }, scope: base.scope, signal: new AbortController().signal, deadlineEpochMs: 1000, reporter: { async progress() {} } };
  let saves = 0;
  const store = { async save() { saves++; return { artifactId: "fixture-summary", digest: "a".repeat(64), byteLength: 4096, mediaType: "application/json", schemaId: "context-summary", schemaVersion: "1" }; } };
  const create = (provider: IContextSummaryProvider = new DuplicateObservationSummaryProvider()) => new ContextCompressionService(contract, { async verify() { return true; } }, new ContiguousObservationCompressionPolicy(), provider,
    new ExtractiveSummaryAcceptanceVerifier(), store, new StableContextFormatter(), new DynamicContextFormatter(), new FixtureModelInputSizer(), json, { nowEpochMs: () => 100 }, 8192);
  const compressed = await create().compress(input, context);
  if (compressed.status !== "prepared" || compressed.summary.points.length !== 1 || compressed.summary.sources.length !== 3 || saves !== 1) throw new Error("Exact duplicate compression failed.");
  const installer = new ContextSummaryInstaller({ async publish(request) { if (request.parentSnapshotRef !== base.snapshotRef) throw new Error("Parent version lost."); return "snapshot:compressed-one"; } }, contract);
  const installed = await installer.install(compressed, context);
  if (installed.snapshotRef === input.snapshotRef || installed.optionalFragments.length !== 1 || installed.optionalFragments[0].kind !== "summary" ||
      JSON.stringify(installed.assignment) !== JSON.stringify(compressed.original.assignment) || JSON.stringify(installed.requiredFragments) !== JSON.stringify(compressed.original.requiredFragments) || JSON.stringify(installed.requiredRules) !== JSON.stringify(compressed.original.requiredRules) ||
      new StableContextFormatter().format(installed) !== new StableContextFormatter().format(input)) throw new Error("Installation changed mandatory context or reused an old snapshot.");
  if ((await create().compress(installed, { ...context, identity: { operationId: "summary-two" } })).status !== "unchanged") throw new Error("Summary recursively summarized.");
  const uncertain = await create({ id: "uncertain-fixture", version: "1", async propose() { return { status: "uncertain", operationId: "summary-call-unknown" }; } }).compress(input, context);
  if (uncertain.status !== "uncertain" || !uncertain.pendingOperationRefs.includes("summary-call-unknown") || !uncertain.pendingOperationRefs.includes(input.assignment.pendingOperationRefs[0])) throw new Error("Uncertain operations lost.");
}
