import Joi from "joi";
import assert from "node:assert/strict";
import { JoiArgumentsContract } from "../../src/index.js";
import { StringResultContract } from "../fakes/StringResultContract.js";

export async function verifyValidation(): Promise<void> {
  const object = new JoiArgumentsContract("write-arguments", Joi.object({
    path: Joi.string().min(1).required(), content: Joi.string().allow("").required(),
    expectedHash: Joi.string().allow("", null).required(),
  }));
  const valid = { path: "a.ts", content: "", expectedHash: null };
  const acceptedObject = await object.validate(valid);
  assert.equal(acceptedObject.valid, true);
  if (acceptedObject.valid) assert.deepEqual({ ...acceptedObject.value as object }, valid);
  assert.equal((await object.validate({ ...valid, expectedHash: "hash" })).valid, true);
  for (const input of [null, [], "text", {}, { ...valid, path: "" },
    { ...valid, content: null }, { ...valid, expectedHash: 1 },
    { path: "a.ts", content: "" }, { ...valid, extra: true }]) {
    assert.equal((await object.validate(input)).valid, false);
  }
  const schema = object.schema as Record<string, unknown>;
  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual([...(schema.required as string[])].sort(), ["content", "expectedHash", "path"]);
  const empty = new JoiArgumentsContract("status-arguments", Joi.object({}));
  assert.equal((await empty.validate({})).valid, true);
  assert.equal((await empty.validate({ extra: "value" })).valid, false);
  const nested = new JoiArgumentsContract("nested", Joi.object({
    options: Joi.object({ count: Joi.number().integer().required() }).required(),
    names: Joi.array().items(Joi.string()).required(),
  }));
  assert.equal((await nested.validate({ options: { count: 2 }, names: ["a"] })).valid, true);
  const coercion = await nested.validate({ options: { count: "2" }, names: ["a"] });
  assert.equal(coercion.valid, false);
  if (!coercion.valid) {
    assert.deepEqual(coercion.issues[0].path, ["options", "count"]);
    assert.equal(coercion.issues[0].code, "number.base");
  }
  assert.equal((await object.validate({ ...valid, expectedHash: "" })).valid, true);
  assert.equal((await object.validate({ ...valid, content: undefined })).valid, false);
  assert.equal((await object.validate({ ...valid, content: new Date() })).valid, false);
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
