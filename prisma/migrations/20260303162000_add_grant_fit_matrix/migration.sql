-- AlterTable
ALTER TABLE "grant_opportunities"
ADD COLUMN "fit_matrix" JSONB,
ADD COLUMN "scored_by_id" UUID,
ADD COLUMN "scored_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "grant_opportunities_scored_by_id_scored_at_idx" ON "grant_opportunities"("scored_by_id", "scored_at");

-- AddForeignKey
ALTER TABLE "grant_opportunities"
ADD CONSTRAINT "grant_opportunities_scored_by_id_fkey"
FOREIGN KEY ("scored_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
