# Codex CLI model gateway

`CodexCliTextGatewayFactory` implements the same `IModelGatewayFactory` interface
as the OpenAI HTTP adapter. It launches `codex exec --json` for each model call
and maps the CLI's last assistant message and token usage into `ModelReply`.
The transport requires Node.js and an installed Codex CLI. Its flags were checked
against Codex CLI 0.162.1; older versions may not support them.

## Authentication

Run `codex login` once on the host. The adapter lets Codex read and refresh its
existing `auth.json`; Kushibot does not read, copy, or expose the credentials.
It selects file-based authentication and removes inherited `OPENAI_API_KEY` and
`CODEX_API_KEY` variables from the child process so they do not replace the saved
login. The file can contain credentials saved by either supported login method.

By default, Codex uses `$CODEX_HOME/auth.json`, or `~/.codex/auth.json` when the
environment variable is unset. To select another existing authentication
directory, supply `codexHome`. Supply the directory, not the JSON contents or
the file path. Codex needs permission to refresh that file.

See OpenAI's [authentication documentation](https://developers.openai.com/codex/auth)
and [non-interactive CLI documentation](https://developers.openai.com/codex/noninteractive).

## Usage

```ts
import { CodexCliTextGatewayFactory, type ModelProfile } from "kushibot";

const profile: ModelProfile = {
  id: "coding-codex",
  providerId: "codex-cli",
  modelId: "YOUR_CODEX_MODEL_ID",
  // Set these limits for the model and workload you use.
  contextTokens: 100_000,
  maxOutputTokens: 8_000,
  maxRequestBytes: 1_048_576,
  maxResponseBytes: 1_048_576,
  supportsPromptCacheKey: false,
};

const gateway = new CodexCliTextGatewayFactory().create(profile);

// Optional: use a different CLI executable or authentication directory.
const customGateway = new CodexCliTextGatewayFactory({
  executable: "/absolute/path/to/codex",
  codexHome: "/absolute/path/to/existing-codex-home",
}).create(profile);
```

Pass `gateway` and the same `profile` to `AgentRuntimeFactory`, or to an
application's `createCodingAgent({ workspace, checks, gateway, profile })` helper.
No API key or clock argument is required. Tests can supply an optional clock and
transport factory as the second and third factory arguments.

## Execution and limits

- Every request starts a fresh ephemeral CLI session. Conversation history is
  supplied explicitly as role-tagged JSON on stdin; trusted instructions use
  the CLI's developer-instructions setting. No thread is resumed implicitly.
- Calls run from an empty temporary directory with a read-only sandbox. User
  config and project rules are not loaded; shell, apps, plugins, hooks, web
  search, and multi-agent features are disabled. Non-message/non-reasoning
  completed items cause an unavailable reply, since Kushibot owns tool dispatch.
  This wraps a CLI agent, not a tool-free raw model endpoint; managed Codex
  configuration can still affect behavior.
- Cancellation and the earlier of the timeout/deadline terminate the CLI
  process (the process group on POSIX). The gateway stays busy until that
  process and temporary-directory cleanup settle. The adapter never redispatches
  an uncertain call; Codex may perform its own provider connection retries.
- `maxResponseBytes` bounds the entire JSONL stream, including event metadata
  and reasoning summaries. Diagnostics on stderr are drained but not returned.
- `maxOutputTokens` participates in request validation and Kushibot's budget
  reservation and is included as a prompt instruction. The CLI does not expose
  an equivalent hard per-call generation cap. Its own instructions and context
  also add input tokens beyond the supplied conversation. Use conservative
  reservations: this adapter cannot guarantee a strict provider token budget.
- Actual input, output, cached-input, and optional reasoning counts come from
  `turn.completed`. A missing usage report, failed authentication, malformed
  events, process failure, or interrupted call produces an unavailable reply;
  usage remains unknown unless a valid completion report was received. Unknown
  usage stays reserved in Kushibot's ledger rather than being counted as zero.
- Prompt-cache keys are unsupported; use `supportsPromptCacheKey: false` and
  `promptCacheKey: null`. CLI-reported cache hits are still recorded. CLI JSONL
  does not provide separate refusal/incomplete statuses equivalent to Responses;
  successful final text maps to `completed` and application contracts validate it.

## Verification

`npm test` covers event parsing, usage mapping, deadline and cancellation checks,
unresolved-call exclusion, and a real subprocess fixture for CLI arguments,
authentication-directory selection, output bounds, startup/auth failures, and
temporary-directory cleanup. These tests are offline and do not use account
credentials or make a live model call.
