CREATE TYPE "OrganizationType" AS ENUM ('CORPORATE', 'NGO', 'FOUNDATION', 'GOVERNMENT', 'ALUMNI', 'ASSOCIATION', 'COMMUNITY', 'FAITH_BASED', 'OTHER');
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'INACTIVE');
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('ADMIN', 'COORDINATOR', 'MEMBER', 'SUPPORT_LEAD', 'VIEWER');
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('INVITED', 'PENDING', 'ACTIVE', 'SUSPENDED', 'LEFT');

CREATE TABLE "organizations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "partner_id" UUID,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "OrganizationType" NOT NULL,
  "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "registration_number" TEXT,
  "website" TEXT,
  "logo_url" TEXT,
  "description" TEXT,
  "mission" TEXT,
  "country" TEXT NOT NULL,
  "county" TEXT,
  "city" TEXT,
  "address" TEXT,
  "contact_email" TEXT NOT NULL,
  "contact_phone" TEXT,
  "primary_contact_name" TEXT NOT NULL,
  "primary_contact_title" TEXT,
  "admin_first_name" TEXT NOT NULL,
  "admin_last_name" TEXT NOT NULL,
  "admin_email" TEXT NOT NULL,
  "admin_phone" TEXT NOT NULL,
  "admin_title" TEXT,
  "mentor_participation" BOOLEAN NOT NULL DEFAULT true,
  "financial_support" BOOLEAN NOT NULL DEFAULT false,
  "in_kind_support" BOOLEAN NOT NULL DEFAULT false,
  "schools_of_interest" JSONB,
  "public_profile_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'MEMBER',
  "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'PENDING',
  "title" TEXT,
  "department" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_agreements" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "agreed_by_name" TEXT NOT NULL,
  "agreed_by_email" TEXT NOT NULL,
  "agreed_at" TIMESTAMPTZ(6) NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "organization_agreements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");
CREATE INDEX "organizations_partner_id_idx" ON "organizations"("partner_id");
CREATE INDEX "organizations_status_idx" ON "organizations"("status");
CREATE INDEX "organizations_name_idx" ON "organizations"("name");
CREATE INDEX "organizations_admin_email_idx" ON "organizations"("admin_email");
CREATE UNIQUE INDEX "organization_memberships_organization_id_user_id_key" ON "organization_memberships"("organization_id", "user_id");
CREATE INDEX "organization_memberships_organization_id_status_idx" ON "organization_memberships"("organization_id", "status");
CREATE INDEX "organization_memberships_user_id_status_idx" ON "organization_memberships"("user_id", "status");
CREATE INDEX "organization_agreements_organization_id_code_idx" ON "organization_agreements"("organization_id", "code");

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "organization_memberships"
  ADD CONSTRAINT "organization_memberships_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_memberships"
  ADD CONSTRAINT "organization_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "organization_agreements"
  ADD CONSTRAINT "organization_agreements_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
