import type {
  MentorBackgroundCheckStatus,
  MentorProfileStatus,
  MentorshipStatus,
  UserRole,
} from "@prisma/client";

export type MentorEngineState =
  | "PENDING_REGISTRATION"
  | "PENDING_BACKGROUND_CHECK"
  | "PENDING_TRAINING"
  | "PENDING_ADMIN_REVIEW"
  | "MATCHABLE"
  | "ASSIGNED"
  | "ACTIVE"
  | "PAUSED"
  | "INACTIVE";

export type MentorEligibilityReason =
  | "USER_INACTIVE"
  | "PROFILE_NOT_APPROVED"
  | "BACKGROUND_NOT_CLEARED"
  | "TRAINING_INCOMPLETE"
  | "SAFEGUARDING_NOT_AGREED"
  | "CAPACITY_REACHED";

export type MentorMentorshipCounts = Record<MentorshipStatus, number>;

export type MentorSnapshot = {
  userId: string;
  profileId: string;
  fullName: string;
  role: UserRole;
  userIsActive: boolean;
  schoolId: string | null;
  partnerId: string | null;
  profileStatus: MentorProfileStatus;
  backgroundCheckStatus: MentorBackgroundCheckStatus;
  trainingCompleted: boolean;
  safeguardingAgreed: boolean;
  maxMentees: number;
  currentMentees: number;
  mentorshipCounts: MentorMentorshipCounts;
  derivedState: MentorEngineState;
};

export type MentorEligibility = {
  canBeApproved: boolean;
  canBeMatched: boolean;
  blockers: MentorEligibilityReason[];
  checks: {
    userActive: boolean;
    profileApproved: boolean;
    backgroundCleared: boolean;
    trainingCompleted: boolean;
    safeguardingAgreed: boolean;
    hasCapacity: boolean;
  };
};

export type MentorEngineAction =
  | "BACKGROUND_CLEAR"
  | "BACKGROUND_FAIL"
  | "COMPLETE_TRAINING"
  | "AGREE_SAFEGUARDING"
  | "SUBMIT_FOR_REVIEW"
  | "APPROVE"
  | "REJECT"
  | "DEACTIVATE"
  | "REACTIVATE";

export type MentorTransitionDetails = {
  effectiveAt?: string;
  expiryDate?: string;
  evidenceUrl?: string;
  agreementVersion?: string;
  trainingName?: string;
};
