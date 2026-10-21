export type WorkflowCompletionDecision=Readonly<{accepted:true}>|Readonly<{accepted:false;code:string;message:string}>;
