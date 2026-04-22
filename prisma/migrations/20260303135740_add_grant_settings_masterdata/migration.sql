-- CreateEnum
CREATE TYPE "GrantFunderType" AS ENUM ('FOUNDATION', 'GOVERNMENT', 'CORPORATE', 'NGO', 'MULTILATERAL', 'OTHER');

-- AlterTable
ALTER TABLE "grant_opportunities" ADD COLUMN     "funder_id" UUID;

-- CreateTable
CREATE TABLE "grant_funders" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GrantFunderType" NOT NULL DEFAULT 'OTHER',
    "website" TEXT,
    "country" TEXT,
    "hq_city" TEXT,
    "focus_areas" JSONB,
    "typical_min_amount_minor" BIGINT,
    "typical_max_amount_minor" BIGINT,
    "currency_code" VARCHAR(3),
    "application_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_funders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_funder_contacts" (
    "id" UUID NOT NULL,
    "funder_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_funder_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_source_settings" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_source_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_currency_settings" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "label" TEXT NOT NULL,
    "symbol" TEXT,
    "minor_unit" INTEGER NOT NULL DEFAULT 2,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_currency_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_scoring_profiles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "timeline_weight" INTEGER NOT NULL DEFAULT 20,
    "amount_weight" INTEGER NOT NULL DEFAULT 20,
    "area_weight" INTEGER NOT NULL DEFAULT 30,
    "eligibility_weight" INTEGER NOT NULL DEFAULT 20,
    "readiness_weight" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_scoring_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grant_funders_name_key" ON "grant_funders"("name");

-- CreateIndex
CREATE INDEX "grant_funders_type_is_active_idx" ON "grant_funders"("type", "is_active");

-- CreateIndex
CREATE INDEX "grant_funders_country_is_active_idx" ON "grant_funders"("country", "is_active");

-- CreateIndex
CREATE INDEX "grant_funder_contacts_funder_id_is_active_idx" ON "grant_funder_contacts"("funder_id", "is_active");

-- CreateIndex
CREATE INDEX "grant_funder_contacts_email_idx" ON "grant_funder_contacts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "grant_source_settings_code_key" ON "grant_source_settings"("code");

-- CreateIndex
CREATE INDEX "grant_source_settings_is_active_sort_order_idx" ON "grant_source_settings"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "grant_currency_settings_code_key" ON "grant_currency_settings"("code");

-- CreateIndex
CREATE INDEX "grant_currency_settings_is_active_sort_order_idx" ON "grant_currency_settings"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "grant_currency_settings_is_default_idx" ON "grant_currency_settings"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "uq_grant_currency_single_default" ON "grant_currency_settings"("is_default") WHERE "is_default";

-- CreateIndex
CREATE INDEX "grant_scoring_profiles_is_active_idx" ON "grant_scoring_profiles"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "uq_grant_scoring_single_active" ON "grant_scoring_profiles"("is_active") WHERE "is_active";

-- CreateIndex
CREATE INDEX "grant_opportunities_funder_id_status_idx" ON "grant_opportunities"("funder_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_grant_funder_primary_contact" ON "grant_funder_contacts"("funder_id") WHERE ("is_primary" AND "is_active");

-- AddForeignKey
ALTER TABLE "grant_funder_contacts" ADD CONSTRAINT "grant_funder_contacts_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "grant_funders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_opportunities" ADD CONSTRAINT "grant_opportunities_funder_id_fkey" FOREIGN KEY ("funder_id") REFERENCES "grant_funders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed defaults for configurable grant master data
INSERT INTO "grant_source_settings" ("id", "code", "label", "description", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'TEAM', 'Team Referral', 'Opportunity shared by internal team members.', 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'BOARD', 'Board Referral', 'Opportunity sourced from board contacts.', 20, true, NOW(), NOW()),
  (gen_random_uuid(), 'WEBSITE', 'Website', 'Posted publicly on a website.', 30, true, NOW(), NOW()),
  (gen_random_uuid(), 'LINKEDIN', 'LinkedIn', 'Found via LinkedIn posts or messages.', 40, true, NOW(), NOW()),
  (gen_random_uuid(), 'EMAIL', 'Email', 'Received via email outreach or list.', 50, true, NOW(), NOW()),
  (gen_random_uuid(), 'REFERRAL', 'External Referral', 'Shared by an external partner or network.', 60, true, NOW(), NOW()),
  (gen_random_uuid(), 'OTHER', 'Other', 'Any source not covered above.', 70, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "grant_currency_settings" ("id", "code", "label", "symbol", "minor_unit", "is_default", "sort_order", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'USD', 'US Dollar', '$', 2, true, 10, true, NOW(), NOW()),
  (gen_random_uuid(), 'KES', 'Kenyan Shilling', 'KSh', 2, false, 20, true, NOW(), NOW()),
  (gen_random_uuid(), 'EUR', 'Euro', 'EUR', 2, false, 30, true, NOW(), NOW()),
  (gen_random_uuid(), 'GBP', 'British Pound', 'GBP', 2, false, 40, true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "grant_scoring_profiles" (
  "id",
  "name",
  "timeline_weight",
  "amount_weight",
  "area_weight",
  "eligibility_weight",
  "readiness_weight",
  "is_active",
  "created_at",
  "updated_at"
)
VALUES (
  gen_random_uuid(),
  'Default Weighted Matrix',
  20,
  20,
  30,
  20,
  10,
  true,
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;
