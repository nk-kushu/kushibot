# OOP Coding Agent: Construction and Components

Proposed kushibot API blueprint, not runnable library code. Framework types/constructors are assumed imports from its future public API; the named application components below show their wiring and behavior. Host model clients, runtime result validators, language-aware parsing, tools, and approval adapters are injected.

## OopCodingAgentFactory.ts

```typescript
class OopCodingAgentFactory {
  constructor(private readonly integrations: OopCodingIntegrations) {}

  async create(): Promise<OopCodingAgent> {
    this.validateModels();
    const i = this.integrations;
    const stores = new SqliteFrameworkStores({
      filename: "./data/oop-agent.sqlite",
    });
    const artifacts = new FileArtifactStore({
      directory: "./data/oop-agent/artifacts",
    });
    const sessions = new AgenticSessionFactory({
      checkpoints: stores.checkpoints,
      usage: stores.usage,
      artifacts,
      debug: i.debug,
    });
    const decisions = new BoundedDecisionUnit({ provider: i.decisionProvider });
    const guards = new GuardCoordinator({
      registry: new GuardRegistry([
        new OopGuardFactory(i.syntax, i.models.planner.gateway).create(),
      ]),
      required: ["oop-programming"],
      selection: new GuardSelectionService({ decisions }),
    });
    const skeletonPolicy = new DeclarationsOnlyPolicy(i.syntax);
    const implementationPolicy = new PreserveSkeletonPolicy(i.syntax);

    const steps: OopCodingSteps = {
      guards: new SelectGuardsExecutor(guards),
      plan: new StructuredTaskExecutor({
        mind: this.mind(i.models.planner, i.tools.readOnly(), sessions),
        assignmentPolicy: new OopPlanAssignmentPolicy(),
        resultContract: i.contracts.plan,
      }),
      reviewPlan: new GuardReviewExecutor({ guards, phase: "plan" }),
      skeleton: new WorkspaceEditingExecutor({
        mind: this.mind(
          i.models.skeleton,
          i.tools.forEdits(skeletonPolicy),
          sessions,
        ),
        assignmentPolicy: new ClassSkeletonAssignmentPolicy(),
        resultContract: i.contracts.skeleton,
      }),
      reviewSkeleton: new SkeletonReviewExecutor(
        [new EmptyBodiesCheck(i.syntax), new ManifestMatchCheck(i.syntax)],
        guards,
        i.syntax,
      ),
      implement: new WorkspaceEditingExecutor({
        mind: this.mind(
          i.models.coder,
          i.tools.forEdits(implementationPolicy),
          sessions,
        ),
        assignmentPolicy: new ImplementMethodsAssignmentPolicy(),
        resultContract: i.contracts.implementation,
      }),
      verify: new VerificationExecutor(i.projectChecks),
      review: new StructuredTaskExecutor({
        mind: this.mind(i.models.planner, i.tools.readOnly(), sessions),
        assignmentPolicy: new FinalReviewAssignmentPolicy(),
        resultContract: i.contracts.review,
      }),
      finalGate: new FinalAcceptanceExecutor(guards),
      publish: new ApprovedPublicationExecutor({
        approvals: i.userApprovals,
        journal: stores.publications,
        artifacts,
        onConflict: "stop",
      }),
    };

    const workspaces = new WorkspaceManager({
      provider: new DirectoryCopyWorkspaceProvider({
        directory: "./data/oop-agent/workspaces",
        allowedSourceRoots: ["/projects"],
      }),
    });
    const workflow = new PlanSkeletonImplementWorkflow(steps).define();
    const harness = new AgentHarness({
      stores,
      artifacts,
      sessions,
      guards,
      decisions,
      workspaces,
      limits: i.limits,
      debug: i.debug,
    });
    // Initializes owned stores and the standard engine/StepRunner.
    // Must release acquired resources on failed startup.
    await harness.initialize();

    return new OopCodingAgent(harness, workspaces, workflow);
  }

  private mind(
    model: ModelBinding,
    tools: ScopedToolFactory,
    sessions: AgenticSessionFactory,
  ): AgenticUnit<TaskAssignment, AgenticOutcome> {
    const runner = new AgenticMindUnitRunner<TaskAssignment, AgenticOutcome>({
      model: model.gateway,
      tools,
      sessions,
      contextComposer: new AgentContextComposer({
        contextPolicy: this.integrations.contextPolicy,
        tokenCounter: this.integrations.tokenCounter,
        compression: this.integrations.compression,
      }),
      completionPolicy: this.integrations.completionPolicy,
      // A fresh isolated session is created per invocation.
      // All sessions consume the same applicable run ledger.
    });
    return new AgenticMindUnit(runner);
  }

  private validateModels(): void {
    const models = Object.values(this.integrations.models);
    if (new Set(models.map(model => model.identity)).size !== 3) {
      throw new Error("Planner, skeleton and coder require distinct models");
    }
  }
}
```

## OopCodingAgent.ts

The factory returns one ready-to-use OopCodingAgent. The caller gives it a goal and a source codebase. The agent already knows which workflow to use and how to create a working workspace.

Keeping these collaborators private is encapsulation. The caller does not need to receive a loose bundle of agent, workflow, and workspaces or assemble the same process again for every task.

```text
OopCodingAgent
  ├── AgentHarness: executes and records the process
  ├── WorkspaceManager: creates a separate working copy for each task
  └── WorkflowDefinition: describes this agent's plan/skeleton/implementation process
```

The workflow definition is reusable. Every start creates a new workspace and run, with isolated StepRun/session state. OopCodingAgent is an application-specific facade over the general framework; it does not implement another workflow engine.

```typescript
interface CodingTaskRequest {
  readonly scope: {
    readonly agentId: string;
    readonly projectId: string;
  };
  readonly source: string;
  readonly goal: string;
}

class OopCodingAgent {
  constructor(
    private readonly harness: AgentHarness,
    private readonly workspaces: WorkspaceManager,
    private readonly workflow: WorkflowDefinition,
  ) {}

  async start(task: CodingTaskRequest) {
    const workspace = await this.workspaces.create({
      source: task.source,
      sourceState: "current-working-state",
    });

    return this.harness.start(this.workflow, {
      scope: task.scope,
      request: {
        goal: task.goal,
        workspace: workspace.id,
      },
    });
  }

  waitForAttention(runId: string) {
    return this.harness.waitForAttention(runId);
  }

  close() {
    return this.harness.close();
  }
}
```

This is the happy-path wiring in the proposed blueprint. The public boundary must validate the task and authorize its scope/source before creating side effects, with provider-level path enforcement as well. If workspace creation succeeds but starting the run fails, record and retain/release the framework-owned workspace under an explicit recovery/retention policy; do not silently leave untracked work or delete user files. Those boundary/failure adapters are omitted from this small class to keep the relationship clear.

The workspace manager has one resource owner in composition; delegating close through the harness must release only owned resources once. Waiting for approval is persisted waiting state, not completed publication. Trusted approval still comes from the authenticated host boundary, never from this facade or a model-generated result.

### Where PlanSkeletonImplementWorkflow Is Used

OopCodingAgentFactory constructs the executors first and passes them into PlanSkeletonImplementWorkflow. Calling define() builds the immutable plan and its input policies; it does not run the model or create skeleton files.

The factory injects that definition into OopCodingAgent. Each call to agent.start(task) creates the working copy and calls harness.start(this.workflow, ...) internally. WorkflowEngine then follows the definition, StepRunner invokes the chosen executor, and OopCodingTransitions controls the permitted next assignment or correction.

```text
Factory creates executors and their model/tool dependencies
                        ↓
PlanSkeletonImplementWorkflow.define() builds their plan
                        ↓
OopCodingAgent stores the plan and workspace manager privately
                        ↓
Caller supplies goal + source + authorized scope
                        ↓
Agent creates workspace and starts its configured workflow
                        ↓
WorkflowEngine → StepRunner → selected executor
```

Returning separate workflow/workspaces objects can be useful when the caller intentionally builds arbitrary processes with the general framework. This example builds a particular coding agent, so it exposes one composed object instead.

## contracts.ts

```typescript
interface CodingRequest {
  readonly goal: string;
  readonly workspace: string;
}

interface ModelBinding {
  readonly identity: string; // Canonical provider/model identity, not an alias.
  readonly gateway: ModelGateway;
}

interface Correction {
  readonly issues: readonly string[];
  readonly evidence: readonly ArtifactRef[];
}

interface PlannedMethod {
  readonly id: string;
  readonly signature: string;
  readonly purpose: string;
  readonly inputs: readonly string[];
  readonly output: string;
  readonly errors: readonly string[];
  readonly sideEffects: readonly string[];
  readonly scenarios: readonly string[];
}

interface PlannedClass {
  readonly file: string;
  readonly name: string;
  readonly responsibility: string;
  readonly dependencies: readonly string[];
  readonly methods: readonly PlannedMethod[];
}

interface OopPlan {
  readonly version: string;
  readonly classes: readonly PlannedClass[];
  readonly interfaces: readonly string[];
  readonly permittedExistingEdits: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly report: ArtifactRef;
}

interface SkeletonResult {
  readonly snapshot: WorkspaceSnapshotRef;
  readonly manifest: ArtifactRef;
  readonly changedFiles: readonly string[];
}

interface SkeletonReview {
  readonly accepted: boolean;
  readonly snapshot: WorkspaceSnapshotRef;
  readonly manifest: ArtifactRef; // Regenerated/validated from actual source.
  readonly issues: readonly string[];
  readonly evidence: readonly ArtifactRef[];
}

interface ImplementationResult {
  readonly snapshot: WorkspaceSnapshotRef;
  readonly changedFiles: readonly string[];
  readonly report: ArtifactRef;
  readonly needsPlanRevision: boolean;
  readonly questions: readonly string[];
}

interface AcceptanceResult {
  readonly accepted: boolean;
  readonly issues: readonly string[];
  readonly evidence: readonly ArtifactRef[];
}

interface PlanInput {
  readonly request: CodingRequest;
  readonly guidance: GuardSelection;
  readonly feedback?: Correction;
}

interface SkeletonInput {
  readonly workspace: string;
  readonly plan: OopPlan;
  readonly guidance: GuardSelection;
  readonly feedback?: Correction;
}

interface ImplementationInput extends SkeletonInput {
  readonly acceptedSkeleton: SkeletonReview;
}

interface ReviewInput {
  readonly plan: OopPlan;
  readonly implementation: ImplementationResult;
  readonly verification: VerificationResult;
}

interface TaskContracts {
  // Host supplies registered runtime validators; TS types are not validation.
  readonly plan: ResultContract<OopPlan>;
  readonly skeleton: ResultContract<SkeletonResult>;
  readonly implementation: ResultContract<ImplementationResult>;
  readonly review: ResultContract<AcceptanceResult>;
}

interface OopCodingIntegrations {
  readonly models: {
    readonly planner: ModelBinding;
    readonly skeleton: ModelBinding;
    readonly coder: ModelBinding;
  };
  readonly decisionProvider: DecisionProvider; // JEV or a compatible adapter.
  readonly syntax: SyntaxInspector;
  readonly contextPolicy: Policy<ContextPolicyInput, ContextSelection>;
  readonly completionPolicy: Policy<CompletionInput, CompletionDecision>;
  readonly tokenCounter: TokenCounter;
  readonly compression: ContextCompression;
  readonly tools: WorkspaceToolFactory;
  readonly contracts: TaskContracts;
  readonly projectChecks: VerificationCapability;
  readonly userApprovals: TrustedApprovalSource;
  readonly limits: ExecutionLimits;
  readonly debug: DebugServices;
}
```

## stage-assignment-policies.ts

These assignment-preparation classes implement the same Policy contract as the workflow input policies. Executors await assignmentPolicy.apply(input), invoke the unit, and validate its outcome using the separately supplied resultContract. Result validation remains an explicit runtime capability rather than another assignment interface. TaskAssignment, AgenticOutcome, and the context-policy supporting types are proposed public domain contracts; they are omitted from this wiring blueprint.

```typescript
class OopPlanAssignmentPolicy implements Policy<PlanInput, TaskAssignment> {
  async apply(input: PlanInput): Promise<TaskAssignment> {
    return {
      goal: input.request.goal,
      input,
      instructions: [
        "Investigate the authorized working workspace using read/search tools.",
        "Apply the selected OOP guard skill and preserve existing user work.",
        "Define classes, interfaces, injected dependencies and method contracts.",
        "Specify errors, side effects, integration edits and check scenarios.",
        "Separate new declarations from any permitted existing-file edits.",
        "Resolve feedback; do not implement the feature or invent evidence.",
      ],
    };
  }
}

class ClassSkeletonAssignmentPolicy implements Policy<SkeletonInput, TaskAssignment> {
  async apply(input: SkeletonInput): Promise<TaskAssignment> {
    return {
      goal: "Create only the accepted plan's class and interface declarations",
      input,
      instructions: [
        "Create planned files, imports, types, dependencies and signatures.",
        "Leave concrete method and constructor bodies empty.",
        "No algorithms, dummy returns, placeholder throws or initialization.",
        "No static blocks, implicit runtime initializers or executable wiring.",
        "Never remove existing implemented method bodies to make a skeleton.",
        "Return snapshot/manifest references; report unsupported draft syntax.",
      ],
    };
  }
}

class ImplementMethodsAssignmentPolicy
  implements Policy<ImplementationInput, TaskAssignment>
{
  async apply(input: ImplementationInput): Promise<TaskAssignment> {
    return {
      goal: "Implement the accepted empty methods without redesigning the classes",
      input,
      instructions: [
        "Read the accepted plan and validated skeleton manifest.",
        "Implement one bounded method group and its planned checks at a time.",
        "Preserve signatures, interfaces, responsibilities and dependency direction.",
        "Only perform constructor wiring/test/integration edits listed in the plan.",
        "Do not add dependencies, classes, helpers or files outside the allowed manifest.",
        "If a contract is missing, set needsPlanRevision and explain the questions.",
        "Return current snapshot, changes and evidence; do not publish files.",
      ],
    };
  }
}

class FinalReviewAssignmentPolicy implements Policy<ReviewInput, TaskAssignment> {
  async apply(input: ReviewInput): Promise<TaskAssignment> {
    return {
      goal: "Review the implemented feature against its accepted contracts",
      input,
      instructions: [
        "Read the actual diff and current verification report references.",
        "Check acceptance criteria and identify evidence-backed defects.",
        "Reject unimplemented required behavior and unauthorized structure changes.",
        "Do not equate model claims or unavailable checks with passing evidence.",
        "Return findings and references; do not edit source or approve publication.",
      ],
    };
  }
}
```

## OopGuardFactory.ts

```typescript
class OopGuardFactory {
  constructor(
    private readonly syntax: SyntaxInspector,
    private readonly reviewer: ModelGateway,
  ) {}

  create(): GuardDefinition {
    return new GuardDefinition({
      id: "oop-programming",
      version: 1,
      skill: new SkillDefinition({
        title: "Object-oriented programming",
        instructions: [
          "Give each class one coherent responsibility.",
          "Use small interfaces and inject external collaborators.",
          "Prefer composition; keep class-owned helpers private.",
          "Use polymorphic implementations for interchangeable behavior.",
          "Protect mutable state and validate lifecycle changes.",
        ],
      }),
      applicabilityQuestion: "Does this task introduce or change OOP design?",
      rules: [
        { id: "oop.cohesion", blocking: true },
        { id: "oop.constructor-injection", blocking: true },
        { id: "oop.private-helpers", blocking: true },
        { id: "oop.polymorphism", blocking: true },
      ],
      checks: [
        new OopStructureCheck(this.syntax),
        new ModelAssistedOopReview({ model: this.reviewer }),
      ],
      // Required selection is set by GuardCoordinator, not by model relevance.
      // Each check reports passed/failed/not-applicable/unable-to-evaluate
      // and rule/source coverage. Unknown coverage cannot count as a pass.
    });
  }
}
```

## syntax-and-edit-policies.ts

```typescript
interface SyntaxInspector {
  // Language-aware AST adapter, not model-generated declarations or regex.
  inspectDeclarationEdit(
    candidate: WorkspaceEditCandidate,
    plan: OopPlan,
    signal: AbortSignal,
  ): Promise<readonly string[]>;

  compareProtectedStructure(
    candidate: WorkspaceEditCandidate,
    manifest: ArtifactRef,
    plan: OopPlan,
    signal: AbortSignal,
  ): Promise<readonly string[]>;

  emptyBodyViolations(
    snapshot: WorkspaceSnapshotRef,
    plan: OopPlan,
    signal: AbortSignal,
  ): Promise<readonly string[]>;

  planMismatchViolations(
    snapshot: WorkspaceSnapshotRef,
    plan: OopPlan,
    signal: AbortSignal,
  ): Promise<readonly string[]>;

  createManifest(
    snapshot: WorkspaceSnapshotRef,
    context: ExecutionContext,
  ): Promise<ArtifactRef>;
}

interface TrustedEditScope {
  readonly plan: OopPlan;
  readonly acceptedManifest?: ArtifactRef;
}

interface WorkspaceEditPolicyInput {
  readonly candidate: WorkspaceEditCandidate;
  readonly scope: TrustedEditScope;
  readonly context: ExecutionContext;
}

type WorkspaceEditDecision =
  | { readonly kind: "allowed" }
  | { readonly kind: "rejected"; readonly issues: readonly string[] };

class DeclarationsOnlyPolicy
  implements Policy<WorkspaceEditPolicyInput, WorkspaceEditDecision>
{
  constructor(private readonly syntax: SyntaxInspector) {}

  async apply(input: WorkspaceEditPolicyInput): Promise<WorkspaceEditDecision> {
    const { candidate, scope, context } = input;
    const issues = await this.syntax.inspectDeclarationEdit(
      candidate,
      scope.plan,
      context.signal,
    );
    if (issues.length > 0) return { kind: "rejected", issues };
    // Adapter rejects executable statements, initializer side effects,
    // unplanned declarations and removal of existing behavior.
    return { kind: "allowed" };
  }
}

class PreserveSkeletonPolicy
  implements Policy<WorkspaceEditPolicyInput, WorkspaceEditDecision>
{
  constructor(private readonly syntax: SyntaxInspector) {}

  async apply(input: WorkspaceEditPolicyInput): Promise<WorkspaceEditDecision> {
    const { candidate, scope, context } = input;
    if (!scope.acceptedManifest) {
      return { kind: "rejected", issues: ["No accepted skeleton manifest"] };
    }
    const issues = await this.syntax.compareProtectedStructure(
      candidate,
      scope.acceptedManifest,
      scope.plan,
      context.signal,
    );
    if (issues.length > 0) return { kind: "rejected", issues };
    // Adapter permits bodies and only explicitly planned wiring/tests.
    // Public signatures, dependencies, files and existing behavior stay protected.
    return { kind: "allowed" };
  }
}

// WorkspaceToolFactory.forEdits(policy) creates tools that stage candidates,
// await policy.apply({ candidate, scope, context }) with trusted scope,
// reject a rejected decision, then conditionally commit
// the allowed exact bytes against the expected workspace revision.
// The model cannot supply its own acceptedManifest or bypass the policy.
// Read-only stages receive no write tool. A stale candidate is rejected.
```

## skeleton-checks-and-gate.ts

```typescript
interface PlanReviewInput {
  readonly workspace: string;
  readonly plan: OopPlan;
  readonly guidance: GuardSelection;
}

interface SkeletonReviewInput {
  readonly plan: OopPlan;
  readonly skeleton: SkeletonResult;
  readonly guidance: GuardSelection;
}

interface SkeletonCheck {
  evaluate(
    input: SkeletonReviewInput,
    context: ExecutionContext,
  ): Promise<readonly string[]>;
}

class EmptyBodiesCheck implements SkeletonCheck {
  constructor(private readonly syntax: SyntaxInspector) {}

  evaluate(input: SkeletonReviewInput, context: ExecutionContext) {
    return this.syntax.emptyBodyViolations(
      input.skeleton.snapshot,
      input.plan,
      context.signal,
    );
  }
}

class ManifestMatchCheck implements SkeletonCheck {
  constructor(private readonly syntax: SyntaxInspector) {}

  evaluate(input: SkeletonReviewInput, context: ExecutionContext) {
    return this.syntax.planMismatchViolations(
      input.skeleton.snapshot,
      input.plan,
      context.signal,
    );
  }
}

class SkeletonReviewExecutor
  implements Executor<SkeletonReviewInput, SkeletonReview>
{
  constructor(
    private readonly checks: readonly SkeletonCheck[],
    private readonly guards: GuardCoordinator,
    private readonly syntax: SyntaxInspector,
  ) {}

  async execute(input: SkeletonReviewInput, context: ExecutionContext) {
    const issues: string[] = [];
    for (const check of this.checks) {
      issues.push(...await check.evaluate(input, context));
    }
    const guardReport = await this.guards.evaluate(
      { phase: "skeleton", ...input },
      context,
    );
    issues.push(...guardReport.issues);
    if (!guardReport.requiredCoverageComplete) {
      issues.push("Required OOP guard coverage is incomplete");
    }

    return {
      accepted: issues.length === 0 && guardReport.requiredCoverageComplete,
      snapshot: input.skeleton.snapshot,
      manifest: await this.createTrustedManifest(input, context),
      issues,
      evidence: guardReport.evidence,
    };
  }

  private async createTrustedManifest(
    input: SkeletonReviewInput,
    context: ExecutionContext,
  ): Promise<ArtifactRef> {
    // Inspect actual frozen source; do not trust a model-authored manifest.
    return this.syntax.createManifest(input.skeleton.snapshot, context);
  }
}

// The skeleton gate accepts only documented empty-body draft incompleteness.
// It does not require fully implemented return paths yet, and must not hide
// unrelated parse errors or treat placeholder throws/returns as empty bodies.
// Check failure/unavailability propagates; it cannot produce accepted=true.
```

## FinalAcceptanceExecutor.ts

```typescript
interface FinalGateInput {
  readonly plan: OopPlan;
  readonly implementation: ImplementationResult;
  readonly verification: VerificationResult;
  readonly review: AcceptanceResult;
  readonly guidance: GuardSelection;
}

class FinalAcceptanceExecutor
  implements Executor<FinalGateInput, AcceptanceResult>
{
  constructor(private readonly guards: GuardCoordinator) {}

  async execute(input: FinalGateInput, context: ExecutionContext) {
    const guardReport = await this.guards.evaluate(
      { phase: "implementation", ...input },
      context,
    );
    return {
      accepted:
        input.verification.passed &&
        input.review.accepted &&
        guardReport.requiredCoverageComplete &&
        guardReport.accepted,
      issues: [
        ...(input.verification.passed ? [] : [input.verification.summary]),
        ...input.review.issues,
        ...guardReport.issues,
        ...(guardReport.requiredCoverageComplete ? [] : ["Required coverage missing"]),
      ],
      evidence: [
        input.verification.report,
        ...input.review.evidence,
        ...guardReport.evidence,
      ],
    };
  }
}

// Project checks enforce final compilation, lint, behavior and no leftover
// required stubs. All evidence is tied to the same source snapshot.
// An earlier passing report cannot certify a later changed implementation.
```

## PlanSkeletonImplementWorkflow.ts

```typescript
// Proposed policy implementations; import Policy from the shared public API.
// Supporting step-specific context and result/input types are omitted.
class GuardsInputPolicy implements Policy<GuardsWorkflowContext, CodingRequest> {
  async apply(context: GuardsWorkflowContext): Promise<CodingRequest> {
    const { request } = context;
    return request;
  }
}

class PlanInputPolicy implements Policy<PlanWorkflowContext, PlanInput> {
  async apply(context: PlanWorkflowContext): Promise<PlanInput> {
    const { request, results, transition } = context;
    return {
      request,
      guidance: results.guards,
      feedback: transition.feedback,
    };
  }
}

class ReviewPlanInputPolicy implements Policy<ReviewPlanWorkflowContext, PlanReviewInput> {
  async apply(context: ReviewPlanWorkflowContext): Promise<PlanReviewInput> {
    const { request, results } = context;
    return {
      workspace: request.workspace,
      plan: results.plan,
      guidance: results.guards,
    };
  }
}

class SkeletonInputPolicy implements Policy<SkeletonWorkflowContext, SkeletonInput> {
  async apply(context: SkeletonWorkflowContext): Promise<SkeletonInput> {
    const { request, results, transition } = context;
    return {
      workspace: request.workspace,
      plan: results.plan,
      guidance: results.guards,
      feedback: transition.feedback,
    };
  }
}

class ReviewSkeletonInputPolicy implements Policy<ReviewSkeletonWorkflowContext, SkeletonReviewInput> {
  async apply(context: ReviewSkeletonWorkflowContext): Promise<SkeletonReviewInput> {
    const { results } = context;
    return {
      plan: results.plan,
      skeleton: results.skeleton,
      guidance: results.guards,
    };
  }
}

class ImplementationInputPolicy implements Policy<ImplementationWorkflowContext, ImplementationInput> {
  async apply(context: ImplementationWorkflowContext): Promise<ImplementationInput> {
    const { request, results, transition } = context;
    return {
      workspace: request.workspace,
      plan: results.plan,
      acceptedSkeleton: results.reviewSkeleton,
      guidance: results.guards,
      feedback: transition.feedback,
    };
  }
}

class VerificationInputPolicy implements Policy<VerificationWorkflowContext, VerificationInput> {
  async apply(context: VerificationWorkflowContext): Promise<VerificationInput> {
    const { request, results } = context;
    return {
      workspace: request.workspace,
      snapshot: results.implement.snapshot,
      changedFiles: results.implement.changedFiles,
    };
  }
}

class ReviewInputPolicy implements Policy<ReviewWorkflowContext, ReviewInput> {
  async apply(context: ReviewWorkflowContext): Promise<ReviewInput> {
    const { results } = context;
    return {
      plan: results.plan,
      implementation: results.implement,
      verification: results.verify,
    };
  }
}

class FinalGateInputPolicy implements Policy<FinalGateWorkflowContext, FinalGateInput> {
  async apply(context: FinalGateWorkflowContext): Promise<FinalGateInput> {
    const { results } = context;
    return {
      plan: results.plan,
      implementation: results.implement,
      verification: results.verify,
      review: results.review,
      guidance: results.guards,
    };
  }
}

class PublishInputPolicy implements Policy<PublishWorkflowContext, PublicationInput> {
  async apply(context: PublishWorkflowContext): Promise<PublicationInput> {
    const { request, results } = context;
    return {
      workspace: request.workspace,
      snapshot: results.implement.snapshot,
      acceptance: results.finalGate,
    };
  }
}

interface OopCodingSteps {
  readonly guards: Executor<CodingRequest, GuardSelection>;
  readonly plan: Executor<PlanInput, OopPlan>;
  readonly reviewPlan: Executor<PlanReviewInput, AcceptanceResult>;
  readonly skeleton: Executor<SkeletonInput, SkeletonResult>;
  readonly reviewSkeleton: Executor<SkeletonReviewInput, SkeletonReview>;
  readonly implement: Executor<ImplementationInput, ImplementationResult>;
  readonly verify: Executor<VerificationInput, VerificationResult>;
  readonly review: Executor<ReviewInput, AcceptanceResult>;
  readonly finalGate: Executor<FinalGateInput, AcceptanceResult>;
  readonly publish: Executor<PublicationInput, PublicationReceipt>;
}

class PlanSkeletonImplementWorkflow {
  constructor(private readonly steps: OopCodingSteps) {}

  define() {
    return WorkflowBuilder.forRequest<CodingRequest>("oop-coding-agent", {
      version: 1,
    })
      .step("guards", {
        executor: this.steps.guards,
        inputPolicy: new GuardsInputPolicy(),
      })
      .step("plan", {
        executor: this.steps.plan,
        inputPolicy: new PlanInputPolicy(),
      })
      .step("reviewPlan", {
        executor: this.steps.reviewPlan,
        inputPolicy: new ReviewPlanInputPolicy(),
      })
      .step("skeleton", {
        executor: this.steps.skeleton,
        inputPolicy: new SkeletonInputPolicy(),
      })
      .step("reviewSkeleton", {
        executor: this.steps.reviewSkeleton,
        inputPolicy: new ReviewSkeletonInputPolicy(),
      })
      .step("implement", {
        executor: this.steps.implement,
        inputPolicy: new ImplementationInputPolicy(),
      })
      .step("verify", {
        executor: this.steps.verify,
        inputPolicy: new VerificationInputPolicy(),
      })
      .step("review", {
        executor: this.steps.review,
        inputPolicy: new ReviewInputPolicy(),
      })
      .step("finalGate", {
        executor: this.steps.finalGate,
        inputPolicy: new FinalGateInputPolicy(),
      })
      .step("publish", {
        executor: this.steps.publish,
        inputPolicy: new PublishInputPolicy(),
      })
      .build({ transitions: new OopCodingTransitions().define() });
  }
}
```

## OopCodingTransitions.ts

```typescript
class OopCodingTransitions {
  define(): WorkflowTransitions {
    return new WorkflowTransitions([
      new NextStep("guards", "plan"),
      new NextStep("plan", "reviewPlan"),
      new AcceptanceTransition({
        from: "reviewPlan",
        accepted: "skeleton",
        rejected: "plan",
        revisionBudget: "plan-revisions",
        maxRevisions: 2,
      }),
      new NextStep("skeleton", "reviewSkeleton"),
      new AcceptanceTransition({
        from: "reviewSkeleton",
        accepted: "implement",
        rejected: "skeleton",
        revisionBudget: "skeleton-corrections",
        maxRevisions: 2,
      }),
      new PlanClarificationTransition({
        from: "implement",
        needsPlanRevision: "plan",
        otherwise: "verify",
        revisionBudget: "plan-revisions",
        maxRevisions: 2,
      }),
      new NextStep("verify", "review"),
      new NextStep("review", "finalGate"),
      new AcceptanceTransition({
        from: "finalGate",
        accepted: "publish",
        rejected: "implement",
        revisionBudget: "implementation-fixes",
        maxRevisions: 3,
      }),
      new RequirePublicationReceiptTransition("publish", "complete"),
    ]);
  }
}

// Framework transition policies build typed Correction envelopes from evidence.
// transition.feedback is persisted engine-supplied input for the target StepRun.
// New StepRuns retain prior history and consume the same run ledger.
// A plan revision invalidates affected downstream results; reconcile existing
// implementation before updating its skeleton, never erase completed bodies.
// Exhausted limits or unavailable required evidence stop explicitly.
// A publication conflict/rejection does not trigger an automatic overwrite.
```

## start-agent.ts

```typescript
const factory = new OopCodingAgentFactory({
  models: {
    planner: { identity: strongModelIdentity, gateway: strongModel },
    skeleton: { identity: skeletonModelIdentity, gateway: skeletonModel },
    coder: { identity: economicalModelIdentity, gateway: economicalModel },
  },
  decisionProvider: new JevDecisionProvider(jevClient),
  syntax: trustedTypeScriptInspector,
  tools: scopedWorkspaceToolFactory,
  contracts: registeredTaskContracts,
  projectChecks: realProjectChecks,
  userApprovals: authenticatedUserApprovalSource,
  limits: new ExecutionLimits({
    run: {
      maxModelCalls: 60,
      maxInputTokens: 120_000,
      maxOutputTokens: 24_000,
      maxElapsedMs: 20 * 60_000,
    },
    session: { maxIterations: 12, maxToolCalls: 20 },
    step: { maxAttempts: 3 },
  }),
  debug: persistedSummaryDebug,
});

const agent = await factory.create();

try {
  const run = await agent.start({
    scope: { agentId: "oop-developer", projectId: "shop" },
    source: "/projects/shop",
    goal: "Add task reminders using the project's existing conventions",
  });

  await agent.waitForAttention(run.id);
  // Attention means a persisted terminal or resumable waiting outcome.
  // run may be waiting_for_approval; that is not publication success.
  // Trusted UI/CLI supplies approval for the exact proposal/target.
  // Real checks/guards and a confirmed receipt gate final completion.
} finally {
  // Close only when this worker is deliberately shutting down;
  // drain/checkpoint according to policy, preserve waiting proposals.
  await agent.close();
}

// Supplied by the host, not created by variable names:
// - real model clients and credentials; no secrets in snapshots
// - runtime result validators matching contracts.ts
// - AST/scope tools enforcing edit policies at the actual write boundary
// - real project checks (offline tests may inject fakes)
// - authenticated approval, durable debug/usage and lifecycle adapters
// Optional memory proposals do not replace authoritative run/checkpoint state.
// Artifact refs support bounded/paged reads; guards/logs store safe summaries.
```

[Examples](README.md) · [Framework setup](../26-framework-configuration-and-startup.md) · [Guards](../20-guards-skills-rules-and-system-one-selection.md)

## Shared Policy Convention in This Blueprint

All configurable selection and transformation classes implement Policy<TInput, TOutput> and apply(). The workflow uses inputPolicy objects; model-based executors receive assignmentPolicy objects and result contracts; the unit runner receives context/completion policies. Workspace edit policies return allowed/rejected decisions before tools commit exact staged content. OopCodingTransitions defines the allowed graph; the engine's injected transition policy uses the same shared contract to select a permitted path from actual evidence.

Policy is imported once from the public framework API. There is no separate AgentTask, WorkspaceEditPolicy, mapper, or selection-strategy interface. Runtime validators, factories, tools, stores, and executors retain their own capabilities. See [One Shared Policy Concept](../31-shared-policy-concept.md).
