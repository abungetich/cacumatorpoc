import { z } from 'zod';

import {
  dateTimeStringSchema,
  grantApprovalStatusSchema,
  grantApprovalTypeSchema,  grantFunderTypeSchema,
  grantOpportunityStatusSchema,
  grantSourceTypeSchema,
  grantTaskDomainSchema,
  grantTaskReviewDecisionSchema,
  grantTaskStatusSchema,
  minorAmountStringSchema,  plainDateStringSchema,
  uuidLikeSchema,
} from '@/lib/validation/shared';

const grantUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'URL must start with http:// or https://');

export const createGrantOpportunitySchema = z.object({
  title: z.string().trim().min(3).max(200),
  funderName: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000).optional(),
  sourceType: grantSourceTypeSchema.optional(),
  sourceReference: z.string().trim().max(240).optional(),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'Source URL must start with http:// or https://')
    .optional(),
  deadline: dateTimeStringSchema,
  status: grantOpportunityStatusSchema.optional(),
  fitScore: z.int().min(0).max(100).optional(),
  country: z.string().trim().min(2).max(120).optional(),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code'),
  amountMinor: z.string().trim().regex(/^\d+$/, 'Amount must be an integer in minor units'),
  schoolId: uuidLikeSchema.optional(),
  partnerId: uuidLikeSchema.optional(),
});

const grantOpportunityLotBaseSchema = z
  .object({
    description: z.string().trim().min(3).max(4000),
    quantity: z.int().min(1).max(1_000_000),
    minBudgetMinor: z.string().trim().regex(/^\d+$/, 'Minimum budget must be an integer in minor units'),
    maxBudgetMinor: z.string().trim().regex(/^\d+$/, 'Maximum budget must be an integer in minor units'),
  })
  .refine((data) => BigInt(data.minBudgetMinor) <= BigInt(data.maxBudgetMinor), {
    message: 'Maximum budget must be greater than or equal to minimum budget',
    path: ['maxBudgetMinor'],
  });

export const createGrantOpportunityLotSchema = grantOpportunityLotBaseSchema;
export const updateGrantOpportunityLotSchema = grantOpportunityLotBaseSchema;

export const scoreGrantOpportunitySchema = z.object({
  timelineScore: z.int().min(1).max(5),
  amountScore: z.int().min(1).max(5),
  areaScore: z.int().min(1).max(5),
  eligibilityScore: z.int().min(1).max(5),
  readinessScore: z.int().min(1).max(5),
  notes: z.string().trim().max(2000).optional(),
});

export const createGrantApplicationSchema = z.object({
  opportunityId: uuidLikeSchema,
  title: z.string().trim().min(3).max(200).optional(),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code').optional(),
  amountRequestedMinor: z.string().trim().regex(/^\d+$/, 'Amount must be an integer in minor units'),
});

export const createGrantTaskSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
  section: grantTaskDomainSchema.optional(),
  assigneeId: uuidLikeSchema,
  dueDate: plainDateStringSchema.optional(),
});

export const updateGrantTaskSchema = z.object({
  status: grantTaskStatusSchema,
  completionNotes: z.string().trim().max(2000).optional(),
});

export const reviewGrantTaskSchema = z.object({
  decision: grantTaskReviewDecisionSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const updateGrantTaskDetailsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
  section: grantTaskDomainSchema.optional(),
  assigneeId: uuidLikeSchema,
  dueDate: plainDateStringSchema.optional(),
});

export const upsertGrantApprovalSchema = z.object({
  approvalType: grantApprovalTypeSchema,
  status: grantApprovalStatusSchema,
  notes: z.string().trim().max(2000).optional(),
});

export const submitGrantApplicationSchema = z.object({
  confirmationReference: z.string().trim().max(200).optional(),
  proofUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.length === 0 || /^https?:\/\/\S+$/i.test(value), 'Proof URL must start with http:// or https://')
    .optional(),
  packageVersion: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(3000).optional(),
});

const grantFunderContactSchema = z.object({
  name: z.string().trim().min(2).max(140),
  email: z.email().trim().toLowerCase().optional(),
  phone: z.string().trim().min(7).max(24).optional(),
  role: z.string().trim().max(120).optional(),
  isPrimary: z.boolean().optional(),
});

const grantFunderBaseSchema = z.object({
  name: z.string().trim().min(2).max(200),
  type: grantFunderTypeSchema.optional(),
  website: grantUrlSchema.optional(),
  country: z.string().trim().min(2).max(120).optional(),
  hqCity: z.string().trim().min(2).max(120).optional(),
  focusAreas: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
  typicalMinAmountMinor: minorAmountStringSchema.optional(),
  typicalMaxAmountMinor: minorAmountStringSchema.optional(),
  currencyCode: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code').optional(),
  applicationUrl: grantUrlSchema.optional(),
  contact: grantFunderContactSchema.optional(),
});

export const createGrantFunderSchema = grantFunderBaseSchema.extend({
  type: grantFunderTypeSchema.default('OTHER'),
});

export const updateGrantFunderSchema = grantFunderBaseSchema
  .partial()
  .extend({
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const createGrantSourceSettingSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z][A-Z0-9_]{1,31}$/, 'Code must be uppercase letters, numbers, or underscores'),
  label: z.string().trim().min(2).max(100),
  description: z.string().trim().max(240).optional(),
  sortOrder: z.int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const updateGrantSourceSettingSchema = createGrantSourceSettingSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const createGrantCurrencySettingSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Currency code must be a 3-letter ISO code'),
  label: z.string().trim().min(2).max(100),
  symbol: z.string().trim().max(16).optional(),
  minorUnit: z.int().min(0).max(4).optional(),
  isDefault: z.boolean().optional(),
  sortOrder: z.int().min(0).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export const updateGrantCurrencySettingSchema = createGrantCurrencySettingSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Provide at least one field to update');

export const updateGrantScoringProfileSchema = z
  .object({
    timelineWeight: z.int().min(0).max(100),
    amountWeight: z.int().min(0).max(100),
    areaWeight: z.int().min(0).max(100),
    eligibilityWeight: z.int().min(0).max(100),
    readinessWeight: z.int().min(0).max(100),
  })
  .refine(
    (value) => value.timelineWeight + value.amountWeight + value.areaWeight + value.eligibilityWeight + value.readinessWeight === 100,
    'Scoring weights must add up to 100',
  );
