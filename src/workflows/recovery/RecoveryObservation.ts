export type RecoveryObservation<T>=Readonly<{status:"known";value:T;evidenceRefs:readonly string[]}>|Readonly<{status:"unknown"}>;
