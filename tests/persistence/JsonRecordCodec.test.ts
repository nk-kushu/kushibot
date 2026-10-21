import { JsonValueContract } from "../../src/persistence/JsonValueContract.js";
import { JsonRecordCodec } from "../../src/persistence/JsonRecordCodec.js";
import { ExecutionRecordContract } from "../../src/persistence/ExecutionRecordContract.js";
import { ExecutionIdentityContract } from "../../src/contracts/runtime/ExecutionIdentityContract.js";
import { FrameworkConfigurationContract } from "../../src/configuration/FrameworkConfigurationContract.js";
import { InvalidPersistenceRecordError } from "../../src/errors/InvalidPersistenceRecordError.js";
import { createExecutionRecord } from "../fixtures/createExecutionRecord.js";

export async function verifyRecordCodec(): Promise<void> {
  const json = new JsonValueContract();
  const contract = new ExecutionRecordContract(
    json,
    new ExecutionIdentityContract(),
    new FrameworkConfigurationContract(),
  );
  const codec = new JsonRecordCodec(contract, json, 65536);
  const fixture = createExecutionRecord({ scopeId: "scope-codec", projectId: "project-codec" }, "codec-run");
  const encoded = await codec.encode(fixture);
  const decoded = await codec.decode(encoded);
  if (decoded.sourceRefs[0] !== "fixture:source/code-r4" || await codec.encode(decoded) !== encoded ||
      !Object.isFrozen(decoded.lifecycle.pendingOperationRefs)) {
    throw new Error("Canonical immutable round trip failed.");
  }

  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  let getterCalled = false;
  const arrayGetter: unknown[] = [];
  Object.defineProperty(arrayGetter, "0", {
    enumerable: true,
    get: () => {
      getterCalled = true;
      return 1;
    },
  });
  for (const invalid of [cyclic, { bad: undefined }, { bad: Number.NaN }, new Date(),
    { bad: () => 1 }, arrayGetter, new Array(2)]) {
    if ((await json.validate(invalid)).valid) throw new Error("Unsupported JSON accepted.");
  }
  if (getterCalled) throw new Error("JSON validation must not execute array getters.");

  const invalidRecords: readonly unknown[] = [
    { ...fixture, identity: { operationId: "op-other", runId: "another-run" } },
    { ...fixture, lifecycle: { ...fixture.lifecycle, status: "completed" } },
    { ...fixture, configuration: { ...fixture.configuration, maxIterations: -1 } },
  ];
  for (const invalid of invalidRecords) {
    let rejected = false;
    try {
      await codec.encode(invalid);
    } catch (error: unknown) {
      if (!(error instanceof InvalidPersistenceRecordError)) throw error;
      rejected = true;
    }
    if (!rejected) throw new Error("Invalid record accepted.");
  }
  let oversized = false;
  try {
    await new JsonRecordCodec(contract, json, 10).encode(fixture);
  } catch (error: unknown) {
    if (!(error instanceof InvalidPersistenceRecordError)) throw error;
    oversized = true;
  }
  if (!oversized) throw new Error("Byte limit was ignored.");
}
