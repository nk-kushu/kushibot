import type { ChangeProposalBody } from "./ChangeProposalBody.js";
export type ChangeProposal=ChangeProposalBody&Readonly<{digest:string}>;
