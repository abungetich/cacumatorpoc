ALTER TABLE "programs"
  ALTER COLUMN "school_id" DROP NOT NULL;

ALTER TABLE "programs"
  ADD COLUMN IF NOT EXISTS "target_school_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "programs"
  DROP CONSTRAINT IF EXISTS "programs_school_id_fkey";

ALTER TABLE "programs"
  ADD CONSTRAINT "programs_school_id_fkey"
  FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
