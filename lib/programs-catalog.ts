import type { Dispatch, SetStateAction } from 'react';
import type { ProgramWorkspaceRow } from '@/lib/api-types';
import { educationLevels, geographicScopes, kenyaCounties, mentorIndustries, parseCsv, programCategories, programFormats, programStatuses, programThemes, programTypes, sessionFrequencies, suggestProgramThemes, targetAgeGroups } from '@/lib/programs-config';
import type { SchoolProgramPayload } from '@/lib/school-management-actions';

export type ProgramFormState = {
  schoolId: string;
  targetSchoolIds: string[];
  name: string;
  description: string;
  programType: (typeof programTypes)[number];
  category: (typeof programCategories)[number];
  themes: string[];
  targetAgeGroups: Array<(typeof targetAgeGroups)[number]>;
  targetEducationLevels: Array<(typeof educationLevels)[number]>;
  geographicScope: (typeof geographicScopes)[number];
  targetCounties: string[];
  targetCountries: string[];
  programFormat: (typeof programFormats)[number];
  sessionFrequency: (typeof sessionFrequencies)[number];
  sessionDurationMinutes: string;
  durationMonths: string;
  minSessionsPerMonth: string;
  objectives: string;
  startDate: string;
  endDate: string;
  applicationDeadline: string;
  rollingProgram: boolean;
  cohortLengthMonths: string;
  maxMentors: string;
  maxMentees: string;
  programStatus: (typeof programStatuses)[number];
  minimumYearsExperience: string;
  industries: string[];
  professions: string;
  mentorEducationLevels: Array<(typeof educationLevels)[number]>;
  backgroundCheckRequired: boolean;
  safeguardingTrainingRequired: boolean;
  alumniOnly: boolean;
  isActive: boolean;
};

export type ProgramWizardStep = 'CORE' | 'DELIVERY' | 'TARGETING' | 'MENTOR_RULES' | 'REVIEW';

export const programWizardSteps: Array<{
  id: ProgramWizardStep;
  label: string;
  description: string;
}> = [
  { id: 'CORE', label: 'Core', description: 'Identity and school ownership' },
  { id: 'DELIVERY', label: 'Delivery', description: 'Lifecycle, cadence, and timing' },
  { id: 'TARGETING', label: 'Targeting', description: 'Audience and geography' },
  { id: 'MENTOR_RULES', label: 'Mentor Rules', description: 'Eligibility and controls' },
  { id: 'REVIEW', label: 'Review', description: 'Preview before submission' },
];

export type ProgramActionState =
  | {
      action: 'toggle';
      program: ProgramWorkspaceRow;
      nextIsActive: boolean;
    }
  | {
      action: 'delete';
      program: ProgramWorkspaceRow;
    }
  | null;

export const emptyProgramForm: ProgramFormState = {
  schoolId: '',
  targetSchoolIds: [],
  name: '',
  description: '',
  programType: 'FIXED',
  category: 'CAREER',
  themes: [],
  targetAgeGroups: ['SENIOR_SECONDARY'],
  targetEducationLevels: ['SECONDARY'],
  geographicScope: 'SCHOOL',
  targetCounties: [],
  targetCountries: ['Kenya'],
  programFormat: 'VIRTUAL',
  sessionFrequency: 'MONTHLY',
  sessionDurationMinutes: '60',
  durationMonths: '6',
  minSessionsPerMonth: '2',
  objectives: '',
  startDate: '',
  endDate: '',
  applicationDeadline: '',
  rollingProgram: false,
  cohortLengthMonths: '',
  maxMentors: '',
  maxMentees: '',
  programStatus: 'DRAFT',
  minimumYearsExperience: '0',
  industries: [],
  professions: '',
  mentorEducationLevels: [],
  backgroundCheckRequired: true,
  safeguardingTrainingRequired: true,
  alumniOnly: false,
  isActive: true,
};

export const countyOptions = kenyaCounties.map((county) => ({
  value: county,
  label: county,
}));

export const mentorIndustryOptions = mentorIndustries.map((industry) => ({
  value: industry,
  label: industry === 'ALL' ? 'All industries' : industry,
}));

export const programThemeOptions = programThemes.map((theme) => ({
  value: theme,
  label: theme,
}));

export function formatEnumLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

export function validateProgramStep(step: ProgramWizardStep, form: ProgramFormState): string | null {
  if (step === 'CORE') {
    if (!form.name.trim()) return 'Program name is required.';
    if (form.description.trim().length < 10) return 'Program description must be at least 10 characters.';
    return null;
  }

  if (step === 'DELIVERY') {
    if (!form.startDate) return 'Start date is required.';
    if (!form.endDate) return 'End date is required.';
    if (!form.durationMonths || Number(form.durationMonths) < 1) return 'Duration in months is required.';
    if (!form.sessionDurationMinutes || Number(form.sessionDurationMinutes) < 15) return 'Session duration must be at least 15 minutes.';
    if (!form.minSessionsPerMonth || Number(form.minSessionsPerMonth) < 1) return 'Minimum sessions per month is required.';
    if (form.rollingProgram && (!form.cohortLengthMonths || Number(form.cohortLengthMonths) < 1)) {
      return 'Cohort length is required for rolling programs.';
    }
    return null;
  }

  if (step === 'TARGETING') {
    if (form.targetEducationLevels.length === 0) return 'Select at least one education level.';
    if (!form.objectives.trim()) return 'Program objectives are required.';
    if ((form.geographicScope === 'COUNTY' || form.geographicScope === 'REGIONAL') && form.targetCounties.length === 0) {
      return 'Select at least one Kenyan county for this geographic scope.';
    }
    return null;
  }

  if (step === 'MENTOR_RULES') {
    return null;
  }

  for (const candidate of programWizardSteps.slice(0, -1)) {
    const error = validateProgramStep(candidate.id, form);
    if (error) return error;
  }

  return null;
}

export function formatDate(value: string | null) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

export function statusPillClass(status: ProgramWorkspaceRow['programStatus']) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-emerald-100 text-emerald-800';
    case 'ENROLLMENT_OPEN':
      return 'bg-amber-100 text-amber-800';
    case 'PUBLISHED':
      return 'bg-sky-100 text-sky-800';
    case 'COMPLETED':
      return 'bg-violet-100 text-violet-800';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-700';
    default:
      return 'bg-zinc-100 text-zinc-700';
  }
}

export function activePillClass(isActive: boolean) {
  return isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700';
}

export function toDateTimeLocalInput(value: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const offsetMinutes = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offsetMinutes * 60_000);
  return local.toISOString().slice(0, 16);
}

export function toIsoDateTime(value: string) {
  if (!value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

export function toProgramPayload(form: ProgramFormState): SchoolProgramPayload {
  const geographicScope = form.geographicScope;
  const targetCountries = ['Kenya'];
  const targetCounties = geographicScope === 'COUNTY' || geographicScope === 'REGIONAL' ? form.targetCounties : [];

  return {
    schoolId: form.schoolId || undefined,
    name: form.name.trim(),
    description: form.description.trim(),
    programType: form.programType,
    category: form.category,
    themes: form.themes,
    targetAgeGroups: form.targetAgeGroups,
    targetEducationLevels: form.targetEducationLevels,
    geographicScope,
    targetSchoolIds: form.targetSchoolIds,
    targetCounties,
    targetCountries,
    mentorRequirements: {
      minimumYearsExperience: Number(form.minimumYearsExperience || '0'),
      industries: form.industries.includes('ALL') ? ['ALL'] : form.industries,
      professions: parseCsv(form.professions),
      educationLevels: form.mentorEducationLevels,
      backgroundCheckRequired: form.backgroundCheckRequired,
      safeguardingTrainingRequired: form.safeguardingTrainingRequired,
      alumniOnly: form.alumniOnly,
    },
    programFormat: form.programFormat,
    sessionFrequency: form.sessionFrequency,
    sessionDurationMinutes: Number(form.sessionDurationMinutes),
    applicationDeadline: toIsoDateTime(form.applicationDeadline),
    rollingProgram: form.rollingProgram,
    cohortLengthMonths: form.cohortLengthMonths ? Number(form.cohortLengthMonths) : undefined,
    maxMentors: form.maxMentors ? Number(form.maxMentors) : undefined,
    maxMentees: form.maxMentees ? Number(form.maxMentees) : undefined,
    programStatus: form.programStatus,
    durationMonths: Number(form.durationMonths),
    minSessionsPerMonth: Number(form.minSessionsPerMonth),
    objectives: parseCsv(form.objectives),
    startDate: form.startDate,
    endDate: form.endDate,
    isActive: form.isActive,
  };
}

export function fromProgramRow(program: ProgramWorkspaceRow): ProgramFormState {
  return {
    schoolId: program.school?.id ?? '',
    targetSchoolIds: program.targetSchoolIds,
    name: program.name,
    description: program.description,
    programType: program.programType,
    category: program.category,
    themes: program.themes,
    targetAgeGroups: program.targetAgeGroups,
    targetEducationLevels: program.targetEducationLevels,
    geographicScope: program.geographicScope,
    targetCounties: program.targetCounties,
    targetCountries: program.targetCountries.length ? program.targetCountries : ['Kenya'],
    programFormat: program.programFormat,
    sessionFrequency: program.sessionFrequency,
    sessionDurationMinutes: String(program.sessionDurationMinutes),
    durationMonths: String(program.durationMonths),
    minSessionsPerMonth: String(program.minSessionsPerMonth),
    objectives: program.objectives.join(', '),
    startDate: program.startDate,
    endDate: program.endDate,
    applicationDeadline: toDateTimeLocalInput(program.applicationDeadline),
    rollingProgram: program.rollingProgram,
    cohortLengthMonths: program.cohortLengthMonths ? String(program.cohortLengthMonths) : '',
    maxMentors: program.maxMentors ? String(program.maxMentors) : '',
    maxMentees: program.maxMentees ? String(program.maxMentees) : '',
    programStatus: program.programStatus,
    minimumYearsExperience: String(program.mentorRequirements.minimumYearsExperience),
    industries: program.mentorRequirements.industries.length ? program.mentorRequirements.industries : [],
    professions: program.mentorRequirements.professions.join(', '),
    mentorEducationLevels: program.mentorRequirements.educationLevels,
    backgroundCheckRequired: program.mentorRequirements.backgroundCheckRequired,
    safeguardingTrainingRequired: program.mentorRequirements.safeguardingTrainingRequired,
    alumniOnly: program.mentorRequirements.alumniOnly,
    isActive: program.isActive,
  };
}

export function toUpdatePayload(program: ProgramWorkspaceRow, nextIsActive: boolean): SchoolProgramPayload {
  return {
    schoolId: program.school?.id ?? undefined,
    name: program.name,
    description: program.description,
    programType: program.programType,
    category: program.category,
    themes: program.themes,
    targetAgeGroups: program.targetAgeGroups,
    targetEducationLevels: program.targetEducationLevels,
    geographicScope: program.geographicScope,
    targetSchoolIds: program.targetSchoolIds,
    targetCounties: program.targetCounties,
    targetCountries: program.targetCountries,
    mentorRequirements: program.mentorRequirements,
    programFormat: program.programFormat,
    sessionFrequency: program.sessionFrequency,
    sessionDurationMinutes: program.sessionDurationMinutes,
    applicationDeadline: program.applicationDeadline ?? undefined,
    rollingProgram: program.rollingProgram,
    cohortLengthMonths: program.cohortLengthMonths ?? undefined,
    maxMentors: program.maxMentors ?? undefined,
    maxMentees: program.maxMentees ?? undefined,
    programStatus: program.programStatus,
    durationMonths: program.durationMonths,
    minSessionsPerMonth: program.minSessionsPerMonth,
    objectives: program.objectives,
    startDate: program.startDate,
    endDate: program.endDate,
    isActive: nextIsActive,
  };
}

export function toggleArrayValue<T extends string>(items: T[], value: T, checked: boolean) {
  if (checked) {
    return items.includes(value) ? items : [...items, value];
  }
  return items.filter((item) => item !== value);
}

export function normalizeIndustrySelection(value: string | string[]) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  if (items.includes('ALL')) {
    return ['ALL'];
  }
  return items.filter(Boolean);
}

export function normalizeTagSelection(value: string | string[]) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

export function addUniqueTags(existing: string[], next: string[]) {
  return Array.from(new Set([...existing, ...next.map((item) => item.trim()).filter(Boolean)]));
}

export function handleGeographicScopeChange(
  nextScope: ProgramFormState['geographicScope'],
  setProgramForm: Dispatch<SetStateAction<ProgramFormState>>,
) {
  setProgramForm((prev) => ({
    ...prev,
    geographicScope: nextScope,
    targetCountries: ['Kenya'],
    targetCounties: nextScope === 'COUNTY' || nextScope === 'REGIONAL' ? prev.targetCounties : [],
  }));
}

export function getSuggestedThemes(form: Pick<ProgramFormState, 'name' | 'description' | 'category'>) {
  return suggestProgramThemes({
    name: form.name,
    description: form.description,
    category: form.category,
  });
}
