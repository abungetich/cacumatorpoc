import type { MentorOnboardingStage } from '@/lib/api-types/schools-programs';

export type MentorIntakeState =
  | "PENDING_BACKGROUND_CHECK"
  | "PENDING_TRAINING"
  | "PENDING_ADMIN_REVIEW"
  | "MATCHABLE"
  | "ASSIGNED"
  | "ACTIVE"
  | "PAUSED"
  | "INACTIVE";

export type MentorIntakeRow = {
  userId: string;
  profileId: string;
  fullName: string;
  email: string;
  schoolName: string;
  partnerName: string;
  profileStatus: "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE";
  backgroundCheckStatus: "PENDING" | "CLEARED" | "FAILED" | "EXPIRED";
  trainingCompleted: boolean;
  safeguardingAgreed: boolean;
  currentMentees: number;
  maxMentees: number;
  derivedState: MentorIntakeState;
  canBeMatched: boolean;
  blockers: string[];
  createdAt: string;
  declinedConsentCount: number;
  latestDeclinedConsentAt: string | null;
  latestDeclinedConsentTitle: string | null;
  latestDeclinedConsentReason: string | null;
};

export type MentorTransitionDetailPayload = {
  effectiveAt?: string;
  expiryDate?: string;
  evidenceUrl?: string;
  agreementVersion?: string;
  trainingName?: string;
};

export type MentorAuditItem = {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  comment: string | null;
  details: Record<string, unknown> | null;
};

export type MentorVerificationDiagnostics = {
  email: string;
  emailVerifiedAt: string | null;
  userIsActive: boolean;
  pendingTokenCount: number;
  latestTokenCreatedAt: string | null;
  latestTokenExpiresAt: string | null;
  latestTokenVerifiedAt: string | null;
  reminderPolicy: {
    autoReminderEnabled: boolean;
    resendIntervalHours: number;
    maxReminders: number;
  };
  delivery: {
    activeChannel: "ZEPTO" | "SMTP" | "NONE";
    zeptoConfigured: boolean;
    smtpConfigured: boolean;
    fromAddress: string | null;
    fromName: string | null;
  };
  attempts: Array<{
    id: string;
    timestamp: string;
    actor: string;
    context: "REGISTRATION" | "PUBLIC_RESEND" | "ADMIN_RESEND" | "UNKNOWN";
    status: "SENT" | "FAILED";
    channel: "ZEPTO" | "SMTP" | "NONE";
    responseCode: number | null;
    providerMessage: string | null;
    providerPayload: string | null;
    reason: string | null;
  }>;
};

export type MentorTrainingQuestionRow = {
  id: string;
  prompt: string;
  explanation: string | null;
  questionType: "SINGLE_CHOICE" | "MULTI_CHOICE";
  options: string[];
  correctAnswers: string[];
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type MentorTrainingModuleSettingRow = {
  id: string;
  title: string;
  description: string;
  moduleBody: string;
  version: string;
  required: boolean;
  passingScore: number;
  maxAttempts: number | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  isActive: boolean;
  questionCount: number;
  questions: MentorTrainingQuestionRow[];
  completionsCount: number;
  participantsCount: number;
  attemptsCount: number;
  lastCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MentorConsentSettingRow = {
  id: string;
  title: string;
  consentType: "DATA_PROCESSING" | "PHOTO_RELEASE" | "MENTORSHIP_AGREEMENT" | "SAFEGUARDING";
  version: string;
  summary: string;
  documentBody: string;
  documentUrl: string;
  required: boolean;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MentorDetailResponse = {
  item: {
    snapshot: {
      userId: string;
      profileId: string;
      fullName: string;
      userIsActive: boolean;
      schoolId: string | null;
      partnerId: string | null;
      profileStatus: "PENDING" | "APPROVED" | "REJECTED" | "INACTIVE";
      backgroundCheckStatus: "PENDING" | "CLEARED" | "FAILED" | "EXPIRED";
      trainingCompleted: boolean;
      safeguardingAgreed: boolean;
      maxMentees: number;
      currentMentees: number;
      mentorshipCounts: Record<string, number>;
      derivedState: MentorIntakeState;
    };
    eligibility: {
      canBeApproved: boolean;
      canBeMatched: boolean;
      blockers: string[];
      checks: {
        userActive: boolean;
        profileApproved: boolean;
        backgroundCleared: boolean;
        trainingCompleted: boolean;
        safeguardingAgreed: boolean;
        hasCapacity: boolean;
      };
    };
    user: {
      email: string;
      phone: string;
      dateOfBirth: string | null;
      createdAt: string;
      emailVerifiedAt: string | null;
      lastLoginAt: string | null;
      profilePhoto: string | null;
      schoolName: string | null;
      partnerName: string | null;
    };
    profile: {
      profession: string;
      employer: string;
      jobTitle: string;
      industry: string;
      yearsExperience: number;
      expertiseAreas: string[];
      mentoringFormats: string[];
      availabilitySummary: string[];
      hoursPerMonth: number;
      motivation: string;
      backgroundCheckDocument: string | null;
      backgroundCheckDate: string | null;
      backgroundCheckExpiry: string | null;
      trainingCompletedDate: string | null;
      safeguardingAgreedDate: string | null;
      approvedAt: string | null;
      rejectionReason: string | null;
    };
    onboarding: {
      currentStage: string | null;
      profileCompletionPercentage: number | null;
      emailVerifiedAt: string | null;
      profileCompletedAt: string | null;
      interestsCompletedAt: string | null;
      trainingCompletedAt: string | null;
      consentSignedAt: string | null;
      backgroundScreeningStatus: string | null;
      approvedAt: string | null;
      rejectedAt: string | null;
      rejectionReason: string | null;
      declinedConsents: Array<{
        id: string;
        title: string;
        consentType: "DATA_PROCESSING" | "PHOTO_RELEASE" | "MENTORSHIP_AGREEMENT" | "SAFEGUARDING" | null;
        version: string | null;
        declinedAt: string;
        reason: string | null;
      }>;
    };
    verification: MentorVerificationDiagnostics;
    audit: MentorAuditItem[];
  };
};

export type VerificationSettingsResponse = {
  item: {
    id: string;
    autoReminderEnabled: boolean;
    resendIntervalHours: number;
    maxReminders: number;
    delivery: {
      activeChannel: "ZEPTO" | "SMTP" | "NONE";
      zeptoConfigured: boolean;
      smtpConfigured: boolean;
      fromAddress: string | null;
      fromName: string | null;
    };
  };
};

export type MentorTrainingSettingsResponse = {
  items: MentorTrainingModuleSettingRow[];
};

export type MentorTrainingModuleDetailResponse = {
  item: MentorTrainingModuleSettingRow & {
    filters: {
      applied: {
        organizationId: string | null;
        schoolId: string | null;
        dateFrom: string | null;
        dateTo: string | null;
      };
      organizations: Array<{
        id: string;
        name: string;
        count: number;
      }>;
      schools: Array<{
        id: string;
        name: string;
        count: number;
      }>;
    };
    analytics: {
      completionRate: number;
      passRate: number | null;
      firstAttemptPassRate: number | null;
      averageScore: number | null;
      medianAttemptsToPass: number | null;
      maxAttemptExhaustedCount: number;
      totalAttempts: number;
      averageEstimatedMinutes: number | null;
      recentAttempts: Array<{
        label: string;
        count: number;
      }>;
      recentCompletions: Array<{
        label: string;
        count: number;
      }>;
    };
    questions: MentorTrainingQuestionRow[];
    questionAnalytics: Array<{
      questionId: string;
      prompt: string;
      questionType: "SINGLE_CHOICE" | "MULTI_CHOICE";
      correctAnswers: string[];
      responseCount: number;
      correctCount: number;
      correctRate: number | null;
      skippedCount: number;
      topWrongAnswer: string | null;
      difficultyLabel: "Easy" | "Balanced" | "Hard" | "Not enough data";
      optionBreakdown: Array<{
        option: string;
        count: number;
      }>;
    }>;
    attempts: Array<{
      id: string;
      userId: string;
      name: string;
      email: string;
      score: number;
      passed: boolean;
      submittedAt: string;
      acknowledgedName: string;
    }>;
    participation: Array<{
      userId: string;
      name: string;
      email: string;
      completedAt: string;
      acknowledgedName: string;
      notes: string | null;
    }>;
    activityNote: string;
  };
};

export type MentorConsentSettingsResponse = {
  items: MentorConsentSettingRow[];
  notifications: {
    notifyPlatformAdminsOnDecline: boolean;
  };
};

export type MentorOnboardingWorkspaceResponse = {
  item: {
    currentStage: MentorOnboardingStage | null;
    profileCompletionPercentage: number;
    completedCount: number;
    totalCount: number;
    progressPercentage: number;
    checklist: Array<{
      id: "email" | "profile" | "training" | "consents" | "safeguarding" | "background";
      label: string;
      description: string;
      complete: boolean;
    }>;
    focus: Array<{
      id: string;
      title: string;
      description: string;
    }>;
    trainingModules: Array<
      MentorTrainingModuleSettingRow & {
        completionRecordId: string | null;
        questions: MentorTrainingQuestionRow[];
        completed: boolean;
        completedAt: string | null;
        latestAttempt: {
          score: number;
          passed: boolean;
          submittedAt: string;
        } | null;
      }
    >;
    consentItems: Array<
      MentorConsentSettingRow & {
        consentRecordId: string | null;
        completed: boolean;
        agreedAt: string | null;
        declinedAt: string | null;
        declineReason: string | null;
        evidenceUrl: string | null;
      }
    >;
    backgroundCheck: {
      status: "PENDING" | "CLEARED" | "FAILED" | "EXPIRED";
      documentUrl: string | null;
      checkedOn: string | null;
      expiresAt: string | null;
      submitted: boolean;
    };
  };
};

export type MentorTrainingSubmissionResponse = {
  ok: boolean;
  passed: boolean;
  score: number;
  passingScore: number;
  item: MentorOnboardingWorkspaceResponse["item"];
};
