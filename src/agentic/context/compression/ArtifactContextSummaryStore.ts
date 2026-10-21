import { ContextSummaryRecordContract } from "./ContextSummaryRecordContract.js";
import { JsonValueContract } from "../../../persistence/JsonValueContract.js";
import type { IContextSummaryStore } from "./IContextSummaryStore.js";
import type { ContextSummaryRecord } from "./ContextSummaryRecord.js";
import type { IArtifactWriter } from "../../../artifacts/IArtifactWriter.js";
import type { ArtifactRef } from "../../../artifacts/ArtifactRef.js";
import type { IExecutionContext } from "../../../executors/contracts/IExecutionContext.js";
import { ContextCompressionError } from "../../../errors/ContextCompressionError.js";
export class ArtifactContextSummaryStore implements IContextSummaryStore {
  constructor(private readonly writer: IArtifactWriter, private readonly contract = new ContextSummaryRecordContract(new JsonValueContract())) {}
  async save(record: ContextSummaryRecord, context: IExecutionContext): Promise<ArtifactRef> {
    if (record.summaryId !== context.identity.operationId || record.scope.scopeId !== context.scope.scopeId || record.scope.projectId !== context.scope.projectId || record.scope.workspaceId !== context.scope.workspaceId) throw new ContextCompressionError();
    const checked = await this.contract.validate(record); if (!checked.valid) throw new ContextCompressionError();
    const data = new TextEncoder().encode(JSON.stringify(checked.value));
    if (data.byteLength > 32768) throw new ContextCompressionError();
    return this.writer.write({ name: "context-summary.json", kind: "context-summary", mediaType: "application/json", schemaId: "context-summary", schemaVersion: "1",
      sourceRefs: Object.freeze([...new Set(record.sources.map(source => source.sourceRef))]), idempotencyKey: record.summaryId, expiresAtEpochMs: null, data }, context.signal);
  }
}
