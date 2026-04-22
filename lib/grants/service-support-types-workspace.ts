import {
  GrantApplicationStage,
  GrantApprovalStatus,
  GrantOpportunityStatus,
  GrantSourceType,
  GrantTaskReviewStatus,
  GrantTaskStatus,
  UserRole,
} from "@prisma/client";

export type GrantWorkspaceOpportunity = {
  id: string;
  title: string;
  funderName: string;
  description: string | null;
  status: GrantOpportunityStatus;
  sourceType: GrantSourceType | null;
  sourceReference: string | null;
  sourceUrl: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  deadline: string;
  currencyCode: string;
  amountMinor: string;
  fitScore: number | null;
  fitMatrix: {
    timelineScore: number;
    amountScore: number;
    areaScore: number;
    eligibilityScore: number;
    readinessScore: number;
    weightedScore: number;
    notes: string | null;
  } | null;
  scoredAt: string | null;
  country: string | null;
  schoolName: string;
  partnerName: string;
  applicationsCount: number;
  createdAt: string;
};

export type GrantWorkspaceApplication = {
  id: string;
  title: string;
  stage: GrantApplicationStage;
  currencyCode: string;
  amountRequestedMinor: string;
  submittedAt: string | null;
  opportunity: {
    id: string;
    title: string;
    funderName: string;
    deadline: string;
  };
  progress: {
    tasksTotal: number;
    tasksDone: number;
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    section: string | null;
    status: GrantTaskStatus;
    reviewStatus: GrantTaskReviewStatus | null;
    reviewedAt: string | null;
    reviewedById: string | null;
    reviewedByName: string | null;
    reviewNotes: string | null;
    evidenceUrl: string | null;
    evidenceName: string | null;
    evidenceMime: string | null;
    evidenceSize: number | null;
    dueDate: string | null;
    assigneeId: string | null;
    assigneeName: string | null;
  }>;
  approvals: {
    pursue: GrantApprovalStatus | "MISSING";
    budget: GrantApprovalStatus | "MISSING";
    finalSubmission: GrantApprovalStatus | "MISSING";
    pendingCount: number;
  };
  submission: {
    submitted: boolean;
    confirmationReference: string | null;
    proofUrl: string | null;
  };
  updatedAt: string;
};

export type GrantWorkspaceView = {
  opportunities: GrantWorkspaceOpportunity[];
  applications: GrantWorkspaceApplication[];
};

export type GrantTaskAssignee = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
};

export type GrantOpportunityLot = {
  id: string;
  description: string;
  quantity: number;
  minBudgetMinor: string;
  maxBudgetMinor: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GrantOpportunityDetail = {
  opportunity: GrantWorkspaceOpportunity;
  lots: GrantOpportunityLot[];
};
