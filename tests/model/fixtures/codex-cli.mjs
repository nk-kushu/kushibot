#!/usr/bin/env node
// Offline CLI protocol fixture. Never reads credentials or contacts a provider.
const args = process.argv.slice(2);
let input = "";
for await (const chunk of process.stdin) input += chunk;
const model = args[args.indexOf("--model") + 1];
if (model === "hang") {
  setInterval(() => {}, 1000);
} else if (model === "overflow") {
  process.stdout.write("x".repeat(8192));
} else if (model === "auth-failure") {
  process.stderr.write("fixture sensitive diagnostic must not be returned");
  process.exitCode = 1;
} else {
  const text = JSON.stringify({ args, input: JSON.parse(input), cwd: process.cwd(),
    codexHome: process.env.CODEX_HOME, hasApiKey: Boolean(process.env.CODEX_API_KEY || process.env.OPENAI_API_KEY) });
  const events = [
    { type: "thread.started", thread_id: "thread_fixture" },
    { type: "turn.started" },
    { type: "item.completed", item: { type: "agent_message", text } },
    { type: "turn.completed", usage: { input_tokens: 90, cached_input_tokens: 40, output_tokens: 20 } },
  ];
  const output = events.map(JSON.stringify).join("\n") + "\n";
  // Split a JSON event across writes to exercise stream buffering.
  process.stdout.write(output.slice(0, 17));
  setTimeout(() => process.stdout.write(output.slice(17)), 5);
}
