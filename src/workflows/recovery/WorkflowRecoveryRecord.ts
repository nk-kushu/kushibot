export type WorkflowRecoveryRecord=Readonly<{commandId:string;receiptRef:string;proofRef:string;action:"resumed"|"stopped";revision:number}>;
