import type { KnowledgeSourceRef } from "./KnowledgeSourceRef.js";
export type KnowledgeSourceObservation=
 |Readonly<{status:"current";source:KnowledgeSourceRef;text:string;verificationRef:string;validUntilEpochMs:number}>
 |Readonly<{status:"unavailable"}>
 |Readonly<{status:"changed"}>;
