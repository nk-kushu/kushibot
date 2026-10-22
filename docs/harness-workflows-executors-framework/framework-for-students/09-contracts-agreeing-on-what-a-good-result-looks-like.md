# 9. Contracts: Agreeing on What a Good Result Looks Like

Imagine your teacher asks for a report about the classroom bridge.

One student returns a drawing. Another returns the sentence “It is strong.” A third returns five pages about the history of bridges.

All three students produced something, but the teacher still cannot easily answer the original question: can this bridge hold a book?

**Now imagine the assignment includes a clear checklist:**

```text
Your report must contain:
  The bridge design you tested.
  The test you performed.
  What happened during the test.
  Supporting observations.
  Anything you could not establish.
```

Everyone now understands what a usable report needs to contain.

In the proposed kushibot framework, a **contract** is an agreement about a capability's inputs, outputs, and behavior. This chapter focuses on result contracts: **the agreement about what a worker must return.**

The examples below are illustrative proposed designs, not existing public APIs.

## Why Workers Need an Agreement

In earlier chapters, one executor returned findings and another used them to prepare a specification.

**That handoff works only if the next worker can understand the result.**

Suppose the specification step expects findings with evidence and open questions. A response saying “Everything looks fine” gives it very little to use.

**A result contract makes the expected shape explicit**. For an investigation, it might require:

| Part | Purpose |
| --- | --- |
| Summary | Explain the main finding briefly. |
| Findings | State the specific observations or conclusions. |
| Sources | Identify the evidence supporting the findings. |
| Open questions | Preserve what remains unknown. |

Different assignments need different contracts. 

A verification report needs check outcomes. 
An editing result needs references to actual prepared changes. 
A specification needs requirements and acceptance criteria.

## Three Questions That Must Stay Separate

**A good-looking report is not automatically a correct report.**

The framework needs to distinguish three questions:

1. **Does the result have the required shape?** Are the required fields present and valid?
2. **Are its claims supported?** Do the references and actual evidence support what it says?
3. **Does it satisfy this assignment?** Are the mandatory requirements and completion criteria met?

A runtime schema validator can check defined structural constraints. Evidence checks, verification, review, and acceptance policies establish other requirements as configured.

Think of a bridge-test report with every heading filled in. It could still claim a successful test that nobody performed. **The checklist alone does not make that claim true.**

## A Simple Investigation Result

Before preparing Google login, an investigator receives this assignment:

> Explain how password login creates a session. Support the answer with inspected source references and state any unresolved questions.

An illustrative result is:

```text
Summary:
  Password login creates sessions through the existing session service.

Findings:
  The successful password-login path calls session creation.

Sources:
  Reference to the inspected handler and relevant session code.

Open questions:
  The expiry-validation path has not been fully inspected.
```

**The contract can require these parts and define their allowed types and limits.** For example, the sources field may need a list of valid source-reference objects rather than arbitrary text.

Whether the unresolved question prevents completion depends on the assignment. If expiry validation was required, the worker must not claim that requirement is satisfied.

## Follow a Result Through the Checks

Let us follow the same investigation from a weak first answer to a usable result.

### Step 1: Supply the Contract Before Work Starts

The application selects a trusted registered result contract for the assignment. The worker receives the relevant requirements for producing its result.

The model does not invent a new validator or relax the contract simply because it cannot fill a field.

### Step 2: Receive a Proposed Answer

Suppose the model returns:

```text
Login uses sessions. Done.
```

That may contain a useful hint, but it is missing the agreed report structure and supporting references.

### Step 3: Validate the Actual Returned Data

The **runtime validator checks the actual output against the selected contract.**

It identifies the missing required parts. The framework does not silently treat this as an accepted investigation result.

If a correction is permitted and enough allowance remains, the unit can receive bounded validation feedback and try to produce an appropriate result. Otherwise, it returns an explicit unsuccessful outcome with available progress. **Repairs and retries are not unlimited.**

### Step 4: Inspect the Evidence Requirements

The worker **returns a structured report** with sources and open questions. The required fields are now present, but we still need to examine the evidence behind the answer.

Imagine the report says:

```text
Finding: Password login creates a session after checking the password.
Source: auth/login.ts, lines 40–55, revision code-r2.
Open question: Session expiry has not been investigated.
```

The source reference is like a page number in a school report: it tells us where to look. **It does not, by itself, prove that the worker read that page or understood it correctly.**

The application's configured evidence checks and review can ask separate questions:

| Question                               | What the check can establish                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Is this source allowed?                | The reference belongs to the workspace or other sources permitted for this assignment. A reference to an unrelated private workspace would not qualify.                                         |
| Is it the right version?               | **The reference identifies the version actually investigated.** A revision is a particular saved version of the code; lines from an older version may describe behavior that has since changed. |
| Is there evidence of inspection?       | Where required, trusted tool records show that the relevant source content was rea**d. A filename written by the model is not a tool record.**                                                  |
| Is the supporting material available?  | The referenced code, saved excerpt, or check result can be retrieved through an authorized reader for inspection. An unavailable reference cannot supply the required evidence.                 |
| Does the evidence support the finding? | A reviewer examines whether the cited content actually justifies the claim. Reading a file is not proof that every conclusion about it is correct.                                              |

For example, **suppose lines 40–55 only check the password**. They do not show session creation. The reference might be allowed, point to the correct version, and have a genuine read record—yet still fail to support the full finding. The worker needs evidence from the session-creation path as well, or must narrow its conclusion and state what remains unknown.

Some checks can be automatic, such as comparing revision identifiers or looking up a recorded tool read. Understanding whether the code supports a claim may require a configured review step or an actual verification check. The framework must not treat a passed filename or schema check as proof that this review happened.

**Each check proves only its own part.** If required evidence is missing, the worker must gather it within the permitted limits or return an explicit incomplete or unsuccessful outcome. Writing a convincing source reference does not fill the gap.

### Step 5: Apply the Assignment's Acceptance Rules

Suppose the report explains session creation but leaves validation behavior unresolved.

If the assignment required only session creation, the report may satisfy its criteria while clearly stating that limit. If it required both creation and validation, the missing evidence keeps it incomplete.

The same shaped report can therefore be acceptable for one assignment and insufficient for another.

### Step 6: Record the Accepted Outcome

After applicable checks and acceptance rules are satisfied, **the executor returns its task result through StepRunner.** The engine coordinates recording and saving it under the run's rules.

The next step receives selected accepted findings. Saving failure still needs handling before dependent work treats the result as durably available.

## Types Help the Programmer; Runtime Checks Examine the Data

In TypeScript, a type can describe an expected result:

```typescript
// Teaching example only: source references are simplified here.
interface InvestigationReport {
  summary: string;
  sources: readonly string[];
  openQuestions: readonly string[];
}
```

This helps programmers connect compatible components while writing code.

But data returned by a model, external service, or saved record still needs runtime validation at the relevant boundary. TypeScript's interface does not inspect incoming data by itself.

Even a runtime check that confirms `sources` is a list of strings does not establish that those strings point to genuine supporting evidence. The real framework needs appropriate source-reference contracts and evidence policies for the job.

## A Valid Result Can Describe Failure

A verification result may correctly say:

```text
Checked source: code-r2
Check: Expired login-attempt test
Outcome: Failed
Evidence: The test observed a session being created after expiry.
```

That report can satisfy the verification result contract. It accurately describes a problem the workflow needs to address.

“Valid report” and “feature passes its checks” are different statements.

The outcome also needs to distinguish a check that could not run, cancellation, or interruption. Missing evidence must not be represented as a successful check with an empty report.

The workflow's policies use these outcomes to choose a permitted next path.

## Contracts Also Help Replace Components

Suppose an application replaces one investigation executor with another implementation.

The replacement must still accept the expected assignment, respect execution boundaries, and return results with the agreed meaning.

Returning the same field names is not enough. A worker that invents sources cannot substitute for one required to provide inspected evidence.

**Small interfaces describe shared capabilities;** implementations supply their behavior. Runtime contracts and acceptance rules help preserve reliable handoffs between those implementations.

If a result format changes, such as adding a new mandatory evidence field, producers, consumers, and stored-result handling need an explicit compatibility plan. The framework should not assume an old report automatically meets a newer agreement.

## An Agreement Does Not Grant Authority

A result contract may allow a field called “recommended next action.” That field contains a recommendation, not permission to perform it.

Likewise, a model response containing “approved” is not trusted user approval. Approval comes from the authorized user or host boundary and applies to the defined proposal and target.

Contracts organize information. Trusted policies still control permissions, budgets, lifecycle transitions, and publication.

## The Result Agreement and the Policy Agreement

A result contract describes what a valid result must contain. Policy<TInput, TOutput> describes how a configurable helper receives information and returns a choice or prepared value through apply(). A completion policy can consider a validated result and evidence, but cannot turn a correctly shaped unsupported claim into a proven success.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Can a report have all required fields while making an unsupported claim?
2. Does a TypeScript interface validate a model's returned data at runtime?
3. Can a failed-test report satisfy its reporting contract?
4. If an open question covers a mandatory requirement, may the worker quietly declare completion?
5. Does a recommendation field authorize the recommended action?

Possible answers:

1. Yes. Shape checks and supporting evidence answer different questions.
2. No. Runtime validation is a separate responsibility.
3. Yes. Accurate failure evidence is a useful verification result.
4. No. The applicable acceptance criteria still need to be met.
5. No. Trusted execution rules and authorization remain in control.

## Remember These Ideas

- A contract states what components can expect from one another.
- Result contracts make outputs understandable and checkable.
- Structure, evidence, and assignment acceptance are separate concerns.
- Honest failure and uncertainty belong in well-defined outcomes.
- A valid result cannot create permissions or replace required execution evidence.

**Next chapter:** Rules and Guards: Helping the Agent Work Correctly.

[Previous: Tools: How an Agent Reads, Searches, and Changes Things](08-tools-how-an-agent-reads-searches-and-changes-things.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
