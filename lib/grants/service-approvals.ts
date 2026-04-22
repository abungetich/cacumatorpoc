import { GrantApprovalStatus, Prisma } from "@prisma/client";
import {
  canActorAccessScopedRecord,
  extractPrismaMessage,
  resolveGrantScope,
} from "@/lib/grants/service-support";
import type {
  GrantMutationResult,
  ServiceResult,
  UpsertGrantApprovalInput,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";
import { computeAndSyncApplicationStage } from "@/lib/grants/service-stage";

export async function upsertGrantApproval(input: UpsertGrantApprovalInput): Promise<ServiceResult<GrantMutationResult>> {
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
            message: "You cannot resolve approvals outside your scope",
          };
        }

        await tx.grantApproval.upsert({
          where: {
            applicationId_approvalType: {
              applicationId: app.id,
              approvalType: input.approvalType,
            },
          },
          create: {
            applicationId: app.id,
            approvalType: input.approvalType,
            status: input.status,
            requestedById: input.actor.id,
            requestedAt: new Date(),
            resolvedById: input.status === GrantApprovalStatus.PENDING ? null : input.actor.id,
            resolvedAt: input.status === GrantApprovalStatus.PENDING ? null : new Date(),
            notes: input.notes?.trim() || null,
          },
          update: {
            status: input.status,
            resolvedById: input.status === GrantApprovalStatus.PENDING ? null : input.actor.id,
            resolvedAt: input.status === GrantApprovalStatus.PENDING ? null : new Date(),
            notes: input.notes?.trim() || null,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, app.id);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_APPROVAL_UPDATED",
            entityType: "grant_applications",
            entityId: app.id,
            oldValues: Prisma.JsonNull,
            newValues: {
              approvalType: input.approvalType,
              status: input.status,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            id: app.id,
            stage: nextStage ?? app.stage,
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
      message: extractPrismaMessage(error, "Could not update grant approval"),
    };
  }
}
