import { GrantTaskReviewStatus, GrantTaskStatus, Prisma } from "@prisma/client";
import {
  canActorAccessScopedRecord,
  extractPrismaMessage,
  resolveGrantScope,
} from "@/lib/grants/service-support";
import type {
  GrantMutationResult,
  ReviewGrantTaskInput,
  ServiceResult,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";
import { computeAndSyncApplicationStage } from "@/lib/grants/service-stage";

export async function reviewGrantTask(input: ReviewGrantTaskInput): Promise<ServiceResult<GrantMutationResult>> {
  const scope = resolveGrantScope(input.actor);
  if (!scope.ok) {
    return scope;
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const task = await tx.grantTask.findUnique({
          where: {
            id: input.taskId,
          },
          select: {
            id: true,
            applicationId: true,
            status: true,
            reviewStatus: true,
            assigneeId: true,
            completedAt: true,
            evidenceUrl: true,
            evidenceName: true,
            evidenceMime: true,
            evidenceSize: true,
            reviewNotes: true,
            reviewedById: true,
            reviewedAt: true,
            application: {
              select: {
                stage: true,
                schoolId: true,
                partnerId: true,
              },
            },
          },
        });

        if (!task) {
          return {
            ok: false as const,
            status: 404,
            message: "Grant task not found",
          };
        }

        if (!canActorAccessScopedRecord(input.actor, task.application.schoolId, task.application.partnerId)) {
          return {
            ok: false as const,
            status: 403,
            message: "You cannot review tasks outside your scope",
          };
        }

        if (task.assigneeId && task.assigneeId === input.actor.id) {
          return {
            ok: false as const,
            status: 409,
            message: "Assigned user cannot review their own task",
          };
        }

        if (task.status !== GrantTaskStatus.DONE) {
          return {
            ok: false as const,
            status: 409,
            message: "Only completed tasks can be reviewed",
          };
        }

        if (!task.evidenceUrl) {
          return {
            ok: false as const,
            status: 409,
            message: "Evidence is required before review",
          };
        }

        const reviewNotes = input.notes?.trim() || null;
        const decision = input.decision;

        await tx.grantTask.update({
          where: {
            id: task.id,
          },
          data: {
            status: decision === "APPROVE" ? GrantTaskStatus.DONE : GrantTaskStatus.IN_PROGRESS,
            reviewStatus:
              decision === "APPROVE" ? GrantTaskReviewStatus.APPROVED : GrantTaskReviewStatus.REWORK_REQUIRED,
            reviewedById: input.actor.id,
            reviewedAt: new Date(),
            reviewNotes,
            completedAt: decision === "APPROVE" ? task.completedAt ?? new Date() : null,
            evidenceUrl: decision === "APPROVE" ? task.evidenceUrl : null,
            evidenceName: decision === "APPROVE" ? task.evidenceName : null,
            evidenceMime: decision === "APPROVE" ? task.evidenceMime : null,
            evidenceSize: decision === "APPROVE" ? task.evidenceSize : null,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, task.applicationId);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_TASK_REVIEWED",
            entityType: "grant_tasks",
            entityId: task.id,
            oldValues: {
              status: task.status,
              reviewStatus: task.reviewStatus,
              reviewedById: task.reviewedById,
              reviewedAt: task.reviewedAt?.toISOString() ?? null,
              reviewNotes: task.reviewNotes,
              evidenceName: task.evidenceName,
            },
            newValues: {
              decision,
              status: decision === "APPROVE" ? GrantTaskStatus.DONE : GrantTaskStatus.IN_PROGRESS,
              reviewStatus:
                decision === "APPROVE" ? GrantTaskReviewStatus.APPROVED : GrantTaskReviewStatus.REWORK_REQUIRED,
              reviewedById: input.actor.id,
              reviewNotes,
              evidenceRetained: decision === "APPROVE",
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            id: task.id,
            stage: nextStage ?? task.application.stage,
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
      message: extractPrismaMessage(error, "Could not review grant task"),
    };
  }
}
