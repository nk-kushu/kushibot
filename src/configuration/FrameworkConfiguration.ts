export type FrameworkConfiguration = Readonly<{
  logEnabled: boolean;
  logLevel: "debug" | "info" | "warn" | "error";
  maxIterations: number;
  maxSubAgents: number;
  maxSubAgentDepth: number;
}>;
