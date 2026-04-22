import { z } from 'zod';

import { uuidLikeSchema } from '@/lib/validation/shared';

export const createIncidentSchema = z.object({
  subject: z.string().trim().min(3, 'Subject is required').max(160),
  summary: z.string().trim().min(10, 'Summary must be at least 10 characters').max(2000),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  immediateAction: z.string().trim().min(3, 'Immediate action is required').max(1000),
  mentorshipId: uuidLikeSchema.optional(),
});

export const mentorEngineActionSchema = z.enum([
  'BACKGROUND_CLEAR',
  'BACKGROUND_FAIL',
  'COMPLETE_TRAINING',
  'AGREE_SAFEGUARDING',
  'SUBMIT_FOR_REVIEW',
  'APPROVE',
  'REJECT',
  'DEACTIVATE',
  'REACTIVATE',
]);

export const mentorTransitionSchema = z.object({
  action: mentorEngineActionSchema,
  reason: z.string().trim().max(500).optional(),
  details: z
    .object({
      effectiveAt: z.string().datetime().optional(),
      expiryDate: z.string().datetime().optional(),
      evidenceUrl: z.string().trim().url().max(1000).optional(),
      agreementVersion: z.string().trim().max(120).optional(),
      trainingName: z.string().trim().max(160).optional(),
    })
    .optional(),
});

export const mentorNoteSchema = z.object({
  message: z.string().trim().min(3, 'Message must be at least 3 characters').max(1000),
});

export const verificationSettingsSchema = z.object({
  autoReminderEnabled: z.boolean(),
  resendIntervalHours: z.int().min(1).max(168),
  maxReminders: z.int().min(0).max(10),
});

export const verificationTestEmailSchema = z.object({
  email: z.email('Enter a valid email address'),
});

export const mentorTrainingQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(120).optional(),
    prompt: z.string().trim().min(10, 'Question prompt must be at least 10 characters').max(2000),
    explanation: z.string().trim().max(2000).optional(),
    questionType: z.enum(['SINGLE_CHOICE', 'MULTI_CHOICE']).default('SINGLE_CHOICE'),
    options: z.array(z.string().trim().min(1).max(200)).min(2, 'Add at least two answer options').max(6),
    correctAnswers: z.array(z.string().trim().min(1).max(200)).min(1, 'Choose at least one correct answer').max(6),
    imageUrl: z.string().trim().max(1000).optional(),
    sortOrder: z.int().min(0).max(999).default(0),
    isActive: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const normalizedOptions = data.options.map((option) => option.trim());
    const uniqueOptions = new Set(normalizedOptions);
    if (uniqueOptions.size !== normalizedOptions.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['options'], message: 'Answer options must be unique' });
    }
    const normalizedCorrectAnswers = data.correctAnswers.map((answer) => answer.trim());
    const uniqueCorrectAnswers = new Set(normalizedCorrectAnswers);
    if (uniqueCorrectAnswers.size !== normalizedCorrectAnswers.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Correct answers must be unique' });
    }
    for (const answer of normalizedCorrectAnswers) {
      if (!normalizedOptions.includes(answer)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Correct answers must match one of the answer options' });
        break;
      }
    }
    if (data.questionType === 'SINGLE_CHOICE' && normalizedCorrectAnswers.length !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Single-choice questions must have exactly one correct answer' });
    }
    if (data.questionType === 'MULTI_CHOICE' && normalizedCorrectAnswers.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['correctAnswers'], message: 'Multi-choice questions must have at least two correct answers' });
    }
  });

export const mentorTrainingModuleSettingSchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(160),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(3000),
  moduleBody: z.string().trim().min(20, 'Training content must be at least 20 characters').max(20000),
  version: z.string().trim().min(1, 'Version is required').max(40),
  required: z.boolean(),
  passingScore: z.int().min(1).max(100).default(100),
  maxAttempts: z.int().min(1).max(20).nullable().optional(),
  estimatedMinutes: z.int().min(1).max(480).nullable().optional(),
  sortOrder: z.int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
  questions: z.array(mentorTrainingQuestionSchema).min(1, 'Add at least one quiz question'),
});

export const mentorConsentSettingSchema = z.object({
  title: z.string().trim().min(3, 'Title is required').max(160),
  consentType: z.enum(['DATA_PROCESSING', 'PHOTO_RELEASE', 'MENTORSHIP_AGREEMENT', 'SAFEGUARDING']),
  version: z.string().trim().min(1, 'Version is required').max(40),
  summary: z.string().trim().min(10, 'Summary must be at least 10 characters').max(3000),
  documentBody: z.string().trim().min(20, 'Document body must be at least 20 characters').max(30000),
  documentUrl: z
    .string()
    .trim()
    .min(1, 'Document URL is required')
    .max(1000)
    .refine((value) => /^https?:\/\/\S+$/i.test(value), 'Document URL must start with http:// or https://'),
  required: z.boolean(),
  sortOrder: z.int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const mentorTrainingCompletionSchema = z.object({
  acknowledgedName: z.string().trim().min(3, 'Enter your full name').max(160),
  confirmed: z.boolean().refine((value) => value === true, 'You must confirm completion before continuing'),
  reachedEnd: z.boolean().refine((value) => value === true, 'Read the full module before continuing'),
  notes: z.string().trim().max(1000).optional(),
  answers: z
    .array(
      z.object({
        questionId: uuidLikeSchema,
        selectedOptions: z.array(z.string().trim().min(1).max(200)).min(1).max(6),
      }),
    )
    .min(1, 'Answer all quiz questions before submitting'),
});

const mentorConsentBaseSchema = z.object({
  acknowledgedName: z.string().trim().min(3, 'Enter your full name').max(160),
  confirmed: z.boolean().refine((value) => value === true, 'You must confirm your response before continuing'),
  reachedEnd: z.boolean().refine((value) => value === true, 'Read the full document before continuing'),
});

export const mentorConsentAssentSchema = z.discriminatedUnion('action', [
  mentorConsentBaseSchema.extend({
    action: z.literal('ASSENT'),
    evidenceUrl: z
      .string()
      .trim()
      .max(1000)
      .refine((value) => value.length === 0 || value.startsWith('/uploads/mentor-compliance/consents/'), 'Invalid safeguarding evidence path')
      .optional(),
  }),
  mentorConsentBaseSchema.extend({
    action: z.literal('DECLINE'),
    reason: z.string().trim().max(1000).optional(),
  }),
]);
