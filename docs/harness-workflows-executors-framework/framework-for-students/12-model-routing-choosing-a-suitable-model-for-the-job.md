# 12. Model Routing: Choosing a Suitable Model for the Job

Imagine your classroom bridge project has several available helpers.

One is good at explaining familiar designs. Another has experience with difficult structural problems. A third helps turn long research notes into a short report.

Before assigning work, the teacher considers the job, the helpers' abilities, and the remaining class time.

The proposed kushibot framework does something similar through **model routing**. It selects a permitted model configuration suitable for a particular assignment.

This chapter explains the design using fictional profiles. Their names do not claim that a particular commercial model is cheaper, faster, or better.

## Start With the Job, Not the Model Name

A small documentation update and an unfamiliar authentication redesign may need different capabilities.

The router first needs to understand the assignment:

```text
Assignment:
  Implement a login callback from an accepted specification.

Needs:
  Support the required tool protocol.
  Produce the required result format.
  Fit the supplied context and expected output.
  Respect permitted provider scope, deadline, and budget.
```

A model's reputation or a label such as “strong” does not prove it meets those needs. The application needs supported capability information and relevant measured results where available.

Some jobs do not need a model. A verification executor can run configured checks directly. Routing should not add model calls merely because the framework supports them.

## What Is a Model Profile?

A **model profile** is a saved description of a model the framework can choose. Think of it as a helper's information card: who the helper is, what they can do, and what limits they have.

For example, a fictional profile could look like this:

```text
Profile name: coding
Provider: Example Provider
Model: Example Model A
Can use tools: Yes
Can read images: No
Maximum input size: 32,000 tokens
```

The **provider** is the service that supplies the model. **Tokens** are the small pieces of text a model reads and writes; the input limit tells us how much it can read in one request.

Here, `coding` is just a name the application uses to find this saved configuration. The name alone does not prove that the model is good at coding. The router checks the actual capabilities and requirements before choosing it.

### Why Do We Need Profiles?

Because a model's name alone does not tell the framework everything it needs to make a choice. It also needs to know whether the model supports the required tools, can read the supplied input, and has enough room for the task.

Saving that information in a profile gives the router one place to look. Each workflow can refer to `coding` instead of repeating the provider, model, and capability information. If you later change which model that profile uses, you can update its configuration in one place.

For example, if the assignment requires reading a screenshot, the router can see that the profile above cannot do it and look for another suitable profile.

A profile can also record where the model is allowed to be used and observations about cost, speed, or result quality. Those observations help the router compare suitable choices; they are not guarantees.

Creating a profile does not start the model or give it access to your data. It only saves the information used when deciding what to run. Permissions still have to be checked when the model is used.

## Why Check Eligibility Before Comparing Models?

The router needs to choose a model that can actually complete the assignment. Choosing by price or speed alone could select a model that cannot do the work, causing a failed attempt, wasted time, and extra cost when the task must be retried.

For example, suppose an assignment asks the agent to read an image and explain what it shows:

| Candidate | Can read images? | Relative cost | Router decision |
| --- | --- | --- | --- |
| Model A | No | Cheapest | Exclude: it cannot read the required input. |
| Model B | Yes | Lower | Eligible; choose it if lower cost is the preference and it satisfies the other requirements. |
| Model C | Yes | Higher | Eligible; another preference, such as better observed quality, could favor it. |

The router therefore answers two questions in order:

1. **Which models can and may do this job?** These checks are called **constraints**. A model must satisfy every applicable constraint: required capabilities, permission to use the provider for this task's data, and limits such as context size or the remaining budget. A model that passes is **eligible**.
2. **Which eligible model do we prefer?** These comparisons are called **preferences**. They can favor lower total cost, faster responses, or better observed quality for this kind of task.

Why separate these questions? Because a preference can be traded off, while a requirement must still be met. We might accept a slower response to save money. But saving money cannot make a model without image support able to read an image.

If no model passes the required checks, the router reports that no eligible model is available, or follows a configured fallback that still respects the requirements. For example, it could try another permitted provider with image support. It must not silently drop the image requirement just to select something.

## Several Levels Contribute to One Decision

The agent, workflow, step, and actual assignment can all contribute requirements.

```text
Agent's permitted profiles and defaults
             +
Workflow's preferences
             +
Step's requirements
             +
Actual assignment and evidence
             +
Current session needs and remaining allowance
             ↓
One resolved routing context
```

The router combines these inputs under documented rules. They do not become several independent routers fighting over the selected model.

A specific step may override an ordinary preference where allowed. It cannot weaken a mandatory provider restriction or enlarge its parent budget.

Text generated by a model is task evidence, not authority to add a forbidden provider to the candidate list.

## Follow One Routing Decision

Project Helper is ready to implement Google login from an accepted specification.

### Step 1: Resolve the Requirements

The calling capability supplies the specification, bounded task evidence, required tools and result format, trusted configuration, and applicable limits.

The router records the resolved context or safe references to it so the decision can be inspected later.

### Step 2: Filter the Candidates

Suppose three fictional profiles are configured:

```text
Profile A: Supports the required coding tools and output contract.
Profile B: Also supports the required coding tools and output contract.
Profile C: Does not support the required tool protocol.
```

Profile C is excluded. Other eligibility checks still apply to A and B, including context capacity, allowed provider scope, and current limits.

### Step 3: Select Among Eligible Choices

Selection can follow configured deterministic rules or use a bounded DecisionUnit recommendation.

For example, DecisionUnit might receive:

```text
Question:
  Which eligible profile is suitable for this implementation assignment?

Evidence:
  The specification is accepted.
  The existing authentication pattern is documented.
  The expected change is bounded.

Candidates:
  Profile A
  Profile B
```

The returned choice is validated. It cannot introduce Profile C or another unknown candidate.

If one eligible candidate remains or an explicit permitted binding already resolves the choice, an extra model-assisted selection may be unnecessary. Selection calls consume resources too.

### Step 4: Recheck and Reserve Capacity

Available budget and capacity can change while another task is running.

The framework rechecks near dispatch and reserves the permitted resources. A routing estimate is not itself a reservation.

If capacity is unavailable, it follows the configured bounded wait, fallback, or stop policy. It does not begin unlimited work based on an earlier estimate.

### Step 5: Supply the Selected Gateway

ModelGatewayFactory supplies the registered adapter for the selected concrete model.

A **gateway** is the framework's model-calling capability. Its adapter translates between the framework contract and the provider's supported request and response format.

The workflow does not need provider-specific branches to perform the coding assignment.

### Step 6: Start the Session and Record the Choice

The new coding session uses its selected gateway. The trace records the selected identity, applicable policy, reasons, and usage references.

The worker still receives only its permitted tools and workspace. Model selection does not expand editing scope or remove required checks.

## Keep the Model Stable Within a Session

In the proposed first version, an AgenticSession keeps its selected gateway throughout that session.

If policy calls for a different model, the framework starts a new session with an explicit **ModelHandoff**.

Think of handing a project folder to another helper. The new helper needs the assignment, relevant evidence, unfinished work, and current source references.

It does not need a blind copy of another provider's live conversation protocol.

A separate summarization operation may use another model under its own bounded scope without replacing the active coding session's gateway.

## What If the First Model Struggles?

Suppose verification repeatedly finds the same expiry bug after permitted corrections.

The framework now has evidence that the current approach is not making enough progress. An escalation policy may permit a new diagnostic session with another eligible profile.

The handoff can contain:

```text
Goal:
  Reject expired login attempts while preserving password login.

Current source:
  Reference to the latest authorized working revision.

Completed work:
  Callback handler and tests were added.

Unresolved issue:
  Expiry test still fails after the recorded correction attempts.

Evidence:
  Current test reports and relevant source references.

Pending operations:
  Explicitly recorded, including any uncertainty.

Remaining allowance:
  References to the shared run budget and applicable limits.
```

The new session may diagnose or replan before editing. A model change does not reset used budget, erase failed attempts, or prove the problem is fixed.

Escalations and fallback chains remain bounded. If no suitable option is available, the framework reports the unresolved work honestly.

## Avoid a Selector That Selects Itself Forever

If DecisionUnit helps choose an execution model, its own provider needs a starting configuration.

Otherwise, the system could ask:

> Which model should choose the model that chooses the model?

The design avoids that loop with an explicitly configured decision provider or another finite deterministic bootstrap rule. Optional fallback choices also have defined boundaries and accounting.

## Measure the Whole Task

A model with lower input cost may still lead to more retries, failed fixes, or escalations. A different profile may improve one task and offer no advantage on another.

Evaluate completed work, quality, elapsed time, and total usage across routing calls, execution, verification, and corrections. Treat estimates and limited past observations as evidence with limits, not universal promises.

Required quality and verification criteria remain unchanged across model choices.

## Model Selection Is Another Policy

A routing policy receives the task requirements, eligible model profiles, evidence, and remaining limits. Its apply() method returns a model choice or an explicit no-selection result. It uses the same Policy agreement as input and context selection. The router and session factory perform the setup, and the shared usage ledger still reserves actual capacity.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Should a preference for lower cost override required tool support?
2. Can a step expand the agent's permitted provider list?
3. Does every routing decision require DecisionUnit?
4. Does switching models erase the run's consumed usage?
5. Does a new model receive permission to skip a failing required test?

Possible answers:

1. No. Eligibility comes before preference.
2. No. Mandatory parent constraints remain in force.
3. No. Configured selection or one eligible candidate may be sufficient.
4. No. Usage and execution history remain attached to the run.
5. No. Verification requirements still apply.

## Remember These Ideas

- Routing matches an actual assignment to a suitable permitted model profile.
- Mandatory constraints filter candidates before preferences select among them.
- DecisionUnit can recommend a choice; policy validates and applies it.
- Capacity and budget need rechecking and reservation near execution.
- Changing models uses a new session and explicit handoff without resetting limits.

**Next chapter:** Context: Choosing What the Model Needs to See.

[Previous: DecisionUnit: Answering Small Questions Before Taking Action](11-decision-unit-answering-small-questions-before-taking-action.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
