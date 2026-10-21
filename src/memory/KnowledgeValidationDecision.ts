export type KnowledgeValidationDecision=
 |Readonly<{status:"accepted";verificationRef:string;validatedAtEpochMs:number;validUntilEpochMs:number}>
 |Readonly<{status:"rejected";code:"SOURCE_UNAVAILABLE"|"SOURCE_CHANGED"|"STATEMENT_UNSUPPORTED"|"EXPIRED";checkedAtEpochMs:number}>;
