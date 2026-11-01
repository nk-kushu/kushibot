import assert from "node:assert/strict";
import { SkillScheduler } from "../../src/index.js";
import type {
  BudgetedModelCall,
  IClock,
  ModelProfile,
  SkillDescriptor,
  SkillSchedule,
} from "../../src/index.js";

const skill = (id: string, extra: Partial<SkillDescriptor> = {}): SkillDescriptor => ({
  id,
  name: id,
  purpose: `Do ${id}.`,
  phases: ["planning"],
  dependencies: [],
  selection: "automatic",
  ...extra,
});
const profile = { maxOutputTokens: 1000 } as ModelProfile;
const clock: IClock = { nowEpochMs: () => 0 };
const control = {
  operationId: "op",
  signal: new AbortController().signal,
  deadlineEpochMs: null,
  timeoutMs: 1000,
};
const schedule = (skills: readonly SkillDescriptor[], completed: readonly string[] = []) =>
  ({
    goal: "Add a package.",
    phase: "planning",
    skills,
    completed: completed.map((skillId) => ({ skillId, summary: "done" })),
  }) satisfies SkillSchedule;

/** Replies with each text in turn and records what the model was offered. */
function scripted(replies: readonly string[]) {
  const offered: string[][] = [];
  const queue = [...replies];
  const calls = {
    run: async (request: { messages: readonly { text: string }[] }) => {
      const input = JSON.parse(request.messages[0].text) as { eligible: { id: string }[] };
      offered.push(input.eligible.map((item) => item.id));
      const text = queue.shift();
      assert.notEqual(text, undefined, "Unexpected scheduler call.");
      return {
        status: "received",
        stopReason: null,
        reply: { status: "completed", text, usage: { inputTokens: 1, outputTokens: 1 } },
      };
    },
  } as unknown as BudgetedModelCall;
  return { offered, scheduler: new SkillScheduler(calls, profile, clock) };
}

export async function checkSkillScheduler(): Promise<void> {
  const packages = skill("packages");
  const design = skill("design", { dependencies: ["packages"], selection: "required" });
  const check = skill("check", { dependencies: ["design"] });

  // Only skills whose dependencies are complete reach the model.
  const first = scripted([JSON.stringify({ next: "packages", reason: "Needed first." })]);
  assert.deepEqual(await first.scheduler.next(schedule([packages, design, check]), control), {
    status: "run",
    skillId: "packages",
    reason: "Needed first.",
  });
  assert.deepEqual(first.offered, [["packages"]]);

  // A lone required skill needs no model call, and an ineligible choice is rejected.
  const required = scripted([]);
  const next = await required.scheduler.next(schedule([packages, design], ["packages"]), control);
  assert.equal(next.status === "run" && next.skillId, "design");

  const bypass = scripted([
    JSON.stringify({ next: "design", reason: "Skip the dependency." }),
    "not json",
    JSON.stringify({ next: "packages", reason: "Corrected." }),
  ]);
  const corrected = await bypass.scheduler.next(schedule([packages, design]), control);
  assert.equal(corrected.status === "run" && corrected.skillId, "packages");
  assert.equal(bypass.offered.length, 3);

  // Finishing is refused while a required skill is unfinished.
  const early = scripted(['{"next":"finish"}', '{"next":"finish"}', '{"next":"finish"}']);
  const refused = await early.scheduler.next(schedule([packages, design]), control);
  assert.equal(refused.status === "blocked" && refused.code, "SKILL_SCHEDULER_INVALID");

  const optional = scripted([JSON.stringify({ next: "finish", reason: "Enough." })]);
  const done = await optional.scheduler.next(schedule([packages]), control);
  assert.equal(done.status, "finished");

  // Nothing eligible ends without a model call; other phases and finished skills do not count.
  const none = scripted([]);
  const other = skill("later", { phases: ["implementation"], selection: "required" });
  assert.equal((await none.scheduler.next(schedule([other, packages], ["packages"]), control)).status, "finished");

  const cycle = await none.scheduler.next(
    schedule([skill("a", { dependencies: ["b"] }), skill("b", { dependencies: ["a"] })]),
    control,
  );
  assert.equal(cycle.status === "blocked" && cycle.code, "SKILL_DEPENDENCY_CYCLE");
  const missing = await none.scheduler.next(schedule([skill("a", { dependencies: ["gone"] })]), control);
  assert.equal(missing.status === "blocked" && missing.code, "SKILL_DEPENDENCY_MISSING");

  {
    // A skill finished in one phase still runs in its other phases, and still meets dependencies.
    const both = skill("both", { phases: ["planning", "implementation"], selection: "required" });
    const later = skill("later", {
      phases: ["implementation"],
      dependencies: ["both"],
      selection: "required",
    });
    const { scheduler } = scripted([]);
    const completed = [{ skillId: "both", summary: "done", phase: "planning" }];
    assert.deepEqual(
      await scheduler.next(
        { ...schedule([both]), phase: "implementation", completed },
        control,
      ),
      { status: "run", skillId: "both", reason: "The only eligible skill is required." },
    );
    const outcome = await scheduler.next(
      {
        ...schedule([both, later]),
        phase: "implementation",
        completed: [...completed, { skillId: "both", summary: "done", phase: "implementation" }],
      },
      control,
    );
    assert.equal(outcome.status === "run" && outcome.skillId, "later");
  }

  {
    // Missing inputs keep a skill out and are reported, whether or not it is required.
    const needs = skill("needs", { requiredInputs: ["plan"] });
    const { scheduler } = scripted([]);
    const skipped = await scheduler.next(schedule([needs]), control);
    assert.equal(skipped.status, "finished");
    assert.match(skipped.status === "finished" ? skipped.reason : "", /needs needs plan/);
    const blocked = await scheduler.next(
      schedule([{ ...needs, selection: "required" }]),
      control,
    );
    assert.equal(blocked.status, "blocked");
    assert.match(blocked.status === "blocked" ? blocked.message : "", /needs needs plan/);
    const ready = await scheduler.next(
      { ...schedule([{ ...needs, selection: "required" }]), availableInputs: ["plan"] },
      control,
    );
    assert.equal(ready.status, "run");
  }
}
