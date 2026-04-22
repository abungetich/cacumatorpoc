export type MatchCandidateItem = {
  mentorUserId: string;
  name: string;
  school: string;
  score: number;
  baseScore: number;
  fitLabel: string;
  scoreBreakdown: {
    interests: number;
    format: number;
    availability: number;
    capacity: number;
    context: number;
  };
  matchReasons: string[];
  riskFlags: string[];
  priorDeclineCount: number;
  priorDeclineReasons: string[];
  derivedState: string;
  blockers: string[];
  capacity: {
    current: number;
    max: number;
  };
};

export type MatchCandidatesResponse = {
  mentee: {
    userId: string;
    name: string;
    schoolId: string | null;
    schoolName: string;
    preferredFormat: "ONLINE" | "IN_PERSON" | "HYBRID";
    interests: string[];
  };
  items: MatchCandidateItem[];
};

export type MatchProposalResponse = {
  mentorshipId: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "TERMINATED";
  mentorAccepted: boolean;
  menteeAccepted: boolean;
};

export type MatchDeclineCategory = "AVAILABILITY" | "FORMAT" | "FIT" | "CONTEXT" | "OTHER";

export type MatchingIntakeStage = "CONSENT_REQUIRED" | "AWAITING_MATCHING" | "MATCHED" | "ACTIVE" | "INACTIVE";

export type MatchingProgramOption = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  programStatus: string;
  stateLabel: string;
  proposalEnabled: boolean;
};

export type MatchingIntakeItem = {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  schoolId: string;
  schoolName: string;
  educationLevel: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
  preferredFormat: "ONLINE" | "IN_PERSON" | "HYBRID";
  interests: string[];
  status: "ACTIVE" | "WAITING" | "MATCHED" | "INACTIVE";
  requiresConsent: boolean;
  hasConsent: boolean;
  openMentorships: number;
  maxOpenMentorships: number;
  intakeStage: MatchingIntakeStage;
  eligibleForProposal: boolean;
  proposalBlockers: string[];
  programOptions: MatchingProgramOption[];
  createdAt: string;
};

export type MatchingIntakeResponse = {
  items: MatchingIntakeItem[];
};

export type MatchingOverviewResponse = {
  summary: {
    awaiting: number;
    blockedByConsent: number;
    pending: number;
    active: number;
    readyForProposal: number;
    blockedByNoEligiblePrograms: number;
    blockedByProgramState: number;
    blockedByCapacity: number;
    runnablePrograms: number;
    nonRunnablePrograms: number;
    matchableMentors: number;
    approvedMentorsForRunnablePrograms: number;
    mentorSupplyGap: number;
  };
  insights: {
    severityCounts: {
      high: number;
      medium: number;
      low: number;
    };
    bottlenecks: Array<{
      key: "consent" | "programs" | "capacity" | "mentor_supply";
      label: string;
      value: number;
      tone: "rose" | "amber" | "sky" | "emerald";
      detail: string;
    }>;
    recommendations: string[];
  };
};

export type MatchProposalQueueItem = {
  mentorshipId: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "TERMINATED";
  createdAt: string;
  startedAt: string | null;
  scheduledEndDate: string;
  checkInFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  terminationReason: string | null;
  terminationNotes: string | null;
  program: {
    id: string;
    name: string;
    schoolId: string;
    schoolName: string;
  };
  mentor: {
    userId: string;
    name: string;
    email: string;
    accepted: boolean;
    respondedAt: string | null;
  };
  mentee: {
    userId: string;
    name: string;
    email: string;
    accepted: boolean;
    respondedAt: string | null;
  };
  declinedByUserId: string | null;
  declineCategory: MatchDeclineCategory | null;
  declineReason: string | null;
};

export type MatchProposalsResponse = {
  items: MatchProposalQueueItem[];
};

export type MatchingSettingsItem = {
  id: string;
  interestsWeight: number;
  contextWeight: number;
  availabilityWeight: number;
  formatWeight: number;
  capacityWeight: number;
  penalizeNearCapacity: boolean;
  nearCapacityPenalty: number;
  penalizeLowAvailability: boolean;
  lowAvailabilityPenalty: number;
  penalizeWeakContext: boolean;
  weakContextPenalty: number;
  penalizePriorDecline: boolean;
  priorDeclinePenalty: number;
  excludePriorDeclinedPair: boolean;
  maxOpenMentorshipsPerMentee: number;
  availabilityDeclinePenalty: number;
  formatDeclinePenalty: number;
  fitDeclinePenalty: number;
  contextDeclinePenalty: number;
  otherDeclinePenalty: number;
};

export type MatchingSettingsResponse = {
  item: MatchingSettingsItem;
};
