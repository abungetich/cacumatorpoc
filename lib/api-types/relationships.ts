export type RelationshipOverviewItem = {
  mentorshipId: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "TERMINATED";
  mentor: {
    userId: string;
    name: string;
    email: string;
  };
  mentee: {
    userId: string;
    name: string;
    email: string;
  };
  program: {
    id: string;
    name: string;
    schoolId: string;
    schoolName: string;
  };
  checkInFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  startedAt: string | null;
  scheduledEndDate: string;
  actualEndDate: string | null;
  lastSessionDate: string | null;
  nextScheduledSession: string | null;
  sessionsLogged: number;
  feedbackCount: number;
  lastFeedbackAt: string | null;
  atRisk: boolean;
  reviewDue: boolean;
  daysSinceLastSession: number | null;
  permissions: {
    canLogSession: boolean;
    canPause: boolean;
    canResume: boolean;
    canComplete: boolean;
    canTerminate: boolean;
    canSubmitReview: boolean;
  };
};

export type RelationshipsOverviewResponse = {
  items: RelationshipOverviewItem[];
};

export type RelationshipMutationResponse = {
  mentorshipId: string;
  status: "PENDING" | "ACTIVE" | "PAUSED" | "COMPLETED" | "TERMINATED";
};
