import type { IWorkspaceTestHarness } from "./IWorkspaceTestHarness.js";
import { WorkspaceBoundary } from "../../src/workspaces/WorkspaceBoundary.js";
export async function checkWorkspaceIsolation(harness: IWorkspaceTestHarness): Promise<void> {
  const provider = await harness.provider();
  const seed = [{ path: "src/login.ts", text: "baseline" }];
  const one = await provider.create("working-one", "baseline-one", seed);
  const two = await provider.create("working-two", "baseline-one", seed);
  const boundary = new WorkspaceBoundary(["src/login.ts"], ["src/login.ts"], 65536);
  let files = harness.files(one, boundary); let gate = harness.gate(one);
  const claims = await Promise.all([gate.acquire("owner-a"), gate.acquire("owner-b")]);
  if (claims.filter(Boolean).length !== 1) throw new Error("Concurrent editing owners acquired the same workspace.");
  const owner = claims[0] ? "owner-a" : "owner-b";
  const initial = await files.read("src/login.ts");
  if (!await files.replace(owner, "src/login.ts", initial.revision, "first edit").then(value => value.applied)) throw new Error("Valid edit rejected.");
  if ((await files.replace(owner, "src/login.ts", initial.revision, "stale edit")).applied) throw new Error("Stale write replaced newer content.");
  if ((await harness.files(two, boundary).read("src/login.ts")).text !== "baseline" || seed[0].text !== "baseline") throw new Error("Working copy changed source or another workspace.");
  let rejected = false; try { await files.replace("not-owner", "src/login.ts", 1, "wrong owner"); } catch { rejected = true; }
  if (!rejected) throw new Error("Non-owner edited the workspace.");
  const deleted = await files.replace(owner, "src/login.ts", 1, null);
  if (!deleted.applied || (await files.replace(owner, "src/login.ts", null, "stale recreate")).applied) throw new Error("Deletion lost its version.");
  await gate.release(owner);
  await harness.close(); await harness.provider(); files = harness.files(one, boundary); gate = harness.gate(one);
  const restored = await files.read("src/login.ts");
  if (restored.text !== null || restored.revision !== 2) throw new Error("Restart lost workspace history.");
  if (!await gate.acquire("restart-owner")) throw new Error("Released gate did not reopen.");
  await gate.release("restart-owner");
  let escaped = false; try { boundary.requireWrite("../login.ts"); } catch { escaped = true; }
  if (!escaped) throw new Error("Traversal accepted.");
  await harness.close();
}
