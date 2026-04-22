ALTER TABLE "mentor_training_module_settings"
ADD COLUMN "module_body" TEXT NOT NULL DEFAULT '',
ADD COLUMN "passing_score" INTEGER NOT NULL DEFAULT 100;

UPDATE "mentor_training_module_settings"
SET "module_body" = "description"
WHERE COALESCE(TRIM("module_body"), '') = '';

CREATE TABLE "mentor_training_questions" (
    "id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "explanation" TEXT,
    "options" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_training_questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mentor_training_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "acknowledged_name" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mentor_training_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "mentor_training_questions_module_id_is_active_sort_order_idx"
ON "mentor_training_questions"("module_id", "is_active", "sort_order");

CREATE INDEX "mentor_training_attempts_module_id_submitted_at_idx"
ON "mentor_training_attempts"("module_id", "submitted_at");

CREATE INDEX "mentor_training_attempts_user_id_module_id_submitted_at_idx"
ON "mentor_training_attempts"("user_id", "module_id", "submitted_at");

ALTER TABLE "mentor_training_questions"
ADD CONSTRAINT "mentor_training_questions_module_id_fkey"
FOREIGN KEY ("module_id") REFERENCES "mentor_training_module_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_training_attempts"
ADD CONSTRAINT "mentor_training_attempts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mentor_training_attempts"
ADD CONSTRAINT "mentor_training_attempts_module_id_fkey"
FOREIGN KEY ("module_id") REFERENCES "mentor_training_module_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
