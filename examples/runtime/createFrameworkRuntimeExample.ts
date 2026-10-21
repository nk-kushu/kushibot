import type { RuntimeOptions, IRuntimeResourceBinding, IRuntimeInitializer, IRuntimeReadinessCheck, IRuntimeFinalizer, IRuntimeQuiescenceBarrier, IRuntimeRecoveryWriter, IClock } from "../../src/index.js";
import { RuntimeConfiguration, RuntimeResourcePlan, RuntimeAdmissionGate, RuntimeExecutionRegistry, RuntimeStartupCoordinator, RuntimeShutdownCoordinator, FrameworkRuntime } from "../../src/index.js";
export function createFrameworkRuntimeExample(options:RuntimeOptions,bindings:readonly IRuntimeResourceBinding[],initializers:readonly IRuntimeInitializer[],checks:readonly IRuntimeReadinessCheck[],finalizers:readonly IRuntimeFinalizer[],barrier:IRuntimeQuiescenceBarrier,writer:IRuntimeRecoveryWriter,clock:IClock):FrameworkRuntime{
 const config=new RuntimeConfiguration(options),resources=new RuntimeResourcePlan(bindings),admission=new RuntimeAdmissionGate(),executions=new RuntimeExecutionRegistry(config,clock);
 return new FrameworkRuntime(new RuntimeStartupCoordinator(config,resources,initializers,checks,clock,admission),new RuntimeShutdownCoordinator(config,executions,resources,barrier,writer,finalizers,clock,admission),admission,executions);
}
