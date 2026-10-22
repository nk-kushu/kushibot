# Guards: Skills, Verifiable Rules, and System 1 Selection

## 1. Purpose

A guard packages engineering guidance with checks that evaluate whether the resulting work follows it. The framework should support reusable guards such as OOP programming and ESLint, selected for the task by the System 1 DecisionUnit.

JEV is the configured decision-provider example for guard selection. The selection service depends on DecisionUnit/DecisionProvider interfaces, not on JEV-specific code. Another compatible provider can replace JEV through composition/configuration without changes to guards, workflows, or AgenticMindUnit.

These are proposed standalone framework contracts. They do not change the current AI Harness or imply that any checker is already implemented.

## 2. Guidance and Verification Are Both Required

| Part | Purpose | OOP example | ESLint example |
| --- | --- | --- | --- |
| Skill description | Explain the guard's capability and intended context. | Object-oriented implementation and architectural review. | Project lint compliance for changed source. |
| Skill instructions | Tell planning/coding units how to work. | Cohesive classes, constructor injection, composition, private class-owned helpers. | Follow the repository's configured lint rules and resolve applicable diagnostics. |
| Rule definitions | Name the requirements precisely and link them to checks. | oop.constructor-injection; oop.cohesive-responsibility. | eslint.configured-rules. |
| Check implementations | Produce actual evidence about rule compliance. | Structural inspection plus model-assisted architecture review. | Invoke the configured lint capability and parse real diagnostics. |
| Enforcement policy | Decide what follows a finding or an unavailable check. | Request a bounded correction for blocking violations. | Reject a passing verdict when a required lint invocation could not run. |

A skill prompt alone is guidance. It does not prove compliance. A guard must state which rules are actually checked, what evidence supports each conclusion, and where coverage or applicability remains uncertain.

## 3. OOP Objects

| Object | Responsibility |
| --- | --- |
| GuardDefinition | Immutable guard identity/version, description, skill instructions, applicability metadata, rules, and check configuration. |
| GuardRule | Stable rule ID, requirement, configured severity/blocking behavior, applicability, and expected evidence/check coverage. |
| GuardRegistry | Resolves enabled trusted definitions and their registered check capabilities. |
| GuardSelectionService | Builds a bounded candidate/evidence request and invokes System 1 DecisionUnit. |
| GuardSelectionPolicy | Validates recommendations, preserves required guards, and applies purpose-specific fallback. |
| GuardSelection | Versioned effective guard set, decision references, reasons, and guidance snapshot. |
| GuardCheck | Small polymorphic evaluation interface implemented by actual checkers. |
| GuardRunner | Coordinates check execution, budgets, cancellation, evidence, and reports. |
| GuardReport | Immutable results tied to guard/rule versions and the exact checked artifact. |
| GuardEnforcementPolicy | Converts reports into acceptance, bounded fix requests, stop, or additional review. |

An executable rule does not need its own subclass just to hold text. Use cohesive immutable rule data; create classes for genuinely different checking or policy behavior. Keep private helpers with their owning class and inject clients, registries, stores, clocks, and models.

## 4. Proposed Guard Package

Illustrative definition data:

```text
ID: oop-programming
Version: 1
Description: OOP guidance and evidence-based checks for class/service changes.

Skill:
  Use cohesive classes and small capability interfaces.
  Inject external collaborators.
  Prefer composition over deep inheritance.
  Keep class-owned helpers private.
  Replace behavior-selecting type switches with polymorphic implementations
  where the variants represent interchangeable behavior.

Selection question:
  Does this assignment/change introduce or modify object-oriented behavior
  for which these rules apply?

Rules:
  oop.constructor-injection → OopStructureCheck + ModelAssistedOopReview
  oop.private-helpers → OopStructureCheck + ModelAssistedOopReview
  oop.cohesive-responsibility → ModelAssistedOopReview

Check capabilities:
  registered structural checker
  registered model-assisted review checker

Applicability:
  configured supported languages and artifact types
```

The selection question/description helps System 1 judge relevance; it does not grant access or implement checks. Rule wording, check coverage, and skill content are versioned together so a developer can connect a reported violation to the instructions the coding unit received.

Trusted configuration defines enabled guards, required guard IDs, policy severity, and registered capability IDs. Model-generated content cannot add a mandatory rule, disable a configured rule, grant tools, or select arbitrary shell commands.

## 5. System 1 / JEV Selects Guards

The standard task-dependent selection path is:

```text
Enabled GuardRegistry + task/workspace evidence
                    ↓
GuardSelectionService
                    ↓
DecisionUnit, purpose=select-guards
                    ↓
Configured DecisionProvider, e.g. JevDecisionProvider
                    ↓
Validated per-guard relevance answers / abstentions
                    ↓
GuardSelectionPolicy
                    ↓
Effective guard set + versioned skill/rule guidance
```

System 1 performs the relevance judgment. Deterministic policy enforces trusted configuration and interprets that judgment; it does not silently replace normal model-assisted selection with a provider-specific switch.

The request includes bounded guard IDs, versions, descriptions, applicability summaries, and relevance questions plus safe task/context evidence. Use explicit multiple-selection or per-candidate relevance contracts. Do not force several relevant guards into a single-choice answer or truncate an unknown candidate set without recording missing coverage.

Example:

```text
Task: Add Google login.
Evidence: TypeScript authentication service and route changes.
Eligible guard candidates:
  oop-programming/v1
  eslint/v1
  database-schema/v1

System 1 relevance recommendation:
  oop-programming: relevant
  eslint: relevant
  database-schema: not relevant to the current evidence
```

Candidate eligibility, enablement, and required guard configuration are validated before evaluation. An unknown returned guard ID, invalid confidence metadata, malformed answer, or out-of-scope candidate is rejected. Confidence, if present, is not universal proof of relevance and must not share an uncalibrated threshold across providers.

The effective set contains required guards plus accepted relevant recommendations. Required guards cannot be removed by JEV. A disabled required guard or impossible rule configuration is a visible configuration conflict, not a silent choice to ignore either setting.

If the provider is unavailable or abstains, apply a documented conservative fallback: preserve required guards and use explicitly configured fallback guards or retain unresolved applicability. If safe mandatory applicability cannot be established, report it and stop/request further evidence under policy. Failure is never an implicit empty guard set.

Selection is bounded by candidate count, evidence size, calls, elapsed time, and shared run budget. Large registries can use explicit bounded batches with stable candidate identities and coverage accounting. No hidden infinite retries or recursive selector routing.

## 6. Select Guidance Early, Confirm Coverage After Changes

### Before Planning and Coding

Select guards from the request and available workspace evidence. Supply the selected versioned skill instructions and applicable rules to planning and coding assignments. The plan can account for constraints before edits are made.

Required guidance must fit the model-context allocation. Do not silently truncate a blocking rule to save tokens. Use safe references/structured summaries with an explicit coverage contract, or stop when mandatory instructions cannot be represented reliably.

The assignment and trusted permissions remain authoritative. A guard's guidance cannot enlarge the tool registry, budget, or project scope. Contradictory mandatory instructions create an explicit conflict for policy resolution rather than asking the coding model to guess which to ignore.

### After a Diff Exists

Run selection again with changed-file and diff summaries to discover additional applicable guards. Record added/removed recommendations and reasons. Do not let a new selection silently remove already-obligatory guards for the active run.

If a newly applicable guard adds requirements the implementation did not receive, provide its guidance and evidence in a bounded review/fix assignment. A configured release policy governs any permitted removal of a previously selected optional guard; the model alone cannot dismiss a failing guard by declaring it irrelevant.

Freeze the effective selection and source snapshot/version for each check pass. A changed workspace, definition, rule, or configuration invalidates affected earlier results and requires appropriate rechecks.

## 7. Polymorphic Checks

```typescript
export interface GuardCheck {
  evaluate(
    input: GuardCheckInput,
    context: ExecutionContext,
  ): Promise<GuardCheckResult>;
}
```

Supporting inputs/results are framework-owned validated contracts. Inputs include guard/rule versions, selected source revision/diff references, specification/criteria where needed, and permitted evidence capabilities.

Implementations include:

```text
EslintCheck
OopStructureCheck
ModelAssistedOopReview
TypeScriptCheck (when configured)
```

GuardRunner resolves check implementations through a registry and invokes the interface. It does not grow a switch on guard name/check type. One guard can compose several checks, and one checker can support multiple guards/rules when its responsibility is genuinely shared.

Model-assisted checks may use AgenticMindUnit with read-only review tools, scoped context/memory, a validated report contract, and an eligible review profile from ModelRouter. Deterministic checks run directly through tool capabilities. System 1 selects relevance; it does not replace the deeper check or fabricate lint results.

## 8. Check Results and Rule Coverage

Each applicable rule/check result distinguishes:

- Passed: evaluated successfully with no detected violation under the stated coverage.
- Failed: evidence supports a violation.
- Not applicable: justified by concrete scope/evidence and allowed by applicability policy.
- Unable to evaluate: missing capability/configuration, timeout, malformed model output, insufficient evidence, or infrastructure failure.

A missing executable is not a pass. Empty model findings are not enough if required files/rules were never evaluated. GuardRunner aggregates coverage explicitly and does not turn one passing checker into success for every rule in the package.

A finding includes guard/rule ID and version, configured severity/blocking behavior, file/location or artifact reference, checked source fingerprint, evidence, diagnostic summary, and suggested correction. Provider-selected text cannot downgrade configured severity.

Example:

```text
Guard: oop-programming/v1
Rule: oop.constructor-injection
Outcome: failed
Artifact: PaymentService.ts at the checked source revision
Evidence: external database client created inside the service constructor
Expected: receive a repository capability through constructor injection
Suggested correction: move concrete client assembly to composition
```

Structural heuristics can flag candidates but are not proof of architectural quality. Model-assisted OOP review is evidence-backed assessment, not a guarantee that every violation has been found. Label check method, coverage, model/provider identity, and uncertainty.

## 9. ESLint Guard Example

The skill explains the configured repository lint expectations and asks the agent to address applicable diagnostics without changing lint configuration merely to hide violations.

EslintCheck invokes an injected lint capability against the configured project scope, using an allowlisted command/tool definition from trusted configuration. The model does not select arbitrary shell commands through guard metadata. Record configuration/version references, source revision, invocation, actual outcome, diagnostics, duration, and bounded output artifact references.

Keep lint violations distinct from a tool/configuration/runtime failure. If the command succeeds but produces an unusable report, validate the contract and return unable-to-evaluate rather than an invented clean result.

Default checking should not modify source. If an explicit auto-fix capability is enabled, treat it as an editing action with operation identity, scope, side-effect handling, updated source fingerprint, and a fresh check afterward. Never apply fixes invisibly inside a supposedly read-only review.

## 10. Enforcement and Fix Loops

GuardEnforcementPolicy interprets reports under configured severity, blocking, and required-coverage rules. Outcomes include accept, bounded fix, further review, or explicit stop. Informational findings may be visible without blocking; required unresolved checks cannot silently become accepted.

Fix assignments contain the failed rule, relevant skill excerpt, evidence, current source context, expected correction, and recheck requirements. The editing executor uses these inputs through AgenticMindUnit; GuardRunner does not become another hidden coding engine.

Recheck affected guards against the resulting artifact. Preserve earlier reports as history with their original source references. The shared workflow fix limits and run budget apply; a guard cannot create an unlimited nested “fix until passed” loop.

## 11. Budgets, Recovery, and Traceability

Guard selection, model reviews, tool checks, and fixes consume the shared budget and have local limits: candidate/evidence sizes, files/output, calls, runtime, retries, and report size. Eligibility/routing must preserve mandatory verification requirements; insufficient budget yields an honest unresolved/stopped outcome.

Persist effective selection, guard/rule versions, skill-content references, checked artifact fingerprints, report coverage, enforcement decisions, and pending check outcomes. Resume can reuse results only when their validity conditions still match. A timed-out external check or unfinished auto-fix needs explicit recovery semantics.

Emit correlated events such as guard.selection.requested/completed, guard.guidance.applied, guard.check.started/completed/failed, guard.coverage.unresolved, guard.report.persisted, and guard.enforcement.decided. Include decision/provider identity, recommended versus applied guard set, reasons, source/rule versions, findings/evidence references, duration, and usage. Use shared redaction and event durability policies rather than a separate guard log.

## 12. End-to-End Example: Google Login

1. GuardSelectionService loads enabled guard candidates and the trusted required set.
2. System 1 DecisionUnit uses the configured JEV adapter to judge relevance from the request and prepared workspace evidence.
3. GuardSelectionPolicy validates answers and produces an effective set containing required guards and accepted OOP/ESLint recommendations.
4. Planning and coding assignments receive the selected skills, stable rule IDs, and completion/check expectations.
5. AgenticMindUnit performs bounded implementation work with permitted tools; guard guidance does not expand permissions.
6. After changes exist, a second System 1 evaluation can add applicable guards based on the real diff.
7. GuardRunner invokes actual lint capability and configured structural/model-assisted OOP checks through GuardCheck.
8. A report finds a class-owned helper outside its class and a real lint diagnostic. Evidence and configured severity feed enforcement policy.
9. The workflow creates a bounded fix assignment with the findings and relevant instructions, then checks the updated source again.
10. Completion requires the configured passing coverage and verification/review criteria. Provider unavailability or an unexecuted required check remains visible rather than turning into success.

Switching the guard-selection provider to another registered compatible adapter changes configuration. The same guard definitions, checkers, policies, workflow, and event contracts continue to work.

## 13. Files and First-Version Acceptance

Add guards/ inside the framework folder with GuardDefinition, GuardRule, GuardRegistry, GuardSelectionService, GuardSelectionPolicy, GuardCheck, GuardRunner, GuardReport, and GuardEnforcementPolicy. Use cohesive subfolders for skills/rules, selection contracts/policies, check implementations, reports, and persistence adapters as needed. Reuse decisions/, agentic/, models/, usage/, and events/ rather than copying those subsystems.

Export supported contracts through index.ts. First-version standalone examples include OOP and ESLint-style guards, System 1/JEV-configurable selection, fake offline decision/review providers, controlled lint/check adapters, early skill guidance, post-diff relevance, required-rule preservation, coverage-aware reports, and bounded fixes. Real SDK/tool adapters are injected and optional for deterministic tests; a fake lint result demonstrates orchestration, not actual lint compliance.

Test multiple relevant guards, none-applicable recommendations, invalid IDs, abstention/unavailability, conflicting required/disabled configuration, mandatory-guidance context limits, rule/check coverage, stale reports, source/config revisions, severity enforcement, provider interchangeability, malformed check output, unavailable tools, bounded fixes, cancellation, recovery, shared usage, and safe trace payloads.

[System 1 DecisionUnit](15-system-one-decision-unit.md) · [OOP Design](08-oop-architecture-and-design-rules.md) · [Limits and Budgets](18-limits-budgets-and-execution-control.md) · [Back to table of contents](harness-workflows-executors-framework-idea.md)

## Selection and Enforcement Share Policy

GuardSelectionPolicy is a concrete implementation of Policy<GuardSelectionInput, GuardSelectionOutcome>; GuardEnforcementPolicy implements Policy<GuardEnforcementInput, GuardEnforcementDecision>. They both expose apply(). Selection receives registered candidates, mandatory requirements, and normalized recommendations. Enforcement receives actual versioned reports and required coverage. The coordinator validates the returned effective set or next action; GuardRunner and GuardCheck still perform checks through their execution contracts. Sharing the policy interface does not make a model recommendation equivalent to a passing check.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

