# 3. Follow One Task Through the Framework

Imagine a folder moving between people working on a school project.

The first person adds research notes. The next adds a design. Another builds from that design. Finally, someone adds the test results.

Nobody needs to guess what the previous person did. They can open the folder and inspect the work.

In this chapter, we will follow one request through kushibot in the same way. We will look at what each worker receives, what it does, and what it returns.

This is an illustrative walkthrough of the proposed framework. Its reports and test results are made-up examples to explain the process.

## The Request We Will Follow

The user asks Project Helper:

> Add Google login. Keep password login working. Reject expired login attempts. Prepare the changes for review before applying them to my original project.

“Expired” means that a login attempt has waited too long to remain valid. We do not need to understand the whole Google login protocol yet. For this story, it is one important behavior the application must check.

The configured workflow is:

```text
Investigate → Specify → Implement → Verify → Review
                                  ↑          │
                                  └── Fix ───┘
                                      if permitted
```

The picture shows the intended path and a possible return for correction. The actual next step depends on the workflow's rules and the available time and budget.

## Stop 1: Open a Folder for This Request

The application starts a new run. Let us call it `run-101`.

Think of that ID as a label on this task's folder. It helps connect its assignments, reports, and tool operations.

The run begins with the user's goal and requirements:

```text
Run: run-101
Goal: Add Google login.
Must preserve: Existing password login.
Must reject: Expired login attempts.
Requested delivery: Prepared changes for review.
```

The host also supplies permitted tools, work boundaries, and execution limits. These do not come from a model inventing its own permissions.

For this example, changes will happen in a separate working copy. Applying them to the original project remains a later action requiring approval of the prepared proposal.

## Stop 2: Investigate the Existing Application

The engine selects the investigation step. StepRunner prepares its input and invokes the assigned investigation executor.

| What it receives | What it does | What it returns |
| --- | --- | --- |
| Goal, requirements, and permitted source access | Searches and reads relevant source files | Findings, source references, and open questions |

The executor may use an AgenticMindUnit: a worker that repeatedly asks a model for help, performs allowed tool actions, and examines the observations. A later chapter explains that loop in detail.

Here, the model requests a search for login code. A search tool returns matching files. A read tool then supplies their contents.

The investigator checks **what already exists** and **what is still missing**. Its report could say:

```text
What we found:
  Password login already has a way to create a user session.
  We can probably reuse that for Google login after checking the requirements.

What supports this:
  References to the login and session code we inspected.

What is not built yet:
  Google login is not implemented in this source snapshot.

What information is missing:
  The Google application configuration has not been supplied.
```

Google application configuration identifies the application connecting to Google. The **host** is the application running the framework; it supplies the permitted configuration. The worker must not invent missing values or pretend they were supplied.

The missing information does not stop every kind of work:

- **We can still plan:** describe the changes and identify where configuration will be needed.
- **We can still prepare code:** make it read configuration supplied by the host. Required values remain explicitly missing until supplied.
- **We cannot check a real Google login yet:** that check needs valid configuration. Tests using simulated responses can check some application behavior, but they do not prove that the real Google connection works.

Think of installing a lock before receiving its key. You can prepare the door and fit the lock, but you need the real key to test whether it opens.

The basic idea is: **say what you know, clearly name what is missing, and continue only with work that does not depend on it.**

If the current assignment requires a real Google-login check, the missing configuration blocks that requirement. The framework must report it as unfinished rather than claim the whole task is complete.

## Stop 3: Check and Save the Findings

The executor returns its report. The framework checks its required structure and applies the relevant acceptance rules.

For example, an investigation report may need findings, source references, and an explicit list of unresolved questions. Passing that structure check does not prove every conclusion is correct. Evidence and later review still matter.

The engine records the accepted result through the run's state rules and saves it using a repository. A **repository** is the component responsible for saving and loading those records.

Our imaginary folder now contains:

```text
run-101/
  User goal and requirements
  Accepted investigation findings
  References to inspected source
  Unresolved configuration question
```

This is a teaching picture, not a required filesystem layout.

## Stop 4: Turn Findings Into a Specification

The specification executor receives the original requirements and the selected investigation result.

A **specification** explains what we intend to build and how we will recognize acceptable behavior.

Its assignment is more precise than “write something about login”:

> Describe the Google-login changes, preserve the existing session behavior, define expiry handling, and identify the checks needed.

The result might include:

1. Add a Google sign-in entry point.
2. Handle the response from Google using the required configured credentials.
3. Validate the login attempt before creating a session.
4. Reject attempts that have expired.
5. Reuse the existing session service after successful validation.
6. Keep password-login behavior and its tests working.

The framework checks that the specification meets the required structure and acceptance rules, then records and saves the accepted result. The implementation worker can now use that saved specification to prepare the code.

Think of passing a clear assignment sheet to a classmate. They need the instructions and useful research, rather than every conversation you had while writing them.

For Google login, the implementation worker's assignment might contain:

```text
User goal:
  Add Google login and preserve password login.

Accepted specification:
  Validate the login attempt before creating a session.
  Reject expired attempts.
  Reuse the existing session service.

Supporting material:
  References to the relevant login and session source.
  A reference to the saved investigation report for more detail.

Still missing:
  Real Google application configuration has not been supplied.
```

The workflow defines which saved results become the next step's input. StepRunner prepares that input for the implementation executor. Mandatory requirements and relevant unresolved questions must stay visible; selecting information must not remove something the next worker needs to do the job correctly.

The implementation worker starts with its own session and working notes. It does not automatically inherit the investigator's or planner's entire conversation. If more detail is needed, it can read the referenced evidence through its permitted tools.

**Receiving information and receiving permission are separate things.** The host supplies the implementation worker's authorized tools and workspace boundary. A report mentioning a file does not grant permission to edit it. In this example, the worker can inspect and edit the assigned working copy, but it cannot apply those changes to the original project or deploy the application merely because it received the specification.

The point is: **give the next worker the information needed for its assignment, and separately enforce which actions it is allowed to perform.**

## Stop 5: Implement in the Working Copy

The implementation executor receives the specification, relevant evidence, and permitted editing capabilities.

```text
Receives: What to build and which requirements to preserve.
Works on: The authorized working copy.
Returns: Changed-file references, a change summary, and remaining issues.
```

When the model requests an edit, the tool performs the permitted file operation and records its result. The model's proposed edit alone is not evidence that the file changed.

Suppose the worker adds the Google-login handler and a check for login-attempt expiry. It returns its changes for verification.

That means implementation has produced a result. It does not yet establish that the feature behaves correctly.

## Stop 6: Run Checks and Discover a Problem

The verification executor runs the configured checks against the prepared source revision.

In our example, tests use a simulated Google response, so they can examine application behavior without a live Google login.

The actual test tool returns:

```text
Password-login regression test: PASS
Valid Google response test: PASS
Expired login-attempt test: FAIL

Observed: An expired attempt created a session.
Expected: The attempt should be rejected before session creation.
```

The verification executor successfully performed its assignment: it ran checks and returned their outcomes. The feature still has a failing check.

This distinction is useful. Finding a bug is valuable verification work, not a reason to hide the report or call it an empty result.

The report is tied to the source that was checked. If the files change afterward, those earlier results do not automatically prove the new files pass.

## Stop 7: Send a Focused Fix Assignment

The engine examines the failed verification result and the configured transition rules.

In this example, a fix is permitted and enough allowance remains. The next assignment includes the specification, current source references, and the failed test report:

> Correct expiry handling so an expired login attempt cannot create a session. Preserve the behavior already required by the specification.

The implementation worker finds that session creation happens before expiry validation. It moves validation before session creation and returns the updated changes.

The verification executor then runs the required checks again on the updated source. This time, all three example checks pass.

The earlier failure remains in the history. Recording the fix does not erase what happened.

If no safe fix were possible within the limits, the framework would stop with the available evidence and unfinished requirement. It would not repeat fixes forever.

## Stop 8: Review the Changes and the Evidence

The review executor receives the current prepared changes, specification, and applicable verification evidence.

It asks whether the changes meet the assignment and follow the required rules. Passing three tests is useful evidence, but review can still find a missing requirement or an unsupported claim.

Suppose this review accepts the prepared changes. It also notes that live Google integration was not tested because real application credentials were not supplied.

That limit belongs in the final report. A simulated response test does not establish that the real provider configuration works.

If review requires another change, the workflow follows its permitted correction path and refreshes the checks needed for the new source.

## Stop 9: Deliver the Prepared Result

The framework now evaluates whether the requested preparation work has met its completion rules.

The user receives a report like this:

```text
Prepared: Google-login changes in the working copy.
Preserved: Password-login behavior in the executed regression check.
Checked: Valid and expired login attempts using simulated responses.
Review: Accepted under the configured review policy.
Remaining limit: Live Google integration needs real configuration and testing.
Application to original project: Awaiting approval of the exact proposal.
```

Whether that remaining limit allows preparation to finish depends on the agreed criteria. If a live integration check was mandatory for completion, the outcome must remain unfinished or blocked by that missing configuration.

In our example, the requested deliverable is a reviewed proposal with its limitations stated. Applying it to the original project is a separate controlled action. Deployment is another action and has not happened merely because preparation finished.

## What Passed Between the Workers?

Follow the useful result at each handoff:

| From | To | Information passed |
| --- | --- | --- |
| User | Investigation | Goal and requirements |
| Investigation | Specification | Accepted findings and source references |
| Specification | Implementation | Expected behavior and planned checks |
| Implementation | Verification | Current changed source and required checks |
| Verification | Fix assignment | Failure evidence and current source references |
| Updated implementation | Verification and review | Updated changes and refreshed check results |
| Accepted preparation work | User | Proposal, evidence, and clear limitations |

The engine coordinates these handoffs. Executors carry out their assignments. Each result is checked and recorded before it is relied on through the configured process.

## How Each Worker Gets Its Assignment

Each workflow step has an input policy object. The framework calls its apply() method with the selected request and accepted earlier results, then gives the returned assignment to the worker. The next worker gets a new selected input, not the previous conversation. This uses the same Policy agreement as model-context selection.

For the shared technical contract, see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Check Your Understanding

1. Why should the specification worker receive investigation findings?
2. Can verification finish its assignment while reporting failed tests?
3. After a fix changes the code, can we rely only on test results from before the fix?
4. Does a reviewed proposal mean changes have been applied or deployed?

Possible answers:

1. To plan from inspected evidence instead of guessing about the application.
2. Yes. Its job includes accurately reporting failures.
3. No. Required checks need to cover the updated source.
4. No. Those are separate actions with their own conditions.

## Remember These Ideas

A task moves forward through useful, checked handoffs. Each worker receives a clear assignment and returns evidence that the next worker can use.

Failures can lead to focused corrections when policy and limits permit them. Completion is judged against the agreed deliverable, including any required checks and approvals.

**Next chapter:** Workflows: The Plan That Connects the Steps.

[Previous: Meet the Main Characters](02-meet-the-main-characters.md) · [Return to the framework notes](../harness-workflows-executors-framework-idea.md)
