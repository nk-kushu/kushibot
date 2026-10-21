import type { ISqlDatabase, SubAgentRunSnapshot, SubAgentJournalStatements } from "../../src/index.js";
import { JsonValueContract, JsonRecordCodec, SubAgentRequestContract, ChildOutcomeContract, SubAgentRunSnapshotContract, SqlSubAgentJournal } from "../../src/index.js";
export async function createSubAgentJournalExample(database: ISqlDatabase, initial: SubAgentRunSnapshot, statements: SubAgentJournalStatements): Promise<SqlSubAgentJournal> {
  const json = new JsonValueContract();
  const requests = new SubAgentRequestContract(json);
  const outcomes = new ChildOutcomeContract(json);
  const contract = new SubAgentRunSnapshotContract(json,requests,outcomes);
  const codec = new JsonRecordCodec(contract,json,524288);
  const journal = new SqlSubAgentJournal(database,statements,codec,initial.scope.scopeId,initial.scope.projectId,initial.runId);
  await journal.initialize(initial);
  return journal;
}
