import type { RegistrationRef } from "../contracts/RegistrationRef.js";
import type { ReviewFinding } from "./ReviewFinding.js";
export type ReviewReport=Readonly<{proposalDigest:string;sourceSnapshotRef:string;policy:RegistrationRef;verdict:"pass"|"changes-requested"|"inconclusive";findings:readonly ReviewFinding[]}>;
