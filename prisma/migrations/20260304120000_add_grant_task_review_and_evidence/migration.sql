-- CreateEnum
CREATE TYPE "GrantTaskReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REWORK_REQUIRED');

-- AlterTable
ALTER TABLE "grant_tasks"
ADD COLUMN "review_status" "GrantTaskReviewStatus",
ADD COLUMN "reviewed_by_id" UUID,
ADD COLUMN "reviewed_at" TIMESTAMPTZ(6),
ADD COLUMN "review_notes" TEXT,
ADD COLUMN "evidence_url" TEXT,
ADD COLUMN "evidence_name" TEXT,
ADD COLUMN "evidence_mime" TEXT,
ADD COLUMN "evidence_size" INTEGER;

-- CreateIndex
CREATE INDEX "grant_tasks_review_status_reviewed_at_idx" ON "grant_tasks"("review_status", "reviewed_at");

-- CreateIndex
CREATE INDEX "grant_tasks_reviewed_by_id_idx" ON "grant_tasks"("reviewed_by_id");

-- AddForeignKey
ALTER TABLE "grant_tasks"
ADD CONSTRAINT "grant_tasks_reviewed_by_id_fkey"
FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
