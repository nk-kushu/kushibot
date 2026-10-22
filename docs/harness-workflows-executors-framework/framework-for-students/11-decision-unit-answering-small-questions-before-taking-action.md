# 11. DecisionUnit: Answering Small Questions Before Taking Action

Imagine your class has three kinds of project helpers:

- A structure helper checks how a bridge is built.
- A materials helper checks which materials are suitable.
- A presentation helper checks the written report.

A student brings a drawing of a new support. **Before sending it to a helper**, the teacher asks:

> Which additional kind of review would be useful for this change?

Here, “before sending it to a helper” means **deciding which kind of review would be useful.** The teacher still handles giving the drawing to the selected helper, and that helper still performs the review.

**That is a small judgment within a larger project. Answering it does not build the bridge or perform the review.**

The proposed kushibot framework uses **DecisionUnit** for small, bounded judgments such as classification and selection.

The examples in this chapter explain the design. They are not reports from a real execution.

## Does DecisionUnit Help With Handoffs Between Workers?

**Yes—when deciding where work should go next requires judgment.** DecisionUnit recommends a choice from the permitted options. 

**The framework validates and applies the choice,** prepares the next worker's input, and starts the work.

These are three separate jobs:

| Job                                                 | Who does it?                                 | Example                                                                           |
| --------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| Recommend where work should go.                     | DecisionUnit, using its configured provider. | Recommend OOP and lint guards from the allowed candidates.                        |
| Apply the choice and pass the relevant information. | Trusted policy and framework coordination.   | Preserve required guards, prepare check inputs, and invoke the selected checkers. |
| Perform the actual assignment.                      | The selected worker or checking tool.        | Review the class design or run lint and return findings.                          |

For example:

1. A coding **worker returns prepared changes to LoginService.**
2. DecisionUnit receives a bounded change summary and **recommends OOP and lint guards using a contract that allows multiple selections.**
3. Trusted policy validates that recommendation and preserves all required guards.
4. **The framework supplies the relevant source references and instructions to the selected checkers.**
5. The reviewing agent assesses OOP design, while the actual lint tool produces lint diagnostics.

### What Does This Example Accomplish?

**It helps answer: “Which extra checks does this change need?”**

For example, your application has four guards: OOP, lint, database-schema, and accessibility.

1. The coding worker changes LoginService, without changing the database schema or any screens.
2. DecisionUnit recommends OOP and lint checks for this change.
3. The framework runs those checks. Database-schema and accessibility checks are not added if policy does not require them.
4. The checks report any problems that need fixing.

**Choosing a check is not the same as passing it.** DecisionUnit chooses which reviews may be useful; the checkers examine the work.

If OOP and lint are already required for every code change, the framework simply runs them—no DecisionUnit call is needed to choose them. Use DecisionUnit when there is a real choice about additional checks. Required checks always remain required.

#### DecisionUnit helps choose the next work; 

**it does not transfer the information or do that work itself.
It is also useful for other small decisions, not just worker handoffs.**

### Fixed Handoffs Do Not Need DecisionUnit

Suppose the workflow already says:

```text
Accepted investigation findings
              ↓
Specification worker
```

There is no open choice to resolve. The framework uses the configured input policy to select the findings and sources for the specification worker, then runs that step. It does not need to ask a model where those findings belong.

#### Use DecisionUnit when the next choice depends on interpreting the current assignment or result. 

Use the workflow's existing connections and ordinary code when the next step is already defined.

## What Does “Bounded” Mean?

A **bounded question** has a clear purpose, limited evidence, and an agreed answer format.

Compare these requests:

```text
Very broad:
  Make the application better.

Bounded:
  Given this change summary, which allowed additional review applies?
  Options: authentication, database, or none.
```

DecisionUnit handles the second kind of request. It receives selected evidence and a defined question, asks a configured provider, and returns a validated answer or an explicit unsuccessful outcome.

**It does not start a general file-editing investigation or pursue the whole user goal.**

## DecisionUnit and AgenticMindUnit Do Different Jobs

In Chapter 6, AgenticMindUnit repeatedly used a model and tools to investigate an assignment.

DecisionUnit has a narrower role:

| Capability                 | Useful for                                           | Example                                                 |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| DecisionUnit               | A bounded judgment from supplied evidence            | Select a relevant review category.                      |
| AgenticMindUnit            | An assignment requiring repeated model-and-tool work | Inspect login code and explain how sessions work.       |
| Ordinary programmed policy | Enforcing an exact rule                              | Reject an unapproved tool or preserve mandatory checks. |

**The decision layer can help a policy choose among allowed options. It does not replace the policy's authority.**

When an answer follows an exact lookup or rule, ordinary code is often sufficient. The framework does not need to ask a model whether a required field is missing.

## Can AgenticMindUnit Use DecisionUnit Inside an Assignment?

**Yes. AgenticMindUnit can use DecisionUnit for a small judgment while carrying out a larger assignment.** It does not have to wait for a handoff between workflow steps.

Think of a student investigating the bridge. Halfway through, the student asks a helper one focused question, receives an answer, and continues investigating. The helper does not take over the project.

In the proposed design, this can be an explicitly configured collaboration:

```text
AgenticMindUnit gathers evidence
              ↓
A configured call asks DecisionUnit a bounded question
              ↓
DecisionUnit returns a recommendation or an unsuccessful outcome
              ↓
Trusted policy determines the permitted response
              ↓
AgenticMindUnit continues the assignment
```

For example, while investigating login, AgenticMindUnit finds an unfamiliar storage component. Its configured orchestration can prepare this request:

```text
Question:
  Which allowed investigation direction is most relevant?

Evidence:
  Selected findings and source references from this investigation.

Allowed choices:
  session storage
  provider configuration
  insufficient evidence
```

DecisionUnit recommends **session storage**. 

Trusted policy accepts that direction, and AgenticMindUnit uses its existing permitted tools to inspect the relevant code. 

**DecisionUnit chose a direction; AgenticMindUnit still performs the investigation.** 

If no usable answer is obtained, the caller follows its configured fallback rather than pretending a direction was selected.

The call uses the assignment's shared budget, deadline, cancellation, and permission limits. It cannot grant new tools, bypass required checks, or create unlimited nested decision calls.

This is a possible composition of the proposed architecture, not a claim that the integration is already implemented. The application must configure the call boundary, allowed purpose, answer contract, limits, and fallback. 

AgenticMindUnit does not need a separate DecisionUnit call for every thought or tool choice; use it where an explicit, bounded judgment is useful.

## What Goes Into a Decision Request?

A useful request includes a **purpose, selected facts, a question, and permitted choices**.

For Google login, it might look like this:

```text
Purpose:
  Select an additional review category.

Evidence:
  The prepared change adds a Google-login response handler.
  The handler validates the login attempt and creates a session.
  Source reference: the current prepared revision.

Question:
  Which additional review category is relevant?

Allowed choices:
  authentication
  database
  none
```

For this teaching example, the contract permits one category. A purpose that needs several relevant reviews must use an explicit multiple-selection contract rather than squeezing several answers into one choice.

The caller supplies permitted evidence. DecisionUnit does not automatically search every file or access the agent's entire memory.

## Follow the Decision Step by Step

The feature workflow has prepared Google-login changes. Mandatory checks are already configured. Now it wants a recommendation about an additional review.

### Step 1: Prepare the Evidence Snapshot

The calling service selects a bounded change summary and supporting source references from the authorized execution.

It records which source revision the evidence describes. A recommendation about yesterday's code is not automatically valid for today's changed handler.

Selected facts should preserve relevant uncertainty. If database changes are unknown, the request should not pretend they were ruled out.

### Step 2: Validate the Request and Check Limits

DecisionUnit validates the purpose-specific request and answer contract. It checks cancellation and applicable budget and deadline controls before invoking a provider.

The allowed choices come from trusted configuration and the calling capability. Model-generated text cannot add an option such as “publish immediately.”

### Step 3: Ask the Configured Decision Provider

A **DecisionProvider** is the replaceable capability that supplies the judgment.

It might be backed by a suitable hosted or local model service. The framework design names a JEV-style adapter as one possible implementation; the unit depends on the provider interface rather than that particular service.

The provider receives the permitted evidence and response requirements. It might return:

```text
Recommended choice: authentication
Supporting summary: The change affects login validation and session creation.
```

This is a recommendation. The authentication review itself has not run.

### Step 4: Validate the Returned Answer

The unit checks the actual returned data, including whether the choice belongs to the allowed set and whether required references meet the contract.

If the answer says “payments,” it is invalid for this request because that choice was not offered.

A provider's self-reported confidence does not prove correctness. If confidence is included, it needs its own validated meaning and cannot automatically be treated as a reliable probability.

### Step 5: Apply the Decision Policy

The calling policy evaluates the validated recommendation alongside mandatory requirements.

In this example, it accepts authentication as an additional review category while preserving every already-required check.

```text
Before decision:
  Required verification and guards.

Accepted recommendation:
  Add authentication review.

After policy application:
  Required verification and guards + authentication review.
```

The decision cannot remove mandatory reviews, grant tools, or approve publication.

### Step 6: Perform and Record the Actual Review

The framework starts the review through its configured execution capability. The reviewer inspects the current proposal and produces its own evidence-backed result.

The timeline records the distinction between the recommended category, the policy's applied choice, and the review that actually executed.

Only the last of those can supply review findings.

## “None” and “I Cannot Decide” Are Different

These two answers mean different things:

- **None:** “I looked at the information and recommend no extra review.”
- **Cannot decide:** “I do not have enough information to recommend anything.”

For example, the change summary clearly shows that only a report title changed. DecisionUnit may answer `none`: no additional review from the offered categories is needed. Required checks still run.

But if the summary is missing, the provider fails, or the call times out, there is no usable decision. **The framework must not pretend the answer was “no extra review needed.”** It follows the configured fallback instead. If the run was cancelled, it respects cancellation.

## What Happens When the Decision Cannot Be Used?

The configured fallback depends on the purpose.

For optional review selection, a policy might retain required reviews and add a configured conservative review. Another purpose might preserve ambiguity and request a bounded investigation.

For example:

```text
Problem:
  The change summary does not establish whether account storage changed.

Decision outcome:
  Abstained.

Permitted next action:
  Investigate the changed storage paths, then reevaluate if allowed.
```

Deeper investigation belongs to a suitable worker such as AgenticMindUnit. DecisionUnit does not quietly become an unrestricted tool loop.

Fallback and retries consume the shared budget. Cancellation must not be converted into permission to spend more calls on an alternative provider.

## Where Else Can Small Decisions Help?

The same capability can support different registered purposes:

- Classifying a user request into known task categories.
- Selecting relevant optional guards or context from allowed candidates.
- Recommending an eligible model profile.
- Assessing whether an observation deserves a durable-memory proposal.

Each purpose has its own **bounded evidence, answer contract, and policy.**

**DecisionUnit makes suggestions. The framework still checks whether those suggestions can be used.**

For example:

- **Memory:** DecisionUnit says, “This observation may be worth remembering.” That does not prove the observation is true. The memory process must still check it before accepting it as reusable knowledge.
- **Model choice:** DecisionUnit says, “Use model profile A.” The framework must still check whether that profile is allowed and available for this assignment. A recommendation cannot bypass those restrictions.
- **Guards:** DecisionUnit says, “Add an OOP review.” The framework may add it, but still runs every required guard. Recommending one review does not cancel the others.

Think of a helper suggesting the next move: **a suggestion helps you choose, but does not change the rules.**

## Why Keep the Provider Replaceable?

Think of using another trained helper who can answer the same limited question under the same agreement.

The application can connect a different registered compatible DecisionProvider without rewriting workflows and guard definitions.

Compatible means preserving answer meaning, allowed-choice validation, abstention, errors, cancellation, and usage reporting. Matching method names alone is not enough.

Actual quality, speed, and cost need measurement. Calling the layer “System 1” describes its intended small-decision role; it does not guarantee every provider is quick or accurate.

## The Recommendation Goes Into a Policy

DecisionUnit produces a bounded recommendation. A policy receives that recommendation together with mandatory requirements and trusted choices, then returns what should happen through apply(). It follows the same Policy agreement used for executor inputs and model context. The coordinator validates and carries out the choice; a provider's answer is not an approval or check result.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Does selecting authentication review mean the review happened?
2. Can DecisionUnit remove a mandatory check by choosing `none`?
3. Is abstention the same as recommending no additional review?
4. What should happen if the provider returns a choice outside the allowed set?
5. Should a missing required field always require a model decision?

Possible answers:

1. No. A review capability must actually perform it and return findings.
2. No. Mandatory requirements remain enforced by policy.
3. No. Abstention preserves the lack of a supported choice.
4. Reject that answer as invalid and follow the configured policy.
5. No. Ordinary validation code can enforce that exact rule.

## Remember These Ideas

- DecisionUnit answers a small, defined question from selected evidence.
- Its provider returns a recommendation or an explicit other outcome.
- Runtime validation checks the answer against the allowed contract.
- Deterministic policies preserve mandatory rules and decide what to apply.
- Recommendations are separate from the actions and checks they inform.
- DecisionUnit can recommend where work goes next; the framework handles the handoff.
- Fixed worker-to-worker connections do not need a model decision.
- AgenticMindUnit can call DecisionUnit during an assignment through an explicitly configured, bounded collaboration.

**Next chapter:** Model Routing: Choosing a Suitable Model for the Job.

[Previous: Rules and Guards: Helping the Agent Work Correctly](10-rules-and-guards-helping-the-agent-work-correctly.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
