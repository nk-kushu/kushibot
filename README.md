# KushiBot

Standalone TypeScript library for a workflow and executor framework. The current
implementation provides shared execution contracts, validated configuration,
execution lifecycles, scope-bound execution-record persistence, immutable
artifact storage and evidence reads, bounded debug events and tracing, and a
durable usage ledger with explicit partial outcomes. SQL-backed services use an
injected binding; no SQLite or PostgreSQL driver is bundled. Applications supply
a binding that satisfies `ISqlDatabase`. The library also includes a bounded
non-streaming text model gateway, a single-choice DecisionUnit, and policy-based
model routing with validated handoff records. A live model call requires an
explicit host-supplied transport and credentials. Tool dispatch uses scoped
authorization and operation receipts; isolated SQL text workspaces provide
revision-checked sequential editing; versioned guards connect skill guidance to
registered evidence-producing checks and enforcement. Context composition keeps
trusted instructions separate from changing evidence, prompt-cache keys expose
no answer cache, and source-backed summaries require independent acceptance
before a new context snapshot can use them. Fresh agent sessions use bounded
JSON actions and host-provided context, journal, and acceptance adapters;
sub-agent coordination preserves inherited authority and run budgets; typed
executor registrations validate task inputs and results against pinned versions.
Agent memory stores exact-source findings and retrieves them only after a current
source check; publication binds a change digest to review, executable checks,
trusted human approval and an actual target receipt. `FrameworkRuntime` orders
resource startup and shutdown, admission, draining and recovery persistence.
These flows require host-supplied source, approval, target, SQL, and quiescence
adapters where applicable.
Versioned workflow definitions bind pinned executors and policies to bounded
step attempts; the workflow engine records accepted dependencies, correction
transitions, cancellation, and recovery evidence in revision-checked run
aggregates. Checkpoint and recovery coordination require host-provided fencing,
checkpoint, and SQL adapters before they can operate against production state.

Reusable conversation storage is also available: scope-bound threads, ordered
user/assistant messages, paginated history, optional run/session links, and
idempotent creation. PostgreSQL and SQLite share an injected-driver repository.
See [durable conversations](docs/conversations/README.md) for usage, boundaries,
and real-driver acceptance commands. Conversation history is separate from agent
session journaling and is not captured automatically.

## Development

```sh
npm install
npm run typecheck
npm run build
```

The public entry point is `src/index.ts`. Framework internals use direct imports
from their owning modules; consumers should import supported contracts and errors
from the package root.

Run the self-contained shared-policy example with:

```sh
npm run example:shared-policy
```

`npm run build:examples` compiles the composition examples. Artifact storage and
debug-event persistence examples accept a host-supplied SQL binding. The offline
checks cover contracts, usage accounting, stop outcomes, debug recording, tool
dispatch, guard selection/enforcement, context composition, prompt-cache
accounting/serialization, and extractive compression. SQL-backed tool journals
and workspaces require a disposable real-driver harness for persistence
acceptance; those cross-process checks are not included in the offline checks.
Memory and publication acceptance checks also require an injected disposable
SQL database (and publication digest adapter); their host-backed checks are not
run by the offline runner. The offline runtime lifecycle check uses fixtures and
does not prove real process or worker quiescence.

## Composed agents

Use the generic `Agent<TTask, TResult>` and `AgentRuntimeFactory` to run an
application-defined workflow with shared sessions, budgets, stores and execution
controls. Applications supply their own tools and domain policies; no coding
workflow is built into the agent abstraction. See [Composed agents](docs/generic-agents.md)
for the API and a non-coding example.
