CREATE TYPE "MentorOnboardingStage" AS ENUM (
  'SIGNUP',
  'EMAIL_VERIFIED',
  'PROFILE_CREATED',
  'INTERESTS_SELECTED',
  'TRAINING_COMPLETED',
  'CONSENT_SIGNED',
  'BACKGROUND_CHECK_PENDING',
  'APPROVED',
  'PROGRAM_ELIGIBLE',
  'MATCHING',
  'ACTIVE',
  'ALUMNI'
);

CREATE TYPE "MentorProgramApplicationStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'WAITLISTED',
  'REJECTED',
  'WITHDRAWN'
);

CREATE TABLE "mentor_onboarding" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "current_stage" "MentorOnboardingStage" NOT NULL DEFAULT 'SIGNUP',
  "profile_completion_percentage" INTEGER NOT NULL DEFAULT 0,
  "email_verified_at" TIMESTAMPTZ(6),
  "profile_completed_at" TIMESTAMPTZ(6),
  "interests_completed_at" TIMESTAMPTZ(6),
  "training_completed_at" TIMESTAMPTZ(6),
  "consent_signed_at" TIMESTAMPTZ(6),
  "background_screening_status" TEXT,
  "approved_at" TIMESTAMPTZ(6),
  "rejected_at" TIMESTAMPTZ(6),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_onboarding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mentor_program_applications" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mentor_user_id" UUID NOT NULL,
  "program_id" UUID NOT NULL,
  "status" "MentorProgramApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "availability_notes" TEXT NOT NULL,
  "interest_areas" JSONB NOT NULL,
  "commitment_hours_per_month" INTEGER NOT NULL,
  "application_note" TEXT,
  "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ(6),
  "reviewed_by_id" UUID,
  "review_notes" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentor_program_applications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mentor_onboarding_user_id_key" ON "mentor_onboarding"("user_id");
CREATE INDEX "mentor_onboarding_current_stage_idx" ON "mentor_onboarding"("current_stage");

CREATE UNIQUE INDEX "mentor_program_applications_mentor_user_id_program_id_key"
  ON "mentor_program_applications"("mentor_user_id", "program_id");
CREATE INDEX "mentor_program_applications_status_applied_at_idx"
  ON "mentor_program_applications"("status", "applied_at");
CREATE INDEX "mentor_program_applications_program_id_status_idx"
  ON "mentor_program_applications"("program_id", "status");

ALTER TABLE "mentor_onboarding"
  ADD CONSTRAINT "mentor_onboarding_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_program_applications"
  ADD CONSTRAINT "mentor_program_applications_mentor_user_id_fkey"
  FOREIGN KEY ("mentor_user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_program_applications"
  ADD CONSTRAINT "mentor_program_applications_program_id_fkey"
  FOREIGN KEY ("program_id") REFERENCES "programs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_program_applications"
  ADD CONSTRAINT "mentor_program_applications_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
