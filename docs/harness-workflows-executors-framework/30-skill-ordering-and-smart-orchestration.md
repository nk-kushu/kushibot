# Putting Skills and Model Work in the Right Order

Knowing which skills apply to a task is only part of the problem. The agent also needs to know when to use them and which work must happen first.

Imagine asking an agent to add Google login. Reviewing the code before it exists would be useless. Giving the agent security guidance only after it finishes coding could cause avoidable mistakes. The order matters.

The proposed framework can address this with a `SkillOrchestrator`: an object that helps prepare an ordered plan for the selected skills, model calls, and checks. This is a design proposal, not an implemented capability.

## Instructions and Actions Have Different Kinds of Order

Some skills are instructions that guide the same piece of work. OOP guidance and security guidance can both be given to the coding model before it starts. They do not necessarily need separate model calls.

Other capabilities perform actions. An investigation reads the existing project. An implementation changes files. A lint check examines those changes. These actions have dependencies: the check needs the files it is supposed to check.

The orchestrator should understand that difference. It should not turn every paragraph of guidance into a separate agent or model call. It should arrange actual work and make the right instructions available when that work happens.

Putting one instruction later in a prompt is also not a reliable way to resolve contradictory rules. Conflicting mandatory guidance needs an explicit policy decision before the agent proceeds.

## A Google Login Example

First, the agent investigates how authentication already works. That gives it evidence for planning and helps the guard-selection service identify relevant guards.

Next, the planner receives the selected security and OOP instructions. It proposes how Google login will fit into the existing application, including the requirement to preserve password login.

A review checks that plan before implementation begins. Then the coding agent receives the accepted plan and the applicable instructions, and edits the isolated workspace.

Once changes exist, type checks and ESLint can examine them. Architecture and security reviews inspect the resulting implementation. Independent checks may run together when the configured execution policy allows it; an action that needs another action's result must wait.

If a review finds a problem, the workflow gives the coding agent a focused correction assignment. After the correction, the affected checks run again against the new source version.

This is one sensible plan for this example. A documentation-only task would need a much smaller plan. The orchestrator should adapt to the assignment rather than force every task through the same sequence.

## Where the Smart Part Helps

A model can help decide whether a task needs an investigation, which optional review is useful, or whether a risk deserves an additional planning pass.

The existing `DecisionUnit` can provide bounded recommendations through JEV or another injected provider. For more complex planning, a model-assisted planning strategy can use an eligible model selected through `ModelRouter`.

The model proposes work using known capability identifiers and explicit dependencies. It cannot invent executable commands, register new skills, grant tools, or remove mandatory checks.

Ordinary framework code validates the proposal before execution. It rejects unknown capabilities, missing requirements, impossible dependencies, and cycles such as “review waits for coding, while coding waits for review.” It also checks the applicable permissions and limits. If the model is unavailable, an explicitly configured dependency-based fallback can prepare a valid plan; otherwise the framework reports that planning could not be completed safely.

## How This Fits the OOP Framework

`SkillOrchestrator` coordinates preparation of the plan. It receives its collaborators through its constructor rather than constructing concrete model clients internally.

The shared `Policy<SkillPlanningInput, SkillPlanningOutcome>` contract makes planning behavior replaceable; no separate strategy interface is needed. A `DependencyBasedSkillPlanner` implements that contract and uses declared prerequisites. A `ModelAssistedSkillPlanner` implements the same contract and adds task-specific recommendations. SkillOrchestrator awaits its configured planningPolicy.apply(input). A separate `SkillPlanValidator` checks that the resulting plan respects the framework's requirements.

Your application builds these objects directly, just as it builds the rest of the harness. Switching JEV for another decision provider changes the injected adapter rather than the workflow or guard implementations.

The orchestrator prepares a plan; the workflow engine executes it and owns the run's progress. `StepRunner` still executes assignments, `AgenticMindUnit` still performs model-and-tool work, and `GuardRunner` still runs actual checks. Skill ordering does not create a second engine with separate lifecycle state.

An accepted plan should be recorded with its relevant skill versions, dependencies, and reasons. A fixed workflow can use recommendations only within its declared extension points. Supporting a dynamically assembled workflow requires an explicit supported plan format and engine validation; a model response does not automatically become executable workflow code.

## Keep Adaptation Visible and Bounded

Sometimes new evidence changes what should happen next. If implementation unexpectedly changes a database schema, another guard or review may become relevant.

The orchestrator can propose a revised plan, but the framework must validate and record that revision. Previously mandatory work cannot quietly disappear. Earlier check results remain associated with the source version they actually checked, and affected work must be checked again.

Planning, selection, reviews, and corrections all consume the existing run budget. Rearranging work does not reset limits. Debug events should explain the proposed order, the accepted order, and why a revision was made.

A useful first version would begin with explicit dependencies and optional model recommendations. For the Google-login agent, this means getting the right guidance before coding and real evidence afterward, while the existing workflow machinery keeps execution controlled and understandable.

Related chapters: [Guards and Skills](20-guards-skills-rules-and-system-one-selection.md), [DecisionUnit](15-system-one-decision-unit.md), [Workflow and Engine](04-workflow-definition-and-engine.md), and [Model Routing](19-hierarchical-task-aware-model-routing.md).

## Planning Through apply()

DependencyBasedSkillPlanner and ModelAssistedSkillPlanner both implement Policy<SkillPlanningInput, SkillPlanningOutcome>. SkillOrchestrator awaits planningPolicy.apply(input) and submits its proposed plan to SkillPlanValidator. A plan cannot execute merely because a policy returned it: the engine validates allowed capabilities, dependencies, required checks, scope, and limits before scheduling. The validator and engine remain execution/invariant owners rather than new policy interfaces.

See [One Shared Policy Concept](31-shared-policy-concept.md) for the common contract, object setup, and recovery rules.

[Back to the table of contents](harness-workflows-executors-framework-idea.md)
