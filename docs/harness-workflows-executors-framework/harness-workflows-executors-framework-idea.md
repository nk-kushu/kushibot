# kushibot: Agent Workflows and Executors

Source: [Framework Idea for Workflows and Executors in Inferia Harness](https://chatgpt.com/space/page_ba1924f204608191b414995e7cbb7dee)

The library is named **kushibot**. Its library-owned environment variables use the **KUSHIBOT_** prefix.

A proposal for a small framework in Inferia Harness that describes agent work through Workflow, Step, Executor, and Run. The goal is for the process to read like a human plan, while shared infrastructure manages progress, persistence, and recovery.

**Workflow is the plan, Step is the task, Executor performs the task, and Run is a specific execution of the plan.** The example API in the linked documents is a concept for a future implementation.

The framework must be **highly object-oriented:** cohesive classes own behavior and state, small interfaces define capabilities, and **dependency injection and polymorphism support extension**. See the OOP architecture document for the mandatory design rules.

**One policy concept:** Configurable selections, decisions, and transformations use `Policy<TInput, TOutput>` and its asynchronous `apply(input)` method. Concrete classes supply task-specific behavior; separate mapper and domain-policy interfaces are replaced by this shared contract. See [One Shared Policy Concept](31-shared-policy-concept.md).

**Implementation scope:** Build and test only the standalone framework. Existing Harness code and application-wide schemas, routes, and UI remain unchanged.

## Table of Contents

1. [Core Concepts](01-core-concepts.md)
2. [Framework Location and File Organization](02-location-and-file-organization.md)
3. [Executors and Contracts](03-executors-and-contracts.md)
4. [Workflow Definition and Engine](04-workflow-definition-and-engine.md)
5. [Recovery, Memory, and Context Handoff](05-recovery-and-memory.md)
6. [Scope of the First Version](07-first-version-scope.md)
7. [OOP Architecture and Design Rules](08-oop-architecture-and-design-rules.md)
8. [Core Concepts Explained with an Example](09-core-concepts-explained-with-example.md)
9. [StepRunner and Contexts Explained](10-step-runner-and-contexts.md)
10. [Debug Events and Run Tracing](11-debug-events-and-run-tracing.md)
11. [AgenticMindUnit: A Reusable Agentic Work Unit](12-agentic-mind-unit.md)
12. [Agent Memory Across Tasks and Sessions](13-agent-memory.md)
13. [Model Routing and Escalation](14-model-routing-and-escalation.md)
14. [DecisionUnit: A System 1 Decision Layer](15-system-one-decision-unit.md)
15. [Why Steps and Executors Are Separate](16-why-steps-and-executors-are-separate.md)
16. [Limits, Budgets, and Execution Control](18-limits-budgets-and-execution-control.md)
17. [Hierarchical, Task-Aware Model Routing](19-hierarchical-task-aware-model-routing.md)
18. [Guards: Skills, Rules, and System 1 Selection](20-guards-skills-rules-and-system-one-selection.md)
19. [Isolated Workspaces, Review, and Approved Publication](21-isolated-workspaces-review-and-publication.md)
20. [State Machines and Coordinated Lifecycles](22-state-machines-and-coordinated-lifecycles.md)
21. [ArtifactStore: Produced Materials and Evidence](23-artifact-store-and-produced-materials.md)
22. [Execution State Versus Reusable Knowledge](24-execution-state-versus-reusable-knowledge.md)
23. [Complete Agent Example: Every Framework Feature Together](25-complete-agent-example-all-framework-features.md)
24. [Framework Configuration and Startup](26-framework-configuration-and-startup.md)
25. [LLM Cache: Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md)
26. [Sub-Agents: Child AgenticMindUnits](28-dynamic-agentic-unit-delegation.md)
27. [Rolling Context and Compression](29-rolling-context-and-compression.md)
28. [Putting Skills and Model Work in the Right Order](30-skill-ordering-and-smart-orchestration.md)
29. [Complete Framework Walkthrough: Google Login](17-google-login-complete-walkthrough.md)

30. [One Shared Policy Concept Across the Framework](31-shared-policy-concept.md)

## Architecture Requirement: Enable Provider Prompt Caching

The framework must be constructed so provider prompt caching is possible: stable request composition keeps unchanged shared material consistently ordered and represented, and provider adapters preserve that structure while handling supported controls and usage reporting. The provider owns cached computation and decides actual hits. Every new model request generates a new response. See [Provider Prompt Caching](27-llm-cache-and-safe-response-reuse.md) and [student chapter 18](framework-for-students/18-caching-reusing-work-when-it-is-still-useful.md).

