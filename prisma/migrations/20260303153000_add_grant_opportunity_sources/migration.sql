-- CreateEnum
CREATE TYPE "GrantSourceType" AS ENUM ('TEAM', 'BOARD', 'WEBSITE', 'LINKEDIN', 'EMAIL', 'REFERRAL', 'OTHER');

-- AlterTable
ALTER TABLE "grant_opportunities"
ADD COLUMN "source_type" "GrantSourceType",
ADD COLUMN "source_reference" TEXT,
ADD COLUMN "attachment_url" TEXT,
ADD COLUMN "attachment_name" TEXT,
ADD COLUMN "attachment_mime" TEXT,
ADD COLUMN "attachment_size" INTEGER;
