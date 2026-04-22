export type { ServiceResult, RequestMetadata, GrantScope, GrantMutationResult } from "@/lib/grants/service-support-types-shared";

export type {
  GrantWorkspaceOpportunity,
  GrantWorkspaceApplication,
  GrantWorkspaceView,
  GrantTaskAssignee,
  GrantOpportunityLot,
  GrantOpportunityDetail,
} from "@/lib/grants/service-support-types-workspace";

export type {
  CreateGrantOpportunityInput,
  CreateGrantApplicationInput,
  ScoreGrantOpportunityInput,
  CreateGrantTaskInput,
  UpdateGrantTaskInput,
  UpdateGrantTaskDetailsInput,
  DeleteGrantTaskInput,
  UploadGrantTaskEvidenceInput,
  GrantTaskReviewDecision,
  ReviewGrantTaskInput,
  UpsertGrantApprovalInput,
  SubmitGrantApplicationInput,
  CreateGrantOpportunityLotInput,
  UpdateGrantOpportunityLotInput,
  DeleteGrantOpportunityLotInput,
} from "@/lib/grants/service-support-types-mutations";
