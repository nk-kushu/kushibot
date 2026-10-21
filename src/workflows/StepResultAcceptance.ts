export type StepResultAcceptance = Readonly<{status:"accepted"}> | Readonly<{status:"rejected";code:string;message:string}> | Readonly<{status:"not-evaluated";code:string;message:string}>;
