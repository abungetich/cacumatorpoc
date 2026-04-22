import { z } from 'zod';

import { optionalHttpUrlSchema, optionalOrganizationLogoSchema, optionalPlatformLogoSchema, organizationTypeSchema } from '@/lib/validation/shared';

export const registerOrganizationSchema = z
  .object({
    name: z.string().trim().min(3).max(200),
    type: organizationTypeSchema,
    logoUrl: optionalOrganizationLogoSchema.optional(),
    website: optionalHttpUrlSchema.optional(),
    country: z.string().trim().min(2).max(120),
    adminFirstName: z.string().trim().min(2).max(80),
    adminLastName: z.string().trim().min(2).max(80),
    adminEmail: z.email().trim().toLowerCase(),
    adminPhone: z.string().trim().min(7).max(24),
    mentorParticipation: z.boolean().default(true),
    financialSupport: z.boolean().default(false),
    inKindSupport: z.boolean().default(false),
  })
  .refine((value) => value.mentorParticipation || value.financialSupport || value.inKindSupport, {
    message: 'Select at least one organization participation mode',
    path: ['mentorParticipation'],
  }, {
  });

export const organizationOnboardingProfileSchema = z.object({
  organizationName: z.string().trim().min(3).max(200),
  type: organizationTypeSchema,
  logoUrl: optionalOrganizationLogoSchema.optional().nullable(),
  registrationNumber: z.string().trim().max(120).optional(),
  website: optionalHttpUrlSchema.optional(),
  description: z.string().trim().max(2000).optional(),
  mission: z.string().trim().max(2000).optional(),
  country: z.string().trim().min(2).max(120),
  county: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),
  address: z.string().trim().max(500).optional(),
  contactEmail: z.email().trim().toLowerCase(),
  contactPhone: z.string().trim().min(7).max(24).optional(),
  primaryContactName: z.string().trim().min(3).max(140),
  primaryContactTitle: z.string().trim().max(120).optional(),
  adminTitle: z.string().trim().max(120).optional(),
  mentorParticipation: z.boolean().default(true),
  financialSupport: z.boolean().default(false),
  inKindSupport: z.boolean().default(false),
  schoolsOfInterest: z.array(z.string().trim().min(2).max(200)).max(30).default([]),
}).refine((value) => value.mentorParticipation || value.financialSupport || value.inKindSupport, {
  message: 'Select at least one organization participation mode',
  path: ['mentorParticipation'],
});

export const organizationAgreementAssentSchema = z.object({
  code: z.enum(['PLATFORM_TERMS', 'DATA_PROCESSING', 'SAFEGUARDING', 'CONFIDENTIALITY', 'SUPPORT_TERMS']),
  acknowledgedName: z.string().trim().min(3).max(140),
  confirmed: z.literal(true),
  reachedEnd: z.literal(true),
});

export const updatePlatformBrandingSchema = z.object({
  platformName: z.string().trim().min(3).max(120),
  logoUrl: optionalPlatformLogoSchema.nullish(),
  ceoName: z.string().trim().min(3).max(120),
  ceoTitle: z.string().trim().min(3).max(120),
  ceoWelcomeMessage: z.string().trim().min(24).max(2000),
});
