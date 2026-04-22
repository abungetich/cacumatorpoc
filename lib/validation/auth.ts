import { z } from 'zod';

import { appRoleSchema, dateStringSchema } from '@/lib/validation/shared';

export const credentialsSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  timeZone: z.string().trim().min(2).max(100).optional(),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.email('Enter a valid email').trim().toLowerCase(),
});

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required').max(80),
  lastName: z.string().trim().min(2, 'Last name is required').max(80),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: appRoleSchema,
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(24).optional(),
  dateOfBirth: dateStringSchema.optional(),
  timeZone: z.string().trim().min(2).max(100).optional(),
  organizationSlug: z
    .string()
    .trim()
    .min(2, 'Select a valid organization')
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Select a valid organization')
    .optional(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().trim().min(2, 'First name is required').max(80),
  middleName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().min(2, 'Surname is required').max(80),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(24),
  email: z.email('Enter a valid email').trim().toLowerCase(),
  dateOfBirth: dateStringSchema,
  timeZone: z.string().trim().min(2, 'Timezone is required').max(100),
  profilePhoto: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.length === 0 || value.startsWith('/uploads/profiles/'), 'Invalid profile photo path')
    .optional(),
});

export const profilePasswordUpdateSchema = z
  .object({
    currentPassword: z.string().min(8, 'Current password is required').max(128),
    newPassword: z.string().min(8, 'New password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: 'New password and confirm password must match',
    path: ['confirmPassword'],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export const profilePhotoUploadSchema = z.object({
  profilePhoto: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value.startsWith('/uploads/profiles/'), 'Invalid profile photo path'),
});

export const passwordResetSchema = z
  .object({
    token: z.string().trim().min(12, 'Reset token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Password and confirm password must match',
    path: ['confirmPassword'],
  });
