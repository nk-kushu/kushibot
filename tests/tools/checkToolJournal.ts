import type { IToolJournalTestHarness } from "./IToolJournalTestHarness.js";
export async function checkToolJournal(harness: IToolJournalTestHarness): Promise<void> {
  let journal = await harness.open("journal-main"); await journal.initialize();
  const first = { operationId: "read-one", requestKey: "fixture-request-v1", ownerToken: "owner-one" };
  const second = { ...first, ownerToken: "owner-two" };
  const claims = await Promise.all([journal.claim(first), journal.claim(second)]);
  if (claims.filter(value => value.kind === "acquired").length !== 1 || claims.filter(value => value.kind === "pending").length !== 1) throw new Error("Competing claims both acquired execution.");
  const owner = claims[0].kind === "acquired" ? first : second;
  const observation = { operationId: "read-one", toolId: "read-source", toolVersion: "1", value: { sourceRef: "source:login.ts", text: "fixture" } };
  await journal.complete(owner, observation); await journal.complete(owner, observation);
  if ((await journal.claim(second)).kind !== "completed") throw new Error("Saved receipt not replayed.");
  let rejected = false;
  try { await journal.claim({ ...first, requestKey: "different-request" }); } catch { rejected = true; }
  if (!rejected) throw new Error("Conflicting operation identity accepted.");
  const other = await harness.open("journal-other"); await other.initialize();
  if ((await other.claim(first)).kind !== "acquired") throw new Error("Journal scopes leaked.");
  await harness.close(); journal = await harness.open("journal-main"); await journal.initialize();
  if ((await journal.claim(first)).kind !== "completed") throw new Error("Restart lost completed receipt.");
  const unused = { operationId: "not-started", requestKey: "unused-fixture", ownerToken: "unused-owner" };
  await journal.claim(unused); await journal.releaseBeforeDispatch(unused);
  if ((await journal.claim(unused)).kind !== "acquired") throw new Error("Proven non-dispatch release failed.");
  await harness.close();
}
