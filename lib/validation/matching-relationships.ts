import { z } from 'zod';

import { menteeEducationLevelSchema, plainDateStringSchema, uuidLikeSchema, dateStringSchema } from '@/lib/validation/shared';

export const createMenteeSchema = z
  .object({
    name: z.string().trim().min(3, 'Name is required').max(140),
    email: z.email('Enter a valid email').trim().toLowerCase(),
    phone: z.string().trim().min(7, 'Enter a valid phone number').max(24),
    dateOfBirth: dateStringSchema,
    school: z.string().trim().min(2).max(200).optional(),
    schoolId: uuidLikeSchema.optional(),
    educationLevel: z
      .union([
        menteeEducationLevelSchema,
        z.enum(['Primary', 'Secondary', 'College', 'University', 'Vocational']),
      ])
      .default('SECONDARY'),
  })
  .refine((data) => Boolean(data.schoolId || data.school), {
    message: 'Provide school name or school ID',
    path: ['school'],
  });

export const menteeIntakeActionSchema = z.enum([
  'APPROVE_FOR_MATCHING',
  'MARK_MATCHED',
  'ACTIVATE',
  'DEACTIVATE',
  'REOPEN_WAITING',
]);

export const menteeIntakeTransitionSchema = z.object({
  action: menteeIntakeActionSchema,
  reason: z.string().trim().max(500).optional(),
});

export const createMatchProposalSchema = z.object({
  programId: uuidLikeSchema,
  mentorUserId: uuidLikeSchema,
  menteeUserId: uuidLikeSchema,
  checkInFrequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
});

export const respondToProposalSchema = z.object({
  decision: z.enum(['ACCEPT', 'DECLINE']),
  category: z.enum(['AVAILABILITY', 'FORMAT', 'FIT', 'CONTEXT', 'OTHER']).optional(),
  reason: z.string().trim().max(500).optional(),
}).refine((data) => {
  if (data.decision !== 'DECLINE') {
    return true;
  }
  return Boolean(data.category);
}, 'Decline category is required');

export const matchingSettingsSchema = z
  .object({
    interestsWeight: z.int().min(0).max(100),
    contextWeight: z.int().min(0).max(100),
    availabilityWeight: z.int().min(0).max(100),
    formatWeight: z.int().min(0).max(100),
    capacityWeight: z.int().min(0).max(100),
    penalizeNearCapacity: z.boolean(),
    nearCapacityPenalty: z.int().min(0).max(100),
    penalizeLowAvailability: z.boolean(),
    lowAvailabilityPenalty: z.int().min(0).max(100),
    penalizeWeakContext: z.boolean(),
    weakContextPenalty: z.int().min(0).max(100),
    penalizePriorDecline: z.boolean(),
    priorDeclinePenalty: z.int().min(0).max(100),
    excludePriorDeclinedPair: z.boolean(),
    maxOpenMentorshipsPerMentee: z.int().min(1).max(20),
    availabilityDeclinePenalty: z.int().min(0).max(100),
    formatDeclinePenalty: z.int().min(0).max(100),
    fitDeclinePenalty: z.int().min(0).max(100),
    contextDeclinePenalty: z.int().min(0).max(100),
    otherDeclinePenalty: z.int().min(0).max(100),
  })
  .refine((data) => {
    const total =
      data.interestsWeight +
      data.contextWeight +
      data.availabilityWeight +
      data.formatWeight +
      data.capacityWeight;
    return total === 100;
  }, 'Match weights must total 100');

export const relationshipStatusSchema = z.enum(['PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TERMINATED']);

export const relationshipRiskSchema = z.enum(['ALL', 'AT_RISK', 'ON_TRACK', 'REVIEW_DUE']);

export const relationshipStatusTransitionSchema = z.object({
  action: z.enum(['PAUSE', 'RESUME', 'COMPLETE', 'TERMINATE']),
  reason: z.string().trim().min(5).max(500).optional(),
  outcome: z.enum(['SUCCESSFUL', 'PARTIAL', 'UNSUCCESSFUL']).optional(),
});

export const relationshipSessionLogSchema = z
  .object({
    scheduledDate: plainDateStringSchema,
    actualDate: plainDateStringSchema.optional(),
    durationMinutes: z.int().min(15).max(240),
    format: z.enum(['ONLINE', 'IN_PERSON', 'PHONE']),
    location: z.string().trim().max(200).optional(),
    meetingLink: z.string().trim().max(500).optional(),
    topicsCovered: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
    sessionNotes: z.string().trim().min(5).max(3000),
    attendanceStatus: z.enum(['SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED']).default('COMPLETED'),
    nextScheduledSession: plainDateStringSchema.optional(),
  })
  .refine((data) => {
    if (data.format !== 'IN_PERSON') {
      return true;
    }
    return Boolean(data.location?.trim());
  }, 'Location is required for in-person sessions')
  .refine((data) => {
    if (data.format !== 'ONLINE') {
      return true;
    }
    return Boolean(data.meetingLink?.trim());
  }, 'Meeting link is required for online sessions');

export const relationshipReviewSchema = z.object({
  type: z.enum(['MID_TERM', 'END_TERM', 'MONTHLY']),
  rating: z.int().min(1).max(5),
  strengths: z.string().trim().max(2000).optional(),
  areasForImprovement: z.string().trim().max(2000).optional(),
  comments: z.string().trim().max(2000).optional(),
  isAnonymous: z.boolean().optional(),
});

export function normalizeEducationLevel(value: z.infer<typeof createMenteeSchema>['educationLevel']) {
  return value.toUpperCase() as z.infer<typeof menteeEducationLevelSchema>;
}
