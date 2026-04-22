-- CreateEnum
CREATE TYPE "GrantOpportunityStatus" AS ENUM ('DISCOVERED', 'QUALIFYING', 'PURSUING', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GrantApplicationStage" AS ENUM ('DISCOVERY', 'APPROVAL', 'WRITING', 'SUBMISSION', 'SUBMITTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GrantTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "GrantApprovalType" AS ENUM ('PURSUE', 'BUDGET', 'FINAL_SUBMISSION');

-- CreateEnum
CREATE TYPE "GrantApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "grant_opportunities" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "funder_name" TEXT NOT NULL,
    "description" TEXT,
    "source_url" TEXT,
    "deadline" DATE NOT NULL,
    "status" "GrantOpportunityStatus" NOT NULL DEFAULT 'DISCOVERED',
    "fit_score" INTEGER,
    "country" TEXT,
    "currency_code" VARCHAR(3) NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "school_id" UUID,
    "partner_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_applications" (
    "id" UUID NOT NULL,
    "opportunity_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "stage" "GrantApplicationStage" NOT NULL DEFAULT 'DISCOVERY',
    "currency_code" VARCHAR(3) NOT NULL,
    "amount_requested_minor" BIGINT NOT NULL,
    "school_id" UUID,
    "partner_id" UUID,
    "created_by_id" UUID NOT NULL,
    "submitted_by_id" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_tasks" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "section" TEXT,
    "assignee_id" UUID,
    "status" "GrantTaskStatus" NOT NULL DEFAULT 'TODO',
    "due_date" DATE,
    "completed_at" TIMESTAMPTZ(6),
    "completion_notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_approvals" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "approval_type" "GrantApprovalType" NOT NULL,
    "status" "GrantApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(6),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grant_submissions" (
    "id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmation_reference" TEXT,
    "proof_url" TEXT,
    "package_version" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "grant_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grant_opportunities_status_deadline_idx" ON "grant_opportunities"("status", "deadline");

-- CreateIndex
CREATE INDEX "grant_opportunities_school_id_status_idx" ON "grant_opportunities"("school_id", "status");

-- CreateIndex
CREATE INDEX "grant_opportunities_partner_id_status_idx" ON "grant_opportunities"("partner_id", "status");

-- CreateIndex
CREATE INDEX "grant_opportunities_created_by_id_created_at_idx" ON "grant_opportunities"("created_by_id", "created_at");

-- CreateIndex
CREATE INDEX "grant_applications_stage_created_at_idx" ON "grant_applications"("stage", "created_at");

-- CreateIndex
CREATE INDEX "grant_applications_school_id_stage_idx" ON "grant_applications"("school_id", "stage");

-- CreateIndex
CREATE INDEX "grant_applications_partner_id_stage_idx" ON "grant_applications"("partner_id", "stage");

-- CreateIndex
CREATE INDEX "grant_applications_opportunity_id_idx" ON "grant_applications"("opportunity_id");

-- CreateIndex
CREATE INDEX "grant_applications_created_by_id_idx" ON "grant_applications"("created_by_id");

-- CreateIndex
CREATE INDEX "grant_tasks_application_id_status_idx" ON "grant_tasks"("application_id", "status");

-- CreateIndex
CREATE INDEX "grant_tasks_assignee_id_status_idx" ON "grant_tasks"("assignee_id", "status");

-- CreateIndex
CREATE INDEX "grant_tasks_due_date_idx" ON "grant_tasks"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "grant_approvals_application_id_approval_type_key" ON "grant_approvals"("application_id", "approval_type");

-- CreateIndex
CREATE INDEX "grant_approvals_status_approval_type_idx" ON "grant_approvals"("status", "approval_type");

-- CreateIndex
CREATE INDEX "grant_approvals_requested_by_id_requested_at_idx" ON "grant_approvals"("requested_by_id", "requested_at");

-- CreateIndex
CREATE INDEX "grant_approvals_resolved_by_id_resolved_at_idx" ON "grant_approvals"("resolved_by_id", "resolved_at");

-- CreateIndex
CREATE UNIQUE INDEX "grant_submissions_application_id_key" ON "grant_submissions"("application_id");

-- CreateIndex
CREATE INDEX "grant_submissions_submitted_by_id_submitted_at_idx" ON "grant_submissions"("submitted_by_id", "submitted_at");

-- AddForeignKey
ALTER TABLE "grant_opportunities" ADD CONSTRAINT "grant_opportunities_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_opportunities" ADD CONSTRAINT "grant_opportunities_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_opportunities" ADD CONSTRAINT "grant_opportunities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "grant_opportunities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_applications" ADD CONSTRAINT "grant_applications_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_tasks" ADD CONSTRAINT "grant_tasks_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_tasks" ADD CONSTRAINT "grant_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_tasks" ADD CONSTRAINT "grant_tasks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_approvals" ADD CONSTRAINT "grant_approvals_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_approvals" ADD CONSTRAINT "grant_approvals_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_approvals" ADD CONSTRAINT "grant_approvals_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_submissions" ADD CONSTRAINT "grant_submissions_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "grant_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grant_submissions" ADD CONSTRAINT "grant_submissions_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
