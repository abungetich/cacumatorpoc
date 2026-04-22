import { z } from 'zod';
import {
  educationLevels,
  geographicScopes,
  programCategories,
  programFormats,
  programStatuses,
  programTypes,
  sessionFrequencies,
  targetAgeGroups,
} from '@/lib/programs-config';

const today = new Date();
today.setHours(0, 0, 0, 0);

export const uuidLikeSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID');

export const dateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date')
  .refine((value) => new Date(value) <= today, 'Date cannot be in the future');

export const plainDateStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD date format')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date');

export const dateTimeStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, 'Use YYYY-MM-DDTHH:mm date-time format')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date-time');

export const appRoleSchema = z.enum([
  'MENTOR',
  'MENTEE',
  'SCHOOL_ADMIN',
  'PLATFORM_ADMIN',
  'GUARDIAN',
  'PARTNER_ADMIN',
  'ORGANIZATION_ADMIN',
]);

export const schoolTypeSchema = z.enum(['PRIMARY', 'SECONDARY', 'COLLEGE', 'UNIVERSITY', 'VOCATIONAL']);
export const partnerTypeSchema = z.enum(['NGO', 'CORPORATE', 'FOUNDATION', 'GOVERNMENT']);
export const organizationTypeSchema = z.enum([
  'CORPORATE',
  'NGO',
  'FOUNDATION',
  'GOVERNMENT',
  'ALUMNI',
  'ASSOCIATION',
  'COMMUNITY',
  'FAITH_BASED',
  'OTHER',
]);

export const menteeEducationLevelSchema = z.enum([
  'PRIMARY',
  'SECONDARY',
  'COLLEGE',
  'UNIVERSITY',
  'VOCATIONAL',
]);

export const grantOpportunityStatusSchema = z.enum(['DISCOVERED', 'QUALIFYING', 'PURSUING', 'ARCHIVED']);
export const grantSourceTypeSchema = z.enum(['TEAM', 'BOARD', 'WEBSITE', 'LINKEDIN', 'EMAIL', 'REFERRAL', 'OTHER']);
export const grantApplicationStageSchema = z.enum(['DISCOVERY', 'APPROVAL', 'WRITING', 'SUBMISSION', 'SUBMITTED', 'CLOSED']);
export const grantTaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'DONE']);
export const grantTaskReviewDecisionSchema = z.enum(['APPROVE', 'REWORK']);
export const grantTaskDomainSchema = z.enum([
  'LEGAL',
  'OPERATIONS',
  'STATUTORY',
  'TECHNOLOGY',
  'FINANCE',
  'PROGRAM',
  'PARTNERSHIPS',
  'COMMUNICATIONS',
  'MONITORING_EVALUATION',
  'SAFEGUARDING',
  'OTHER',
]);
export const grantApprovalTypeSchema = z.enum(['PURSUE', 'BUDGET', 'FINAL_SUBMISSION']);
export const grantApprovalStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
export const grantFunderTypeSchema = z.enum(['FOUNDATION', 'GOVERNMENT', 'CORPORATE', 'NGO', 'MULTILATERAL', 'OTHER']);

export const grantUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'URL must start with http:// or https://');

export const minorAmountStringSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Amount must be an integer in minor units');

export const optionalHttpUrlSchema = z
  .string()
  .trim()
  .max(300)
  .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'Must start with http:// or https://');

export const optionalOrganizationLogoSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || value.startsWith('/uploads/organizations/'), 'Invalid organization logo path');

export const optionalPlatformLogoSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || value.startsWith('/uploads/platform/'), 'Invalid platform logo path');

export const mentorRequirementsSchema = z.object({
  minimumYearsExperience: z.int().min(0).max(60).default(0),
  industries: z.array(z.string().trim().min(2).max(120)).max(20).default([]),
  professions: z.array(z.string().trim().min(2).max(120)).max(20).default([]),
  educationLevels: z.array(z.enum(educationLevels)).max(educationLevels.length).default([]),
  backgroundCheckRequired: z.boolean().default(true),
  safeguardingTrainingRequired: z.boolean().default(true),
  alumniOnly: z.boolean().default(false),
});

export const programEnums = {
  educationLevels,
  geographicScopes,
  programCategories,
  programFormats,
  programStatuses,
  programTypes,
  sessionFrequencies,
  targetAgeGroups,
};

export function buildValidationError(error: z.ZodError, fallbackMessage = 'Validation failed') {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !errors[key]) {
      errors[key] = issue.message;
    }
  }

  return {
    message: error.issues[0]?.message ?? Object.values(errors)[0] ?? fallbackMessage,
    errors,
  };
}
