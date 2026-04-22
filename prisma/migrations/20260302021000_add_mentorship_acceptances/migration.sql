-- CreateTable
CREATE TABLE "mentorship_acceptances" (
    "id" UUID NOT NULL,
    "mentorship_id" UUID NOT NULL,
    "mentor_accepted" BOOLEAN NOT NULL DEFAULT false,
    "mentor_responded_at" TIMESTAMPTZ(6),
    "mentee_accepted" BOOLEAN NOT NULL DEFAULT false,
    "mentee_responded_at" TIMESTAMPTZ(6),
    "declined_by_user_id" UUID,
    "decline_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentorship_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentorship_acceptances_mentorship_id_key" ON "mentorship_acceptances"("mentorship_id");

-- CreateIndex
CREATE INDEX "mentorship_acceptances_mentor_accepted_mentee_accepted_idx" ON "mentorship_acceptances"("mentor_accepted", "mentee_accepted");

-- CreateIndex
CREATE INDEX "mentorship_acceptances_declined_by_user_id_idx" ON "mentorship_acceptances"("declined_by_user_id");

-- AddForeignKey
ALTER TABLE "mentorship_acceptances" ADD CONSTRAINT "mentorship_acceptances_mentorship_id_fkey" FOREIGN KEY ("mentorship_id") REFERENCES "mentorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentorship_acceptances" ADD CONSTRAINT "mentorship_acceptances_declined_by_user_id_fkey" FOREIGN KEY ("declined_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
