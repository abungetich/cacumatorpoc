ALTER TABLE "mentor_training_module_settings"
ADD COLUMN "max_attempts" INTEGER;

ALTER TABLE "mentor_consent_settings"
ADD COLUMN "document_body" TEXT NOT NULL DEFAULT '';

UPDATE "mentor_consent_settings"
SET "document_body" = "summary"
WHERE COALESCE(TRIM("document_body"), '') = '';
