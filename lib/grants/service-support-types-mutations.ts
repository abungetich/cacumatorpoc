import {
  GrantApprovalStatus,
  GrantApprovalType,
  GrantOpportunityStatus,
  GrantSourceType,
  GrantTaskStatus,
} from "@prisma/client";
import type { ActorContext } from "@/lib/actor-context";
import type { RequestMetadata } from "@/lib/grants/service-support-types-shared";

export type CreateGrantOpportunityInput = {
  actor: ActorContext;
  title: string;
  funderName: string;
  description?: string;
  sourceType?: GrantSourceType;
  sourceReference?: string;
  sourceUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentMime?: string;
  attachmentSize?: number;
  deadline: string;
  status?: GrantOpportunityStatus;
  fitScore?: number;
  country?: string;
  currencyCode: string;
  amountMinor: string;
  schoolId?: string;
  partnerId?: string;
  requestMeta: RequestMetadata;
};

export type CreateGrantApplicationInput = {
  actor: ActorContext;
  opportunityId: string;
  title?: string;
  currencyCode?: string;
  amountRequestedMinor: string;
  requestMeta: RequestMetadata;
};

export type ScoreGrantOpportunityInput = {
  actor: ActorContext;
  opportunityId: string;
  timelineScore: number;
  amountScore: number;
  areaScore: number;
  eligibilityScore: number;
  readinessScore: number;
  notes?: string;
  requestMeta: RequestMetadata;
};

export type CreateGrantTaskInput = {
  actor: ActorContext;
  applicationId: string;
  title: string;
  description?: string;
  section?: string;
  assigneeId: string;
  dueDate?: string;
  requestMeta: RequestMetadata;
};

export type UpdateGrantTaskInput = {
  actor: ActorContext;
  taskId: string;
  status: GrantTaskStatus;
  completionNotes?: string;
  requestMeta: RequestMetadata;
};

export type UpdateGrantTaskDetailsInput = {
  actor: ActorContext;
  taskId: string;
  title: string;
  description?: string;
  section?: string;
  assigneeId: string;
  dueDate?: string;
  requestMeta: RequestMetadata;
};

export type DeleteGrantTaskInput = {
  actor: ActorContext;
  taskId: string;
  requestMeta: RequestMetadata;
};

export type UploadGrantTaskEvidenceInput = {
  actor: ActorContext;
  taskId: string;
  evidenceUrl: string;
  evidenceName: string;
  evidenceMime?: string;
  evidenceSize?: number;
  requestMeta: RequestMetadata;
};

export type GrantTaskReviewDecision = "APPROVE" | "REWORK";

export type ReviewGrantTaskInput = {
  actor: ActorContext;
  taskId: string;
  decision: GrantTaskReviewDecision;
  notes?: string;
  requestMeta: RequestMetadata;
};

export type UpsertGrantApprovalInput = {
  actor: ActorContext;
  applicationId: string;
  approvalType: GrantApprovalType;
  status: GrantApprovalStatus;
  notes?: string;
  requestMeta: RequestMetadata;
};

export type SubmitGrantApplicationInput = {
  actor: ActorContext;
  applicationId: string;
  confirmationReference?: string;
  proofUrl?: string;
  packageVersion?: string;
  notes?: string;
  requestMeta: RequestMetadata;
};

export type CreateGrantOpportunityLotInput = {
  actor: ActorContext;
  opportunityId: string;
  description: string;
  quantity: number;
  minBudgetMinor: string;
  maxBudgetMinor: string;
  requestMeta: RequestMetadata;
};

export type UpdateGrantOpportunityLotInput = {
  actor: ActorContext;
  opportunityId: string;
  lotId: string;
  description: string;
  quantity: number;
  minBudgetMinor: string;
  maxBudgetMinor: string;
  requestMeta: RequestMetadata;
};

export type DeleteGrantOpportunityLotInput = {
  actor: ActorContext;
  opportunityId: string;
  lotId: string;
  requestMeta: RequestMetadata;
};
