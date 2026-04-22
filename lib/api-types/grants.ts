export type GrantOpportunityRow = {
  id: string;
  title: string;
  funderName: string;
  description: string | null;
  status: "DISCOVERED" | "QUALIFYING" | "PURSUING" | "ARCHIVED";
  sourceType: "TEAM" | "BOARD" | "WEBSITE" | "LINKEDIN" | "EMAIL" | "REFERRAL" | "OTHER" | null;
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

export type GrantApplicationRow = {
  id: string;
  title: string;
  stage: "DISCOVERY" | "APPROVAL" | "WRITING" | "SUBMISSION" | "SUBMITTED" | "CLOSED";
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
    status: "TODO" | "IN_PROGRESS" | "DONE";
    reviewStatus: "PENDING" | "APPROVED" | "REWORK_REQUIRED" | null;
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
    pursue: "PENDING" | "APPROVED" | "REJECTED" | "MISSING";
    budget: "PENDING" | "APPROVED" | "REJECTED" | "MISSING";
    finalSubmission: "PENDING" | "APPROVED" | "REJECTED" | "MISSING";
    pendingCount: number;
  };
  submission: {
    submitted: boolean;
    confirmationReference: string | null;
    proofUrl: string | null;
  };
  updatedAt: string;
};

export type GrantWorkspaceResponse = {
  opportunities: GrantOpportunityRow[];
  applications: GrantApplicationRow[];
};

export type GrantTaskAssigneeRow = {
  id: string;
  fullName: string;
  email: string;
  role: "MENTOR" | "MENTEE" | "SCHOOL_ADMIN" | "PLATFORM_ADMIN" | "GUARDIAN" | "PARTNER_ADMIN";
};

export type GrantTaskAssigneesResponse = {
  items: GrantTaskAssigneeRow[];
};

export type TenantUserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "PLATFORM_ADMIN" | "PARTNER_ADMIN" | "SCHOOL_ADMIN";
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

export type TenantUsersResponse = {
  items: TenantUserRow[];
};

export type GrantOpportunityLotRow = {
  id: string;
  description: string;
  quantity: number;
  minBudgetMinor: string;
  maxBudgetMinor: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GrantOpportunityDetailResponse = {
  opportunity: GrantOpportunityRow;
  lots: GrantOpportunityLotRow[];
};

export type GrantFunderType = "FOUNDATION" | "GOVERNMENT" | "CORPORATE" | "NGO" | "MULTILATERAL" | "OTHER";

export type GrantFunderContactRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  isPrimary: boolean;
};

export type GrantFunderRow = {
  id: string;
  name: string;
  type: GrantFunderType;
  website: string | null;
  country: string | null;
  hqCity: string | null;
  focusAreas: string[];
  typicalMinAmountMinor: string | null;
  typicalMaxAmountMinor: string | null;
  currencyCode: string | null;
  applicationUrl: string | null;
  isActive: boolean;
  opportunitiesCount: number;
  contacts: GrantFunderContactRow[];
  createdAt: string;
  updatedAt: string;
};

export type GrantSourceSettingRow = {
  id: string;
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type GrantCurrencySettingRow = {
  id: string;
  code: string;
  label: string;
  symbol: string | null;
  minorUnit: number;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
};

export type GrantScoringProfileRow = {
  id: string;
  name: string;
  timelineWeight: number;
  amountWeight: number;
  areaWeight: number;
  eligibilityWeight: number;
  readinessWeight: number;
  updatedAt: string;
};

export type GrantSettingsWorkspaceResponse = {
  canEdit: boolean;
  funders: GrantFunderRow[];
  sourceSettings: GrantSourceSettingRow[];
  currencySettings: GrantCurrencySettingRow[];
  scoringProfile: GrantScoringProfileRow | null;
};
