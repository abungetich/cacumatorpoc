ALTER TABLE "grant_opportunities"
  ALTER COLUMN "deadline" TYPE TIMESTAMPTZ(6)
  USING ("deadline"::timestamptz);
