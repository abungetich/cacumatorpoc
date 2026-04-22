export type MenteeIntakeStage = "CONSENT_REQUIRED" | "AWAITING_MATCHING" | "MATCHED" | "ACTIVE" | "INACTIVE";

export type MenteeIntakeRow = {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  schoolName: string;
  educationLevel: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
  status: "ACTIVE" | "WAITING" | "MATCHED" | "INACTIVE";
  intakeStage: MenteeIntakeStage;
  requiresConsent: boolean;
  hasConsent: boolean;
  createdAt: string;
};

export type PeoplePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type PeopleOverviewResponse = {
  summary: {
    totalMentors: number;
    totalMentees: number;
    mentorsPendingReview: number;
    newMentorSignups: number;
    declinedConsentMentors: number;
    mentorsMatchable: number;
    menteesAwaiting: number;
    menteesConsentBlocked: number;
  };
};

export type PeopleMentorsResponse = {
  items: import("@/lib/api-types/mentors").MentorIntakeRow[];
  pagination: PeoplePagination;
};

export type PeopleMenteesResponse = {
  items: MenteeIntakeRow[];
  pagination: PeoplePagination;
};

export type MenteeDetailAction = "MARK_MATCHED" | "ACTIVATE" | "DEACTIVATE" | "REOPEN_WAITING";

export type MenteeDetailAuditEntry = {
  id: string;
  action: string;
  actor: string;
  timestamp: string;
  comment: string | null;
  details: Record<string, unknown> | null;
};

export type MenteeDetailResponse = {
  item: {
    snapshot: {
      profileId: string;
      userId: string;
      fullName: string;
      email: string;
      phone: string;
      dateOfBirth: string | null;
      createdAt: string;
      updatedAt: string;
      status: "ACTIVE" | "WAITING" | "MATCHED" | "INACTIVE";
      intakeStage: MenteeIntakeStage;
      educationLevel: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
      enrollmentStatus: "FULL_TIME" | "PART_TIME";
      preferredFormat: "ONLINE" | "IN_PERSON" | "HYBRID";
      schoolId: string;
      partnerId: string | null;
      guardianUserId: string | null;
      schoolName: string;
      partnerName: string | null;
      requiresConsent: boolean;
      hasConsent: boolean;
    };
    learnerSupport: {
      interests: string[];
      declaredGoals: string[];
      specificChallenges: string | null;
      specialRequirements: string | null;
      emergencyContactName: string;
      emergencyContactPhone: string;
    };
    schoolContext: {
      name: string;
      type: string;
      address: string;
      phone: string;
      email: string;
      principalName: string;
      principalEmail: string;
      partnerName: string | null;
    };
    guardian: {
      parentGuardianName: string | null;
      parentGuardianContact: string | null;
      parentGuardianEmail: string | null;
      parentGuardianConsent: boolean | null;
      parentGuardianConsentDate: string | null;
      guardianAccountName: string | null;
      guardianAccountEmail: string | null;
      activeConsents: Array<{
        id: string;
        consentType: string;
        version: string;
        agreedAt: string;
        documentUrl: string;
      }>;
    };
    goals: {
      active: Array<{
        id: string;
        title: string;
        status: string;
        progressPercentage: number;
        targetDate: string;
        notes: string | null;
      }>;
    };
    matching: {
      blockers: string[];
      availableActions: MenteeDetailAction[];
      activeMentorship: {
        id: string;
        status: string;
        mentorName: string;
        programName: string;
        startedAt: string | null;
        nextScheduledSession: string | null;
        lastSessionDate: string | null;
      } | null;
      recentSessions: Array<{
        id: string;
        scheduledDate: string;
        actualDate: string | null;
        attendanceStatus: string;
        format: string;
        durationMinutes: number;
        topics: string[];
      }>;
    };
    audit: MenteeDetailAuditEntry[];
  };
};
