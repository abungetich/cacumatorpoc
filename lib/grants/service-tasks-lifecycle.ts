import { GrantTaskReviewStatus, GrantTaskStatus, Prisma } from "@prisma/client";
import {
  canActorAccessScopedRecord,
  extractPrismaMessage,
  resolveGrantScope,
} from "@/lib/grants/service-support";
import type {
  CreateGrantTaskInput,
  GrantMutationResult,
  ServiceResult,
  UpdateGrantTaskInput,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";
import { computeAndSyncApplicationStage } from "@/lib/grants/service-stage";

export async function createGrantTask(input: CreateGrantTaskInput): Promise<ServiceResult<GrantMutationResult>> {
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
            message: "You cannot add tasks outside your scope",
          };
        }

        const assignee = await tx.user.findUnique({
          where: { id: input.assigneeId },
          select: {
            id: true,
            schoolId: true,
            partnerId: true,
          },
        });

        if (!assignee) {
          return {
            ok: false as const,
            status: 404,
            message: "Assignee not found",
          };
        }

        const isRootTenantAssignee = assignee.schoolId === null && assignee.partnerId === null;

        if (app.schoolId && assignee.schoolId !== app.schoolId && !isRootTenantAssignee) {
          return {
            ok: false as const,
            status: 409,
            message: "Assignee must belong to the same school or root tenant",
          };
        }

        if (!app.schoolId && app.partnerId && assignee.partnerId !== app.partnerId && !isRootTenantAssignee) {
          return {
            ok: false as const,
            status: 409,
            message: "Assignee must belong to the same partner scope or root tenant",
          };
        }

        const task = await tx.grantTask.create({
          data: {
            applicationId: app.id,
            title: input.title,
            description: input.description?.trim() || null,
            section: input.section?.trim() || null,
            assigneeId: input.assigneeId,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            createdById: input.actor.id,
            status: GrantTaskStatus.TODO,
          },
          select: {
            id: true,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, app.id);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_TASK_CREATED",
            entityType: "grant_tasks",
            entityId: task.id,
            oldValues: Prisma.JsonNull,
            newValues: {
              applicationId: app.id,
              title: input.title,
              section: input.section?.trim() || null,
              assigneeId: input.assigneeId,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            id: task.id,
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
      message: extractPrismaMessage(error, "Could not create grant task"),
    };
  }
}

export async function updateGrantTask(input: UpdateGrantTaskInput): Promise<ServiceResult<GrantMutationResult>> {
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
            evidenceUrl: true,
            evidenceName: true,
            evidenceMime: true,
            evidenceSize: true,
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
            message: "You cannot update tasks outside your scope",
          };
        }

        if (
          input.status === GrantTaskStatus.IN_PROGRESS &&
          task.status === GrantTaskStatus.TODO &&
          task.assigneeId !== input.actor.id
        ) {
          return {
            ok: false as const,
            status: 403,
            message: "Only the assigned user can acknowledge this task",
          };
        }

        if (input.status === GrantTaskStatus.DONE && task.assigneeId !== input.actor.id) {
          return {
            ok: false as const,
            status: 403,
            message: "Only the assigned user can complete this task",
          };
        }

        if (input.status === GrantTaskStatus.DONE && task.status === GrantTaskStatus.TODO) {
          return {
            ok: false as const,
            status: 409,
            message: "Task must be acknowledged before completion",
          };
        }

        if (task.status === GrantTaskStatus.DONE && input.status === GrantTaskStatus.IN_PROGRESS) {
          return {
            ok: false as const,
            status: 409,
            message: "Use task review to request rework",
          };
        }

        if (
          task.status === GrantTaskStatus.DONE &&
          task.reviewStatus === GrantTaskReviewStatus.APPROVED &&
          input.status !== GrantTaskStatus.DONE
        ) {
          return {
            ok: false as const,
            status: 409,
            message: "Approved tasks cannot be modified",
          };
        }

        const nextReviewStatus =
          input.status === GrantTaskStatus.DONE
            ? GrantTaskReviewStatus.PENDING
            : input.status === GrantTaskStatus.TODO
            ? null
            : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED
            ? null
            : task.reviewStatus;

        await tx.grantTask.update({
          where: {
            id: task.id,
          },
          data: {
            status: input.status,
            completionNotes: input.completionNotes?.trim() || null,
            completedAt: input.status === GrantTaskStatus.DONE ? new Date() : null,
            reviewStatus: nextReviewStatus,
            reviewedById: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
            reviewedAt: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
            reviewNotes: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
            evidenceUrl: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
            evidenceName: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
            evidenceMime: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
            evidenceSize: input.status === GrantTaskStatus.DONE ? null : task.reviewStatus === GrantTaskReviewStatus.REWORK_REQUIRED ? null : undefined,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, task.applicationId);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_TASK_UPDATED",
            entityType: "grant_tasks",
            entityId: task.id,
            oldValues: {
              status: task.status,
              reviewStatus: task.reviewStatus,
              evidenceName: task.evidenceName,
            },
            newValues: {
              status: input.status,
              reviewStatus: nextReviewStatus,
              acknowledgedById:
                input.status === GrantTaskStatus.IN_PROGRESS && task.status === GrantTaskStatus.TODO ? input.actor.id : null,
              evidenceCleared: input.status === GrantTaskStatus.DONE ? true : undefined,
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
      message: extractPrismaMessage(error, "Could not update grant task"),
    };
  }
}
