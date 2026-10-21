import type { AdmittedSubAgent } from "./AdmittedSubAgent.js";
import type { SubAgentOutcome } from "./SubAgentOutcome.js";
export type SubAgentClaimOutcome = Readonly<{ status: "admitted"; child: AdmittedSubAgent }> | Readonly<{ status: "existing"; response: SubAgentOutcome }> | Readonly<{ status: "rejected"; code: string }>;
