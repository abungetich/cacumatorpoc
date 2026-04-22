import { apiFetch } from "@/lib/api-client";
import { uploadStudentMasterCsv } from "@/lib/config-actions";
import type {
  ManagedSchoolsResponse,
  SchoolDetailResponse,
  SchoolOnboardingResponse,
  SchoolProgramRow,
  StudentMasterUploadResponse,
} from "@/lib/api-types";

type AddSchoolAdminPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
};

type UpdateSchoolHeadPayload = {
  principalName: string;
  principalEmail: string;
};

type AddSchoolStudentPayload = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  educationLevel: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
};

export type SchoolProgramPayload = {
  schoolId?: string;
  name: string;
  description: string;
  programType?: "FIXED" | "ROLLING" | "COHORT";
  category?: "CAREER" | "ACADEMIC" | "ENTREPRENEURSHIP" | "LEADERSHIP" | "MENTAL_HEALTH" | "LIFE_SKILLS";
  themes?: string[];
  targetAgeGroups?: Array<"EARLY_SECONDARY" | "SENIOR_SECONDARY" | "UNIVERSITY" | "YOUNG_PROFESSIONALS">;
  geographicScope?: "SCHOOL" | "COUNTY" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL";
  targetSchoolIds?: string[];
  targetCounties?: string[];
  targetCountries?: string[];
  mentorRequirements?: {
    minimumYearsExperience: number;
    industries: string[];
    professions: string[];
    educationLevels: Array<"PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL">;
    backgroundCheckRequired: boolean;
    safeguardingTrainingRequired: boolean;
    alumniOnly: boolean;
  };
  programFormat?: "VIRTUAL" | "IN_PERSON" | "HYBRID";
  sessionFrequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
  sessionDurationMinutes?: number;
  applicationDeadline?: string;
  rollingProgram?: boolean;
  cohortLengthMonths?: number;
  maxMentors?: number;
  maxMentees?: number;
  programStatus?: "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
  durationMonths: number;
  minSessionsPerMonth: number;
  objectives: string[];
  targetEducationLevels: Array<"PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL">;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

export type SchoolPayload = {
  name: string;
  type: "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL";
  address: string;
  phone: string;
  email: string;
  principalName?: string;
  principalEmail?: string;
  studentPopulation?: number;
  accreditationStatus?: string;
  partnerId?: string;
};

export function fetchManagedSchools() {
  return apiFetch<ManagedSchoolsResponse>("/api/protected/schools/manage");
}

export function fetchSchoolDetail(schoolId: string) {
  return apiFetch<SchoolDetailResponse>(`/api/protected/schools/${schoolId}`);
}

export function createSchool(payload: SchoolPayload) {
  const principalName = payload.principalName?.trim() || "Pending Assignment";
  const principalEmail = payload.principalEmail?.trim().toLowerCase() || "pending-principal@cacumator.local";

  return apiFetch<SchoolOnboardingResponse>("/api/protected/schools/onboard", {
    method: "POST",
    body: JSON.stringify({
      ...payload,
      principalName,
      principalEmail,
      schoolAdmin: {
        create: false,
      },
    }),
  });
}

export function updateSchool(schoolId: string, payload: SchoolPayload) {
  return apiFetch<{ ok: boolean }>(`/api/protected/schools/${schoolId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSchool(schoolId: string) {
  return apiFetch<{ ok: boolean }>(`/api/protected/schools/${schoolId}`, {
    method: "DELETE",
  });
}

export function addSchoolAdmin(schoolId: string, payload: AddSchoolAdminPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; email: string; firstName: string; lastName: string } }>(
    `/api/protected/schools/${schoolId}/admins`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function updateSchoolHead(schoolId: string, payload: UpdateSchoolHeadPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; principalName: string; principalEmail: string } }>(
    `/api/protected/schools/${schoolId}/head`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export function addSchoolStudent(schoolId: string, payload: AddSchoolStudentPayload) {
  return apiFetch<{ ok: boolean; item: { id: string; userId: string; name: string; email: string } }>(
    `/api/protected/schools/${schoolId}/students`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export function uploadSchoolStudentsCsv(schoolId: string, file: File, dryRun: boolean): Promise<StudentMasterUploadResponse> {
  return uploadStudentMasterCsv(file, dryRun, schoolId);
}

export function createSchoolProgram(schoolId: string, payload: SchoolProgramPayload) {
  return apiFetch<{ ok: boolean; item: SchoolProgramRow }>(`/api/protected/schools/${schoolId}/programs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSchoolProgram(schoolId: string, programId: string, payload: SchoolProgramPayload) {
  return apiFetch<{ ok: boolean; item: SchoolProgramRow }>(`/api/protected/schools/${schoolId}/programs/${programId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteSchoolProgram(schoolId: string, programId: string) {
  return apiFetch<{ ok: boolean }>(`/api/protected/schools/${schoolId}/programs/${programId}`, {
    method: "DELETE",
  });
}
