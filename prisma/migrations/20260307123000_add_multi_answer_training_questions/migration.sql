DO $$ BEGIN
  CREATE TYPE "MentorTrainingQuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTI_CHOICE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "mentor_training_questions"
ADD COLUMN IF NOT EXISTS "question_type" "MentorTrainingQuestionType" NOT NULL DEFAULT 'SINGLE_CHOICE',
ADD COLUMN IF NOT EXISTS "correct_answers" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "image_url" TEXT;

UPDATE "mentor_training_questions"
SET "correct_answers" = jsonb_build_array("correct_answer")
WHERE (
  "correct_answers" = '[]'::jsonb
  OR "correct_answers" IS NULL
)
AND COALESCE("correct_answer", '') <> '';
