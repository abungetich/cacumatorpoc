import { GrantApplicationStage, GrantApprovalStatus, GrantApprovalType, Prisma } from "@prisma/client";
import {
  canActorAccessScopedRecord,
  extractPrismaMessage,
  isGrantTaskCompletedForProgress,
  normalizeCurrencyCode,
  parseMinorAmount,
  resolveGrantScope,
} from "@/lib/grants/service-support";
import type {
  CreateGrantApplicationInput,
  GrantMutationResult,
  ServiceResult,
  SubmitGrantApplicationInput,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";

export async function createGrantApplication(
  input: CreateGrantApplicationInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scope = resolveGrantScope(input.actor);
  if (!scope.ok) {
    return scope;
  }

  let amountRequestedMinor: bigint;
  try {
    amountRequestedMinor = parseMinorAmount(input.amountRequestedMinor);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      message: error instanceof Error ? error.message : "Invalid amount",
    };
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const opportunity = await tx.grantOpportunity.findUnique({
          where: {
            id: input.opportunityId,
          },
          select: {
            id: true,
            title: true,
            currencyCode: true,
            schoolId: true,
            partnerId: true,
          },
        });

        if (!opportunity) {
          return {
            ok: false as const,
            status: 404,
            message: "Grant opportunity not found",
          };
        }

        if (!canActorAccessScopedRecord(input.actor, opportunity.schoolId, opportunity.partnerId)) {
          return {
            ok: false as const,
            status: 403,
            message: "You cannot create applications for opportunities outside your scope",
          };
        }

        const app = await tx.grantApplication.create({
          data: {
            opportunityId: opportunity.id,
            title: input.title?.trim() || `Application - ${opportunity.title}`,
            stage: GrantApplicationStage.DISCOVERY,
            currencyCode: normalizeCurrencyCode(input.currencyCode ?? opportunity.currencyCode),
            amountRequestedMinor,
            schoolId: opportunity.schoolId,
            partnerId: opportunity.partnerId,
            createdById: input.actor.id,
          },
          select: {
            id: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_APPLICATION_CREATED",
            entityType: "grant_applications",
            entityId: app.id,
            oldValues: Prisma.JsonNull,
            newValues: {
              opportunityId: opportunity.id,
              currencyCode: normalizeCurrencyCode(input.currencyCode ?? opportunity.currencyCode),
              amountRequestedMinor: amountRequestedMinor.toString(),
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: app,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!created.ok) {
      return created;
    }

    return {
      ok: true,
      data: {
        id: created.data.id,
        stage: GrantApplicationStage.DISCOVERY,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not create grant application"),
    };
  }
}

export async function submitGrantApplication(
  input: SubmitGrantApplicationInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scope = resolveGrantScope(input.actor);
  if (!scope.ok) {
    return scope;
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const app = await tx.grantApplication.findUnique({
          where: {
            id: input.applicationId,
          },
          select: {
            id: true,
            stage: true,
            schoolId: true,
            partnerId: true,
            tasks: {
              select: {
                status: true,
                reviewStatus: true,
              },
            },
            approvals: {
              select: {
                approvalType: true,
                status: true,
              },
            },
          },
        });

        if (!app) {
          return {
            ok: false as const,
            status: 404,
            message: "Grant application not found",
          };
        }

        if (!canActorAccessScopedRecord(input.actor, app.schoolId, app.partnerId)) {
          return {
            ok: false as const,
            status: 403,
            message: "You cannot submit applications outside your scope",
          };
        }

        const tasksTotal = app.tasks.length;
        const tasksDone = app.tasks.filter((item) => isGrantTaskCompletedForProgress(item)).length;
        if (tasksTotal === 0 || tasksDone !== tasksTotal) {
          return {
            ok: false as const,
            status: 409,
            message: "All writing tasks must be completed before submission",
          };
        }

        const approvalMap = new Map<GrantApprovalType, GrantApprovalStatus>();
        for (const item of app.approvals) {
          approvalMap.set(item.approvalType, item.status);
        }

        const pursue = approvalMap.get(GrantApprovalType.PURSUE);
        const budget = approvalMap.get(GrantApprovalType.BUDGET);
        const finalSubmission = approvalMap.get(GrantApprovalType.FINAL_SUBMISSION);

        if (
          pursue !== GrantApprovalStatus.APPROVED ||
          budget !== GrantApprovalStatus.APPROVED ||
          finalSubmission !== GrantApprovalStatus.APPROVED
        ) {
          return {
            ok: false as const,
            status: 409,
            message: "All required approvals must be approved before submission",
          };
        }

        await tx.grantSubmission.upsert({
          where: {
            applicationId: app.id,
          },
          create: {
            applicationId: app.id,
            submittedById: input.actor.id,
            confirmationReference: input.confirmationReference?.trim() || null,
            proofUrl: input.proofUrl?.trim() || null,
            packageVersion: input.packageVersion?.trim() || null,
            notes: input.notes?.trim() || null,
          },
          update: {
            submittedById: input.actor.id,
            submittedAt: new Date(),
            confirmationReference: input.confirmationReference?.trim() || null,
            proofUrl: input.proofUrl?.trim() || null,
            packageVersion: input.packageVersion?.trim() || null,
            notes: input.notes?.trim() || null,
          },
        });

        await tx.grantApplication.update({
          where: {
            id: app.id,
          },
          data: {
            stage: GrantApplicationStage.SUBMITTED,
            submittedAt: new Date(),
            submittedById: input.actor.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_APPLICATION_SUBMITTED",
            entityType: "grant_applications",
            entityId: app.id,
            oldValues: {
              stage: app.stage,
            },
            newValues: {
              stage: GrantApplicationStage.SUBMITTED,
              confirmationReference: input.confirmationReference?.trim() || null,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            id: app.id,
            stage: GrantApplicationStage.SUBMITTED,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not submit grant application"),
    };
  }
}
