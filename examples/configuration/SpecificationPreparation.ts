import type { SpecificationAssignment } from "../shared-policy/SpecificationAssignment.js";

export type SpecificationPreparation = Readonly<{
  operationId: string;
  startedAtEpochMs: number;
  assignment: SpecificationAssignment;
}>;
