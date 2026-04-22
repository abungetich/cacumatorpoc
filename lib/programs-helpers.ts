import { parseStringArray } from "@/lib/programs-config";

export const defaultMentorRequirements = {
  minimumYearsExperience: 0,
  industries: [] as string[],
  professions: [] as string[],
  educationLevels: [] as Array<"PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL">,
  backgroundCheckRequired: true,
  safeguardingTrainingRequired: true,
  alumniOnly: false,
};

export function toPlainDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function normalizeMentorRequirements(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultMentorRequirements;
  }

  const item = value as Record<string, unknown>;

  return {
    minimumYearsExperience:
      typeof item.minimumYearsExperience === "number" && Number.isFinite(item.minimumYearsExperience)
        ? item.minimumYearsExperience
        : defaultMentorRequirements.minimumYearsExperience,
    industries: parseStringArray(item.industries),
    professions: parseStringArray(item.professions),
    educationLevels: parseStringArray(item.educationLevels) as Array<
      "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL"
    >,
    backgroundCheckRequired:
      typeof item.backgroundCheckRequired === "boolean"
        ? item.backgroundCheckRequired
        : defaultMentorRequirements.backgroundCheckRequired,
    safeguardingTrainingRequired:
      typeof item.safeguardingTrainingRequired === "boolean"
        ? item.safeguardingTrainingRequired
        : defaultMentorRequirements.safeguardingTrainingRequired,
    alumniOnly: typeof item.alumniOnly === "boolean" ? item.alumniOnly : defaultMentorRequirements.alumniOnly,
  };
}

export function mapProgramRow<
  T extends {
    id: string;
    name: string;
    description: string;
    programType: string;
    category: string;
    themes: unknown;
    targetAgeGroups: unknown;
    geographicScope: string;
    targetSchoolIds: string[];
    targetCounties: unknown;
    targetCountries: unknown;
    mentorRequirements: unknown;
    programFormat: string;
    sessionFrequency: string;
    sessionDurationMinutes: number;
    applicationDeadline: Date | null;
    rollingProgram: boolean;
    cohortLengthMonths: number | null;
    maxMentors: number | null;
    maxMentees: number | null;
    programStatus: string;
    durationMonths: number;
    minSessionsPerMonth: number;
    objectives: unknown;
    targetEducationLevels: unknown;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    _count?: {
      mentorships: number;
    };
  },
>(program: T) {
  return {
    id: program.id,
    name: program.name,
    description: program.description,
    programType: program.programType as "FIXED" | "ROLLING" | "COHORT",
    category: program.category as
      | "CAREER"
      | "ACADEMIC"
      | "ENTREPRENEURSHIP"
      | "LEADERSHIP"
      | "MENTAL_HEALTH"
      | "LIFE_SKILLS",
    themes: parseStringArray(program.themes),
    targetAgeGroups: parseStringArray(program.targetAgeGroups) as Array<
      "EARLY_SECONDARY" | "SENIOR_SECONDARY" | "UNIVERSITY" | "YOUNG_PROFESSIONALS"
    >,
    geographicScope: program.geographicScope as "SCHOOL" | "COUNTY" | "REGIONAL" | "NATIONAL" | "INTERNATIONAL",
    targetSchoolIds: Array.isArray(program.targetSchoolIds)
      ? program.targetSchoolIds.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [],
    targetCounties: parseStringArray(program.targetCounties),
    targetCountries: parseStringArray(program.targetCountries),
    mentorRequirements: normalizeMentorRequirements(program.mentorRequirements),
    programFormat: program.programFormat as "VIRTUAL" | "IN_PERSON" | "HYBRID",
    sessionFrequency: program.sessionFrequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY",
    sessionDurationMinutes: program.sessionDurationMinutes,
    applicationDeadline: program.applicationDeadline ? program.applicationDeadline.toISOString() : null,
    rollingProgram: program.rollingProgram,
    cohortLengthMonths: program.cohortLengthMonths,
    maxMentors: program.maxMentors,
    maxMentees: program.maxMentees,
    programStatus: program.programStatus as "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
    durationMonths: program.durationMonths,
    minSessionsPerMonth: program.minSessionsPerMonth,
    objectives: parseStringArray(program.objectives),
    targetEducationLevels: parseStringArray(program.targetEducationLevels) as Array<
      "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL"
    >,
    startDate: toPlainDate(program.startDate),
    endDate: toPlainDate(program.endDate),
    isActive: program.isActive,
    mentorshipCount: program._count?.mentorships ?? 0,
  };
}
