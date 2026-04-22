ALTER TABLE "programs"
  ADD COLUMN "program_type" TEXT NOT NULL DEFAULT 'FIXED',
  ADD COLUMN "program_category" TEXT NOT NULL DEFAULT 'CAREER',
  ADD COLUMN "themes" JSONB,
  ADD COLUMN "target_age_groups" JSONB,
  ADD COLUMN "geographic_scope" TEXT NOT NULL DEFAULT 'SCHOOL',
  ADD COLUMN "target_counties" JSONB,
  ADD COLUMN "target_countries" JSONB,
  ADD COLUMN "mentor_requirements" JSONB,
  ADD COLUMN "program_format" TEXT NOT NULL DEFAULT 'VIRTUAL',
  ADD COLUMN "session_frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "session_duration_minutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "application_deadline" TIMESTAMPTZ(6),
  ADD COLUMN "rolling_program" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "cohort_length_months" INTEGER,
  ADD COLUMN "max_mentors" INTEGER,
  ADD COLUMN "max_mentees" INTEGER,
  ADD COLUMN "program_status" TEXT NOT NULL DEFAULT 'DRAFT';

UPDATE "programs"
SET "program_status" = CASE
  WHEN "is_active" = true THEN 'ACTIVE'
  ELSE 'ARCHIVED'
END;

CREATE INDEX "programs_program_status_is_active_idx" ON "programs"("program_status", "is_active");
CREATE INDEX "programs_program_category_program_type_idx" ON "programs"("program_category", "program_type");
