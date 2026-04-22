export type SchoolListItem = {
  id: string;
  name: string;
  type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
  address: string;
  location: string;
};

export type SchoolsResponse = {
  items: SchoolListItem[];
};

export type StudentMasterUploadSummary = {
  totalRows: number;
  validated: number;
  created: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
};

export type StudentMasterUploadRow = {
  line: number;
  name: string;
  email: string;
  school: string;
  status: "created" | "validated" | "skipped" | "failed";
  reason?: string;
};

export type StudentMasterUploadError = {
  line: number;
  email: string;
  message: string;
};

export type StudentMasterUploadResponse = {
  ok: boolean;
  summary: StudentMasterUploadSummary;
  errors: StudentMasterUploadError[];
  preview: StudentMasterUploadRow[];
};

export type SchoolOnboardingResponse = {
  ok: boolean;
  school: {
    id: string;
    name: string;
    type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
    partnerId: string | null;
  };
  adminAccount?: {
    id: string;
    email: string;
  };
};

export type ManagedSchoolRow = {
  id: string;
  name: string;
  type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
  address: string;
  location: string;
  phone: string;
  email: string;
  principalName: string;
  principalEmail: string;
  studentPopulation: number | null;
  accreditationStatus: string | null;
  partner: {
    id: string;
    name: string;
    type: "NGO" | "CORPORATE" | "FOUNDATION" | "GOVERNMENT";
  } | null;
  counts: {
    students: number;
    users: number;
    admins: number;
  };
};

export type ManagedSchoolsResponse = {
  items: ManagedSchoolRow[];
};

export type SchoolProgramRow = {
  id: string;
  name: string;
  description: string;
  programType: "FIXED" | "ROLLING" | "COHORT";
  category: "CAREER" | "ACADEMIC" | "ENTREPRENEURSHIP" | "LEADERSHIP" | "MENTAL_HEALTH" | "LIFE_SKILLS";
  themes: string[];
  targetAgeGroups: Array<"EARLY_SECONDARY" | "SENIOR_SECONDARY" | "UNIVERSITY" | "YOUNG_PROFESSIONALS">;
  geographicScope: "SCHOOL" | "COUNTY" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL";
  targetSchoolIds: string[];
  targetCounties: string[];
  targetCountries: string[];
  mentorRequirements: {
    minimumYearsExperience: number;
    industries: string[];
    professions: string[];
    educationLevels: Array<"PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL">;
    backgroundCheckRequired: boolean;
    safeguardingTrainingRequired: boolean;
    alumniOnly: boolean;
  };
  programFormat: "VIRTUAL" | "IN_PERSON" | "HYBRID";
  sessionFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  sessionDurationMinutes: number;
  applicationDeadline: string | null;
  rollingProgram: boolean;
  cohortLengthMonths: number | null;
  maxMentors: number | null;
  maxMentees: number | null;
  programStatus: "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  durationMonths: number;
  minSessionsPerMonth: number;
  objectives: string[];
  targetEducationLevels: Array<"PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL">;
  startDate: string;
  endDate: string;
  isActive: boolean;
  mentorshipCount: number;
};

export type SchoolDetailResponse = {
  item: ManagedSchoolRow & {
    programs: SchoolProgramRow[];
  };
};

export type ProgramWorkspaceSchoolOption = {
  id: string;
  name: string;
  type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
};

export type ProgramWorkspaceRow = SchoolProgramRow & {
  school: {
    id: string;
    name: string;
    type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
    partnerName: string | null;
  } | null;
  targetSchools: ProgramWorkspaceSchoolOption[];
};

export type ProgramWorkspaceResponse = {
  items: ProgramWorkspaceRow[];
  schools: ProgramWorkspaceSchoolOption[];
};

export type MentorOnboardingStage =
  | "SIGNUP"
  | "EMAIL_VERIFIED"
  | "PROFILE_CREATED"
  | "INTERESTS_SELECTED"
  | "TRAINING_COMPLETED"
  | "CONSENT_SIGNED"
  | "BACKGROUND_CHECK_PENDING"
  | "APPROVED"
  | "PROGRAM_ELIGIBLE"
  | "MATCHING"
  | "ACTIVE"
  | "ALUMNI";

export type MentorDiscoverProgramRow = {
  id: string;
  schoolId: string | null;
  schoolName: string;
  partnerName: string | null;
  targetSchools: ProgramWorkspaceSchoolOption[];
  name: string;
  description: string;
  category: ProgramWorkspaceRow["category"];
  programType: ProgramWorkspaceRow["programType"];
  programFormat: ProgramWorkspaceRow["programFormat"];
  programStatus: ProgramWorkspaceRow["programStatus"];
  durationMonths: number;
  sessionFrequency: ProgramWorkspaceRow["sessionFrequency"];
  sessionDurationMinutes: number;
  applicationDeadline: string | null;
  targetAgeGroups: ProgramWorkspaceRow["targetAgeGroups"];
  targetEducationLevels: ProgramWorkspaceRow["targetEducationLevels"];
  targetCounties: string[];
  targetCountries: string[];
  mentorRequirements: ProgramWorkspaceRow["mentorRequirements"];
  themes: string[];
  openApplications: number;
  myApplicationStatus: "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN" | null;
};

export type MentorProgramApplicationRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN";
  availabilityNotes: string;
  interestAreas: string[];
  commitmentHoursPerMonth: number;
  applicationNote: string | null;
  appliedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  program: {
    id: string;
    name: string;
    schoolName: string;
    category: ProgramWorkspaceRow["category"];
    programFormat: ProgramWorkspaceRow["programFormat"];
    programStatus: ProgramWorkspaceRow["programStatus"];
  };
};

export type MentorProgramDiscoverResponse = {
  onboarding: {
    currentStage: MentorOnboardingStage;
    profileCompletionPercentage: number;
  } | null;
  items: MentorDiscoverProgramRow[];
  applications: MentorProgramApplicationRow[];
};

export type MentorProgramApplicationWorkspaceRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN";
  availabilityNotes: string;
  interestAreas: string[];
  commitmentHoursPerMonth: number;
  applicationNote: string | null;
  appliedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  mentor: {
    userId: string;
    name: string;
    email: string;
    onboardingStage: MentorOnboardingStage | null;
  };
  program: {
    id: string;
    name: string;
    schoolId: string;
    schoolName: string;
    category: ProgramWorkspaceRow["category"];
    programStatus: ProgramWorkspaceRow["programStatus"];
  };
};

export type MentorProgramApplicationWorkspaceResponse = {
  items: MentorProgramApplicationWorkspaceRow[];
};
