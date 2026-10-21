import type { PublicationReceipt } from "./PublicationReceipt.js";
export type PublicationEffectOutcome=Readonly<{status:"published";receipt:PublicationReceipt}>|Readonly<{status:"not-applied";code:"TARGET_CHANGED"|"APPROVAL_INVALID"|"CONTROL_STOP"|"EVIDENCE_CHANGED"}>|Readonly<{status:"unknown"}>;
