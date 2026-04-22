import { z } from 'zod';

import { geographicScopes, programCategories, programFormats, programStatuses, programTypes, sessionFrequencies, targetAgeGroups } from '@/lib/programs-config';
import { dateStringSchema, menteeEducationLevelSchema, mentorRequirementsSchema, partnerTypeSchema, plainDateStringSchema, schoolTypeSchema, uuidLikeSchema } from '@/lib/validation/shared';

export const schoolAdminOnboardingSchema = z
  .object({
    create: z.boolean().default(true),
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    email: z.email().trim().toLowerCase().optional(),
    phone: z.string().trim().min(7).max(24).optional(),
    dateOfBirth: dateStringSchema.optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((value) => {
    if (!value.create) return true;
    return Boolean(value.firstName && value.lastName && value.email && value.phone && value.dateOfBirth && value.password);
  }, 'Complete school admin fields to provision an admin account');

export const schoolOnboardingSchema = z.object({
  name: z.string().trim().min(3).max(200),
  type: schoolTypeSchema,
  address: z.string().trim().min(5).max(500),
  phone: z.string().trim().min(7).max(24),
  email: z.email().trim().toLowerCase(),
  principalName: z.string().trim().min(3).max(140),
  principalEmail: z.email().trim().toLowerCase(),
  partnerId: uuidLikeSchema.optional(),
  studentPopulation: z.int().min(1).max(200000).optional(),
  accreditationStatus: z.string().trim().max(120).optional(),
  schoolAdmin: schoolAdminOnboardingSchema.default({ create: true }),
});

export const updateSchoolSchema = z.object({
  name: z.string().trim().min(3).max(200),
  type: schoolTypeSchema,
  address: z.string().trim().min(5).max(500),
  phone: z.string().trim().min(7).max(24),
  email: z.email().trim().toLowerCase(),
  principalName: z.string().trim().min(3).max(140),
  principalEmail: z.email().trim().toLowerCase(),
  studentPopulation: z.int().min(1).max(200000).nullable().optional(),
  accreditationStatus: z.string().trim().max(120).nullable().optional(),
});

export const createSchoolAdminSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(24),
  dateOfBirth: dateStringSchema,
  password: z.string().min(8).max(128),
});

export const createTenantUserSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(24),
  role: z.enum(['PLATFORM_ADMIN', 'PARTNER_ADMIN', 'SCHOOL_ADMIN']).default('PARTNER_ADMIN'),
});

export const tenantInviteTokenSchema = z.object({
  token: z.string().trim().min(32).max(256),
});

export const acceptTenantInviteSchema = tenantInviteTokenSchema.extend({
  dateOfBirth: dateStringSchema,
  password: z.string().min(8).max(128),
});

export const updateSchoolHeadSchema = z.object({
  principalName: z.string().trim().min(3).max(140),
  principalEmail: z.email().trim().toLowerCase(),
});

export const schoolProgramSchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    description: z.string().trim().min(10).max(4000),
    programType: z.enum(programTypes).default('FIXED'),
    category: z.enum(programCategories).default('CAREER'),
    themes: z.array(z.string().trim().min(2).max(120)).max(24).default([]),
    targetAgeGroups: z.array(z.enum(targetAgeGroups)).max(targetAgeGroups.length).default([]),
    geographicScope: z.enum(geographicScopes).default('SCHOOL'),
    targetSchoolIds: z.array(uuidLikeSchema).max(100).default([]),
    targetCounties: z.array(z.string().trim().min(2).max(120)).max(20).default([]),
    targetCountries: z.array(z.string().trim().min(2).max(120)).max(20).default([]),
    mentorRequirements: mentorRequirementsSchema.default({
      minimumYearsExperience: 0,
      industries: [],
      professions: [],
      educationLevels: [],
      backgroundCheckRequired: true,
      safeguardingTrainingRequired: true,
      alumniOnly: false,
    }),
    programFormat: z.enum(programFormats).default('VIRTUAL'),
    sessionFrequency: z.enum(sessionFrequencies).default('MONTHLY'),
    sessionDurationMinutes: z.int().min(15).max(480).default(60),
    applicationDeadline: z.string().datetime({ offset: true }).optional(),
    rollingProgram: z.boolean().default(false),
    cohortLengthMonths: z.int().min(1).max(24).optional(),
    maxMentors: z.int().min(1).max(500).optional(),
    maxMentees: z.int().min(1).max(10000).optional(),
    programStatus: z.enum(programStatuses).default('DRAFT'),
    durationMonths: z.int().min(1).max(60),
    minSessionsPerMonth: z.int().min(1).max(12),
    objectives: z.array(z.string().trim().min(2).max(200)).min(1).max(30),
    targetEducationLevels: z.array(schoolTypeSchema).min(1).max(5),
    startDate: plainDateStringSchema,
    endDate: plainDateStringSchema,
    isActive: z.boolean().default(true),
  })
  .refine((value) => !value.rollingProgram || typeof value.cohortLengthMonths === 'number', {
    message: 'Cohort length is required for rolling programs',
    path: ['cohortLengthMonths'],
  })
  .refine((value) => new Date(value.endDate).getTime() >= new Date(value.startDate).getTime(), {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  });

export const programWorkspaceCreateSchema = schoolProgramSchema.extend({
  schoolId: uuidLikeSchema.optional(),
});

export const mentorProgramApplySchema = z.object({
  programId: uuidLikeSchema,
  availabilityNotes: z.string().trim().min(10).max(2000),
  interestAreas: z.array(z.string().trim().min(2).max(120)).min(1).max(10),
  commitmentHoursPerMonth: z.int().min(1).max(200),
  applicationNote: z.string().trim().max(2000).optional(),
});

export const mentorProgramReviewSchema = z.object({
  status: z.enum(['APPROVED', 'WAITLISTED', 'REJECTED']),
  reviewNotes: z.string().trim().min(3).max(2000).optional(),
});

export const createPartnerSchema = z.object({
  name: z.string().trim().min(3).max(200),
  type: partnerTypeSchema,
  contactPerson: z.string().trim().min(3).max(140),
  contactEmail: z.email().trim().toLowerCase(),
  contactPhone: z.string().trim().min(7).max(24).optional(),
  website: z.string().trim().max(200).refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'Website must start with http:// or https://').optional(),
  logoUrl: z.string().trim().max(300).refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'Logo URL must start with http:// or https://').optional(),
  agreementSigned: z.boolean().default(false),
});

export const createSchoolStudentSchema = z.object({
  name: z.string().trim().min(3).max(140),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(7).max(24),
  dateOfBirth: dateStringSchema,
  educationLevel: z.union([menteeEducationLevelSchema, z.enum(['Primary', 'Secondary', 'College', 'University', 'Vocational'])]).default('SECONDARY'),
  emergencyContactName: z.string().trim().min(3).max(140).optional(),
  emergencyContactPhone: z.string().trim().min(7).max(24).optional(),
});
