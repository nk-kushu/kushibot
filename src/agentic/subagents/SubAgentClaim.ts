import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
export type SubAgentClaim = Readonly<{ commandId: string; requestKey: string; candidate: AdmittedSubAgent }>;
