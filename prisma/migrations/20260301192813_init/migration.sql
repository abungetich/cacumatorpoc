-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('NGO', 'CORPORATE', 'FOUNDATION', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('PRIMARY', 'SECONDARY', 'COLLEGE', 'UNIVERSITY', 'VOCATIONAL');

-- CreateEnum
CREATE TYPE "SocioEconomicTier" AS ENUM ('LOW', 'LOWER_MIDDLE', 'MIDDLE', 'UPPER_MIDDLE', 'HIGH');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MENTOR', 'MENTEE', 'SCHOOL_ADMIN', 'PLATFORM_ADMIN', 'GUARDIAN', 'PARTNER_ADMIN');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('PRIMARY', 'SECONDARY', 'COLLEGE', 'UNIVERSITY', 'VOCATIONAL');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('FULL_TIME', 'PART_TIME');

-- CreateEnum
CREATE TYPE "MentorBackgroundCheckStatus" AS ENUM ('PENDING', 'CLEARED', 'FAILED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MentorProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MenteeProfileStatus" AS ENUM ('ACTIVE', 'WAITING', 'MATCHED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MentorshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "CheckInFrequency" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "MentorshipOutcome" AS ENUM ('SUCCESSFUL', 'PARTIAL', 'UNSUCCESSFUL');

-- CreateEnum
CREATE TYPE "SessionFormat" AS ENUM ('ONLINE', 'IN_PERSON', 'PHONE');

-- CreateEnum
CREATE TYPE "MentoringFormat" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

-- CreateEnum
CREATE TYPE "SessionAttendanceStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'MISSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ACHIEVED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('MID_TERM', 'END_TERM', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('DATA_PROCESSING', 'PHOTO_RELEASE', 'MENTORSHIP_AGREEMENT', 'SAFEGUARDING');

-- CreateTable
CREATE TABLE "partners" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PartnerType" NOT NULL,
    "contact_person" TEXT NOT NULL,
    "contact_email" TEXT NOT NULL,
    "contact_phone" TEXT,
    "partnership_agreement" JSONB,
    "logo_url" TEXT,
    "website" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "partner_id" UUID,
    "name" TEXT NOT NULL,
    "type" "SchoolType" NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "principal_name" TEXT NOT NULL,
    "principal_email" TEXT NOT NULL,
    "student_population" INTEGER,
    "socio_economic_tier" "SocioEconomicTier",
    "programs_offered" JSONB,
    "accreditation_status" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "role" "UserRole" NOT NULL,
    "school_id" UUID,
    "partner_id" UUID,
    "profile_photo" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "profession" TEXT NOT NULL,
    "employer" TEXT NOT NULL,
    "job_title" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "years_experience" INTEGER NOT NULL,
    "expertise_areas" JSONB NOT NULL,
    "mentoring_formats" JSONB NOT NULL,
    "max_mentees" INTEGER NOT NULL DEFAULT 5,
    "current_mentees" INTEGER NOT NULL DEFAULT 0,
    "availability" JSONB NOT NULL,
    "hours_per_month" INTEGER NOT NULL,
    "motivation" TEXT NOT NULL,
    "background_check_status" "MentorBackgroundCheckStatus" NOT NULL,
    "background_check_date" DATE,
    "background_check_expiry" DATE,
    "background_check_document" TEXT,
    "training_completed" BOOLEAN NOT NULL DEFAULT false,
    "training_completed_date" DATE,
    "safeguarding_agreed" BOOLEAN NOT NULL DEFAULT false,
    "safeguarding_agreed_date" DATE,
    "status" "MentorProfileStatus" NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentee_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "education_level" "EducationLevel" NOT NULL,
    "grade" TEXT,
    "course" TEXT,
    "enrollment_status" "EnrollmentStatus" NOT NULL,
    "interests" JSONB NOT NULL,
    "goals" JSONB,
    "specific_challenges" TEXT,
    "preferred_format" "MentoringFormat" NOT NULL,
    "parent_guardian_name" TEXT,
    "parent_guardian_contact" TEXT,
    "parent_guardian_email" TEXT,
    "parent_guardian_consent" BOOLEAN,
    "parent_guardian_consent_date" DATE,
    "guardian_user_id" UUID,
    "emergency_contact_name" TEXT NOT NULL,
    "emergency_contact_phone" TEXT NOT NULL,
    "special_requirements" TEXT,
    "status" "MenteeProfileStatus" NOT NULL,
    "previous_mentors" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "min_sessions_per_month" INTEGER NOT NULL DEFAULT 2,
    "objectives" JSONB NOT NULL,
    "target_education_levels" JSONB NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentorships" (
    "id" UUID NOT NULL,
    "program_id" UUID NOT NULL,
    "mentor_id" UUID NOT NULL,
    "mentee_id" UUID NOT NULL,
    "status" "MentorshipStatus" NOT NULL,
    "started_at" DATE,
    "scheduled_end_date" DATE NOT NULL,
    "actual_end_date" DATE,
    "pause_reason" TEXT,
    "termination_reason" TEXT,
    "termination_notes" TEXT,
    "outcome" "MentorshipOutcome",
    "outcome_notes" TEXT,
    "last_session_date" DATE,
    "next_scheduled_session" DATE,
    "check_in_frequency" "CheckInFrequency" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "mentorship_id" UUID NOT NULL,
    "scheduled_date" DATE NOT NULL,
    "actual_date" DATE,
    "duration_minutes" INTEGER NOT NULL,
    "format" "SessionFormat" NOT NULL,
    "location" TEXT,
    "meeting_link" TEXT,
    "topics_covered" JSONB NOT NULL,
    "session_notes" TEXT NOT NULL,
    "progress_indicators" JSONB,
    "next_steps" TEXT,
    "attendance_status" "SessionAttendanceStatus" NOT NULL,
    "cancellation_reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "mentorship_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target_date" DATE NOT NULL,
    "status" "GoalStatus" NOT NULL,
    "progress_percentage" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" UUID NOT NULL,
    "mentorship_id" UUID NOT NULL,
    "from_user_id" UUID NOT NULL,
    "to_user_id" UUID NOT NULL,
    "type" "FeedbackType" NOT NULL,
    "rating" INTEGER NOT NULL,
    "strengths" TEXT,
    "areas_for_improvement" TEXT,
    "comments" TEXT,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "agreed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agreed_by_ip" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "expires_at" DATE,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "partners_name_idx" ON "partners"("name");

-- CreateIndex
CREATE INDEX "partners_type_idx" ON "partners"("type");

-- CreateIndex
CREATE INDEX "schools_partner_id_idx" ON "schools"("partner_id");

-- CreateIndex
CREATE INDEX "schools_type_idx" ON "schools"("type");

-- CreateIndex
CREATE INDEX "schools_name_idx" ON "schools"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_school_id_idx" ON "users"("school_id");

-- CreateIndex
CREATE INDEX "users_partner_id_idx" ON "users"("partner_id");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_profiles_user_id_key" ON "mentor_profiles"("user_id");

-- CreateIndex
CREATE INDEX "mentor_profiles_status_idx" ON "mentor_profiles"("status");

-- CreateIndex
CREATE INDEX "mentor_profiles_background_check_status_status_idx" ON "mentor_profiles"("background_check_status", "status");

-- CreateIndex
CREATE INDEX "mentor_profiles_approved_by_idx" ON "mentor_profiles"("approved_by");

-- CreateIndex
CREATE UNIQUE INDEX "mentee_profiles_user_id_key" ON "mentee_profiles"("user_id");

-- CreateIndex
CREATE INDEX "mentee_profiles_school_id_status_idx" ON "mentee_profiles"("school_id", "status");

-- CreateIndex
CREATE INDEX "mentee_profiles_education_level_idx" ON "mentee_profiles"("education_level");

-- CreateIndex
CREATE INDEX "mentee_profiles_guardian_user_id_idx" ON "mentee_profiles"("guardian_user_id");

-- CreateIndex
CREATE INDEX "programs_school_id_is_active_idx" ON "programs"("school_id", "is_active");

-- CreateIndex
CREATE INDEX "programs_start_date_end_date_idx" ON "programs"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "mentorships_status_idx" ON "mentorships"("status");

-- CreateIndex
CREATE INDEX "mentorships_program_id_status_idx" ON "mentorships"("program_id", "status");

-- CreateIndex
CREATE INDEX "mentorships_mentor_id_status_idx" ON "mentorships"("mentor_id", "status");

-- CreateIndex
CREATE INDEX "mentorships_mentee_id_status_idx" ON "mentorships"("mentee_id", "status");

-- CreateIndex
CREATE INDEX "mentorships_next_scheduled_session_idx" ON "mentorships"("next_scheduled_session");

-- CreateIndex
CREATE INDEX "sessions_mentorship_id_scheduled_date_idx" ON "sessions"("mentorship_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "sessions_attendance_status_idx" ON "sessions"("attendance_status");

-- CreateIndex
CREATE INDEX "sessions_created_by_idx" ON "sessions"("created_by");

-- CreateIndex
CREATE INDEX "goals_mentorship_id_status_idx" ON "goals"("mentorship_id", "status");

-- CreateIndex
CREATE INDEX "goals_target_date_idx" ON "goals"("target_date");

-- CreateIndex
CREATE INDEX "feedback_mentorship_id_type_idx" ON "feedback"("mentorship_id", "type");

-- CreateIndex
CREATE INDEX "feedback_to_user_id_idx" ON "feedback"("to_user_id");

-- CreateIndex
CREATE INDEX "feedback_submitted_at_idx" ON "feedback"("submitted_at");

-- CreateIndex
CREATE INDEX "consents_user_id_consent_type_agreed_at_idx" ON "consents"("user_id", "consent_type", "agreed_at");

-- CreateIndex
CREATE INDEX "consents_expires_at_revoked_at_idx" ON "consents"("expires_at", "revoked_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_created_at_idx" ON "audit_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_profiles" ADD CONSTRAINT "mentor_profiles_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentee_profiles" ADD CONSTRAINT "mentee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentee_profiles" ADD CONSTRAINT "mentee_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentee_profiles" ADD CONSTRAINT "mentee_profiles_guardian_user_id_fkey" FOREIGN KEY ("guardian_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_mentorship_id_fkey" FOREIGN KEY ("mentorship_id") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_mentorship_id_fkey" FOREIGN KEY ("mentorship_id") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_mentorship_id_fkey" FOREIGN KEY ("mentorship_id") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Custom safeguarding and business-rule constraints
-- ---------------------------------------------------------------------------
-- Migration notes for constraints that Prisma schema cannot fully express.
-- Apply these in a SQL migration after `prisma migrate` creates base tables.

-- 1) One active mentorship per mentee at a time (configurable default = ON)
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_mentorship_per_mentee
ON mentorships (mentee_id)
WHERE status = 'ACTIVE';

-- Optional: prevent duplicate concurrent active mentor-mentee pair.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_mentor_mentee_pair
ON mentorships (mentor_id, mentee_id)
WHERE status = 'ACTIVE';

-- 2) Numeric range checks
ALTER TABLE goals
  ADD CONSTRAINT goals_progress_percentage_range_chk
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100);

ALTER TABLE feedback
  ADD CONSTRAINT feedback_rating_range_chk
  CHECK (rating >= 1 AND rating <= 5);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_duration_minutes_positive_chk
  CHECK (duration_minutes > 0);

-- 3) Conditional field checks
ALTER TABLE mentorships
  ADD CONSTRAINT mentorship_started_at_required_when_active_chk
  CHECK (status <> 'ACTIVE' OR started_at IS NOT NULL);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_location_required_if_in_person_chk
  CHECK (format <> 'IN_PERSON' OR location IS NOT NULL);

ALTER TABLE sessions
  ADD CONSTRAINT sessions_meeting_link_required_if_online_chk
  CHECK (format <> 'ONLINE' OR meeting_link IS NOT NULL);

-- 4) Mentor gating + capacity enforcement at write time
CREATE OR REPLACE FUNCTION enforce_mentorship_gates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  mentor_profile mentor_profiles%ROWTYPE;
  mentor_user users%ROWTYPE;
  mentee_user users%ROWTYPE;
  active_count integer;
BEGIN
  IF NEW.status = 'ACTIVE' THEN
    SELECT * INTO mentor_profile FROM mentor_profiles WHERE user_id = NEW.mentor_id;
    IF mentor_profile.id IS NULL THEN
      RAISE EXCEPTION 'Mentor profile missing for mentor_id=%', NEW.mentor_id;
    END IF;

    IF mentor_profile.status <> 'APPROVED' OR mentor_profile.background_check_status <> 'CLEARED' THEN
      RAISE EXCEPTION 'Mentor is not approved/cleared for activation';
    END IF;

    SELECT * INTO mentor_user FROM users WHERE id = NEW.mentor_id;
    SELECT * INTO mentee_user FROM users WHERE id = NEW.mentee_id;

    IF mentor_user.role <> 'MENTOR' OR mentor_user.is_active = false THEN
      RAISE EXCEPTION 'Mentor user role or active status invalid';
    END IF;

    IF mentee_user.role <> 'MENTEE' OR mentee_user.is_active = false THEN
      RAISE EXCEPTION 'Mentee user role or active status invalid';
    END IF;

    SELECT count(*) INTO active_count
    FROM mentorships m
    WHERE m.mentor_id = NEW.mentor_id
      AND m.status = 'ACTIVE'
      AND m.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000');

    IF active_count >= mentor_profile.max_mentees THEN
      RAISE EXCEPTION 'Mentor capacity exceeded (max_mentees=%)', mentor_profile.max_mentees;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_mentorship_gates ON mentorships;
CREATE TRIGGER trg_enforce_mentorship_gates
BEFORE INSERT OR UPDATE OF status, mentor_id, mentee_id
ON mentorships
FOR EACH ROW
EXECUTE FUNCTION enforce_mentorship_gates();

-- 5) Keep mentor_profiles.current_mentees in sync
CREATE OR REPLACE FUNCTION refresh_current_mentees_for_mentor(p_mentor_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE mentor_profiles mp
  SET current_mentees = (
    SELECT count(*)
    FROM mentorships m
    WHERE m.mentor_id = p_mentor_id
      AND m.status = 'ACTIVE'
  )
  WHERE mp.user_id = p_mentor_id;
END;
$$;

CREATE OR REPLACE FUNCTION sync_current_mentees_trigger()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_current_mentees_for_mentor(OLD.mentor_id);
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM refresh_current_mentees_for_mentor(OLD.mentor_id);
    PERFORM refresh_current_mentees_for_mentor(NEW.mentor_id);
    RETURN NEW;
  END IF;

  PERFORM refresh_current_mentees_for_mentor(NEW.mentor_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_current_mentees ON mentorships;
CREATE TRIGGER trg_sync_current_mentees
AFTER INSERT OR UPDATE OR DELETE
ON mentorships
FOR EACH ROW
EXECUTE FUNCTION sync_current_mentees_trigger();

-- 6) Consent gate reminder
-- Enforce consent validity in service layer for flexibility across jurisdictions,
-- or add a trigger that checks non-revoked, non-expired consent records before
-- allowing ACTIVE mentorship status.
