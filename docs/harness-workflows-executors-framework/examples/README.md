# Agents to Build with the Framework

This folder contains specifications for example agents we intend to build. The documents explain their behavior, stages, handoffs, limits, and expected results. They include proposed API blueprints and code samples, not implemented library exports. All configurable choices use the shared Policy<TInput, TOutput> contract and apply() method; see [One Shared Policy Concept](../31-shared-policy-concept.md).

## Planned Examples

[OOP Coding Agent: Plan, Class Skeletons, and Method Implementation](01-oop-coding-agent-plan-skeleton-implementation.md) describes a coding agent with three model roles. A strong model prepares the plan, a different model creates class declarations with empty methods, and an economical coding model fills those methods. An OOP guard guides and checks the work across the stages.

Each example should be possible to demonstrate in an isolated fixture workspace before using real providers or publishing changes to a real project.

[Back to the framework overview](../harness-workflows-executors-framework-idea.md)
