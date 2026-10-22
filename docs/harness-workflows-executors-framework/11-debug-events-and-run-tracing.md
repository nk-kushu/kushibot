# Debug Events and Run Tracing

Imagine the agent is adding Google login and the investigation appears to stop. You need to know whether it is waiting for a model, reading a file, retrying a failed operation, or saving a result.

The framework should make that visible through a saved timeline. 

**Each important action** produces a structured debug event: a small record describing what happened, where it happened, and why.

Good debugging is part of the first implementation, with standalone inspection that does not require changing the current AI Harness or building an application UI.

The examples below describe the proposed framework design. Their IDs and timings are illustrative.

## Start with a Timeline You Can Read

For one investigation, the timeline might show:

```text
run-42 started with workflow implement-feature/v1
investigation step started: sr-investigate-1
attempt a-1 started
file search failed: temporary unavailable, 210ms
attempt a-1 failed
retry scheduled: safe read, 500ms delay, attempt limit not reached
attempt a-2 started
file search completed: 4 matching files, 32ms
attempt a-2 completed with findings
investigation result saved: result-17
investigation step completed
next step selected: specify, because investigation result is available
```

This explains the failed action, the retry decision, the successful attempt, and the saved result. A message saying only “Working…” cannot answer those questions.

The same timeline follows:

- Model calls.
- Tool actions.
- Notebook updates.
- Memory retrieval.
- Guard checks.
- Model selection.
- Budgets.
- Checkpoints.
- Publication.

Record the evidence and policy behind a decision, rather than leaving the developer to guess.

## Turn Logging On or Off

The library is named kushibot. Its environment variables use the KUSHIBOT_ prefix, so they are easy to identify and do not collide with another library's logging settings.

Control diagnostic logging with:

```dotenv
KUSHIBOT_LOG_ENABLED=true
KUSHIBOT_LOG_LEVEL=info
```

KUSHIBOT_LOG_ENABLED is the main switch. Set it to false to stop optional diagnostic logging, including configured console/file output, optional debug-record persistence, and optional diagnostic subscriber delivery. Set it to true to enable those destinations at the selected level. Destinations themselves are still supplied through the logging adapters.

If these variables are absent, use the documented defaults: logging enabled and level info. Accept true or false for the switch, and debug, info, warn, or error for the level. Validate values after trimming/case normalization; report invalid values clearly at startup rather than silently treating the string false as truthy.

For example, the host can start its entry point with detailed diagnostics:

```bash
KUSHIBOT_LOG_ENABLED=true KUSHIBOT_LOG_LEVEL=debug node ./dist/start-agent.js
```

Or start without optional diagnostic logging:

```bash
KUSHIBOT_LOG_ENABLED=false node ./dist/start-agent.js
```

The entry-point filename is illustrative. Setting the switch to false takes precedence over the selected level. Logging is off even if KUSHIBOT_LOG_LEVEL is debug.

Stopping logging does not stop the executor, skip a tool call, change its return value, or hide its original error from the caller. The recorder still invokes a wrapped operation even when its optional event output is disabled.

### Choose How Much Detail You Want

The level is a minimum severity threshold:

- debug includes detailed safe diagnostics, such as selected input fields, iteration/operation details, and bounded notebook or retrieval summaries. It also includes info, warn, and error.
- info includes ordinary run/step milestones, applied decisions, saved-result references, and completion summaries, plus warnings and errors.
- warn includes recoverable problems, fallback/retry decisions, and approaching-limit warnings, plus errors.
- error includes failures that need attention, such as an executor failure or unavailable required evidence.

For Google login, info can show that investigation started and its result was saved. Debug adds the individual search/model operations and safe context-selection details. Warn can show that a temporary read failed and a retry was scheduled. Error can show that required verification could not execute.

A failed check returned as useful business evidence is not automatically an executor exception; the event's outcome fields remain distinct from its configured severity. Never change business behavior merely to fit a logging level.

Even debug does not enable raw prompts, credentials, unrestricted source content, or private reasoning capture. The sanitizer, access rules, and payload limits apply at every level. More verbosity is not broader permission.

### Keep Essential State While Logging Is Off

Diagnostic logs explain execution. Durable run/checkpoint state, tool-operation journals, usage accounting, trusted approval, and publication receipts are required records for managing it. Disabling logging must not turn off those stores.

The existing required lifecycle/state-event contract also stays in force: retain its minimum required records under the documented durability boundary. Optional diagnostic additions obey the logging switch and level. A required record may still be visible in an authorized lifecycle-history view when optional log output is off; do not describe logging off as erasing all execution history.

This separation lets an application suppress verbose output while still recovering interrupted work, enforcing budgets, checking approval, and establishing whether publication actually occurred. Required persistence failure remains a real execution/durability error; the logging switch cannot waive it.

### Read the Variables at Startup, Keep the Core Object-Based

An environment reader is an adapter used by the application's composition code. The engine and executors should not read process.env on every action.

The proposed assembly can look like this:

```typescript
// Proposed API sketch, not implemented exports.
const options = new EnvironmentLoggingOptionsReader(process.env).read();
const logging = new LoggingController(options);

// Inject this controller/policy into the recorder and its optional sinks.
```

Framework defaults supply baseline options. Constructor options can override them; if the application adds this environment adapter, explicitly supplied environment values override the corresponding constructor options. Missing environment fields leave those options intact. The same resolved policy controls the optional sinks so a disabled console does not accidentally leave verbose database capture running.

Environment variables are read when the application starts. Changing a shell variable afterward does not update an already-running process. Restart with new values to apply them, or use a deliberately exposed runtime control:

```typescript
logging.setEnabled(false);  // Stop optional logging in this process.
logging.setLevel("debug");  // Select verbosity; it does not re-enable logging.
logging.setEnabled(true);   // Resume optional logging at the selected level.
```

Runtime controls affect future records/dispatch decisions. They do not delete old records, cancel a write already in flight, or stop other processes. State how queued optional records are drained/discarded during a change; required lifecycle records remain protected. Thread-safe/shared implementations must apply one consistent policy snapshot per emission.

Keep the environment reader, validated options, and controller/policy with events/ and composition/ as appropriate, reusing the existing recorder rather than introducing another competing logger. Include tests for defaults, false parsing, invalid levels, threshold filtering, runtime changes, disabled optional persistence/delivery, continued wrapped-operation execution, redaction, and preserved required lifecycle/recovery records.

## Give Every Event an Identity

An event has a stable eventId, type, timestamp, producer, severity, and a versioned payload. It identifies the workflow/version and run, with step, StepRun, attempt, session, iteration, model-call, and tool-operation IDs where relevant.

For example, part of a failed-search event could be:

```json
{
  "schemaVersion": 1,
  "eventId": "event-search-failed-1",
  "type": "operation.failed",
  "runId": "run-42",
  "stepId": "investigate",
  "stepRunId": "sr-investigate-1",
  "attemptId": "a-1",
  "payload": {
    "operation": "workspace.search",
    "errorCode": "TEMPORARY_UNAVAILABLE",
    "durationMs": 210
  }
}
```

This is an excerpt, not the complete event envelope. 

Payloads have typed, runtime-validated schemas and **size limits.** They are not arbitrary copies of every object involved.

A technical step retry gets a new attemptId under the same StepRun. Revisiting implementation for a workflow fix gets a new StepRun. An agentic invocation has its own session identity, so its many model/tool calls can be followed without confusing them with another session.

**Trace and span IDs connect operations**. A span groups one operation's start and outcome; parentSpanId shows its enclosing operation, and causationEventId can identify the event that triggered it. The store adds recorded time and a per-run sequence. Sequence is arrival order, so it cannot by itself prove what caused what across workers.

**Use UTC timestamps for inspection and a monotonic clock for elapsed time inside one process.** Do not subtract unrelated process-local clocks to calculate cross-process durations.

## Let a Scoped Recorder Handle the Details

Executors receive a ScopedDebugRecorder through ExecutionContext.debug. It already knows the execution identity, so each caller does not repeatedly assemble run and step IDs.

An executor can wrap a file search like this:

```typescript
return context.debug.operation(
  "workspace.search",
  { kind: "tool", inputSummary: { query: "authentication" } },
  async () => this.workspace.search("authentication", context.signal),
);
```

The recorder starts a DebugSpan, measures time, and records completion or a sanitized failure. It returns the tool's result or preserves the original task error. Returning a value from the callback does not automatically copy that value into debug storage; result capture follows an explicit safe-summary policy.

The existing progress(message) convenience uses this same recorder for progress events. Do not create a second competing progress timeline.

Keep the implementation in **events/ inside the framework folder**. Inject clocks, ID generators, stores, and delivery adapters. Different destinations implement shared interfaces; the engine should not grow a switch for each logging backend.

## Record Actual Outcomes, Not Assumptions

Each component reports the action it owns. The engine reports run progress and selected transitions. Step execution reports prepared inputs, attempts, and outcomes. Policies report retry/recovery decisions and reasons. Model/tool adapters report operations. The persistence coordinator reports confirmed saves.

Executor completed and result persisted are different facts. Emit result.persisted only after the corresponding save succeeds. A publication-inclusive run cannot emit run.completed just because coding finished; its required approval, checks, receipt, and durable state must satisfy the completion rules.

A verification executor can complete with failed checks. The event should say that the check ran and found a problem, not confuse that business result with a process-launch exception. Likewise, cancellation requested is different from cancellation observed or reconciled.

For decisions, show both recommendation and applied policy. For example, System 1 may recommend a guard while deterministic policy also preserves required guards. Model routing should show the selected profile and reason. Memory events should identify which entries influenced a call. Record source, rule, model, result, and proposal versions where needed to make that evidence meaningful.

## Keep Useful Evidence Without Dumping Everything

Prepared-input events can record selected field names, contract versions, dependency result references, and a safe preview. Output events can record outcome, counts, validation status, and report references. Errors need a code, sanitized message, retryability, safe cause information, and a restricted stack trace when enabled.

Include provider request IDs and measured usage when available; absent data is not zero usage. Keep larger permitted reports in ArtifactStore and reference them from events.

Credentials, raw environment variables, and private reasoning traces must not enter the timeline. Raw prompts, file contents, command output, and model responses are excluded by default. Explicit content capture still follows redaction, size, access, and retention policies before storage or delivery.

DebugPayloadSanitizer owns that protection. A reference to a report is not permission for an unauthorized viewer to read it. The [ArtifactStore chapter](23-artifact-store-and-produced-materials.md) explains the access boundary.

## Save Events Reliably and Be Honest About Crashes

DebugEventStore saves events and supports bounded timeline reads. DebugEventPublisher delivers saved events to viewers or other subscribers. DebugEventQueryService filters them, and DebugTimelineFormatter produces readable output or JSONL. These are separate roles behind small interfaces.

Required lifecycle records must be durable alongside state changes, using an atomic boundary or a durable outbox/coordination pattern. If that required persistence fails, do not claim the transition was durably completed.

An optional live viewer failing is different. Bound its queues, allow deduplicated retry delivery using stable event IDs, and report verbose event drops or delivery failures visibly. A slow subscriber must not corrupt run state, and required lifecycle events cannot silently disappear. Report sink failures through an independent health path rather than recursively logging to the same broken sink. Preserve the original task error if reporting also fails.

A crash can leave a span with a start event and no ending. Recovery checks authoritative persisted state and effects before recording interrupted or uncertain work. It must not invent successful completion, or assume that a missing event means a file write never happened. Replaying the timeline is inspection, not permission to execute the tools again. See [State Machines](22-state-machines-and-coordinated-lifecycles.md) for those boundaries.

Verify the behavior through standalone success, retry, cancellation, failure, and crash examples. Tests should check correlation, policy reasons, duplicate delivery, queue pressure, redaction, and persistence failures using injected clocks and IDs. The [complete agent example](25-complete-agent-example-all-framework-features.md) shows this timeline alongside the work it explains.

## Trace Policy Applications Consistently

Configurable decisions share Policy<TInput, TOutput> and apply(). Record the policy role, configured identity/version, safe input/evidence references, returned decision, and the action actually taken as separate facts. A policy recommendation is not evidence that an operation executed. The composition root supplies identity/version metadata alongside the object; do not add a second policy interface or log unrestricted input/output bodies.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to table of contents](harness-workflows-executors-framework-idea.md)
