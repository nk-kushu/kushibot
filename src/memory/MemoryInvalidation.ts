export type MemoryInvalidation=Readonly<{commandId:string;code:"SOURCE_RETIRED"|"SUPERSEDED"|"USER_REVOKED";atEpochMs:number}>;
