import assert from "node:assert/strict";
import { InMemoryToolOperationJournal, NodeSqliteDatabase } from "../../src/index.js";

export async function checkSharedInfrastructure(): Promise<void> {
  const database = new NodeSqliteDatabase(":memory:");
  try {
    await database.query("CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)", []);
    const inserted = await database.query("INSERT INTO items(value) VALUES (?) RETURNING id", ["one"]);
    assert.equal(inserted.rows[0]?.id, 1);
    assert.equal(inserted.affectedRows, 1);
    const selected = await database.query("/* comment */ WITH values_cte AS (SELECT * FROM items) SELECT * FROM values_cte", []);
    assert.equal(selected.rows[0]?.value, "one");
    assert.equal(selected.affectedRows, 0);
    const updated = await database.query("UPDATE items SET value = ? RETURNING value", ["two"]);
    assert.equal(updated.rows[0]?.value, "two");
    assert.equal(updated.affectedRows, 1);
    assert.equal((await database.query("UPDATE items SET value = ? WHERE id = 99 RETURNING id", ["missing"])).affectedRows, 0);
    await assert.rejects(database.transaction(async transaction => {
      await transaction.query("INSERT INTO items(value) VALUES (?)", ["rollback"]);
      throw new Error("rollback");
    }), /rollback/);
    assert.equal((await database.query("SELECT count(*) AS count FROM items", [])).rows[0]?.count, 1);
    const order: string[] = [];
    await Promise.all([
      database.transaction(async transaction => {
        order.push("begin");
        await transaction.query("SELECT 1", []);
        await Promise.resolve();
        order.push("end");
      }),
      database.query("SELECT 1", []).then(() => { order.push("outside"); }),
    ]);
    assert.deepEqual(order, ["begin", "end", "outside"]);
  } finally {
    await database.close();
  }

  const journal = new InMemoryToolOperationJournal();
  await journal.initialize();
  const claim = { operationId: "operation", requestKey: "request", ownerToken: "owner" };
  assert.equal((await journal.claim(claim)).kind, "acquired");
  assert.equal((await journal.claim(claim)).kind, "pending");
  await assert.rejects(journal.claim({ ...claim, requestKey: "different" }));
  const observation = { operationId: claim.operationId, toolId: "tool", toolVersion: "1", value: { written: true } };
  await assert.rejects(journal.complete({ ...claim, ownerToken: "other" }, observation));
  await journal.complete(claim, observation);
  observation.value.written = false;
  assert.deepEqual(await journal.claim(claim), { kind: "completed", observation: { ...observation, value: { written: true } } });
  await assert.rejects(journal.releaseBeforeDispatch(claim));
  const unstarted = { ...claim, operationId: "unstarted" };
  await journal.claim(unstarted);
  await journal.releaseBeforeDispatch(unstarted);
  assert.equal((await journal.claim(unstarted)).kind, "acquired");
}
