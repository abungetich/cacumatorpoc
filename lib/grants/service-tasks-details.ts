import { Prisma } from "@prisma/client";
import {
  canActorAccessScopedRecord,
  extractPrismaMessage,
  resolveGrantScope,
  toDateString,
} from "@/lib/grants/service-support";
import type {
  DeleteGrantTaskInput,
  GrantMutationResult,
  ServiceResult,
  UpdateGrantTaskDetailsInput,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";
import { computeAndSyncApplicationStage } from "@/lib/grants/service-stage";

export async function updateGrantTaskDetails(
  input: UpdateGrantTaskDetailsInput,
): Promise<ServiceResult<GrantMutationResult>> {
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
            title: true,
            description: true,
            section: true,
            assigneeId: true,
            dueDate: true,
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
            message: "You cannot edit tasks outside your scope",
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

        if (task.application.schoolId && assignee.schoolId !== task.application.schoolId && !isRootTenantAssignee) {
          return {
            ok: false as const,
            status: 409,
            message: "Assignee must belong to the same school or root tenant",
          };
        }

        if (
          !task.application.schoolId &&
          task.application.partnerId &&
          assignee.partnerId !== task.application.partnerId &&
          !isRootTenantAssignee
        ) {
          return {
            ok: false as const,
            status: 409,
            message: "Assignee must belong to the same partner scope or root tenant",
          };
        }

        await tx.grantTask.update({
          where: {
            id: task.id,
          },
          data: {
            title: input.title.trim(),
            description: input.description?.trim() || null,
            section: input.section?.trim() || null,
            assigneeId: input.assigneeId,
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, task.applicationId);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_TASK_DETAILS_UPDATED",
            entityType: "grant_tasks",
            entityId: task.id,
            oldValues: {
              title: task.title,
              description: task.description,
              section: task.section,
              assigneeId: task.assigneeId,
              dueDate: toDateString(task.dueDate),
            },
            newValues: {
              title: input.title.trim(),
              description: input.description?.trim() || null,
              section: input.section?.trim() || null,
              assigneeId: input.assigneeId,
              dueDate: input.dueDate ?? null,
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
      message: extractPrismaMessage(error, "Could not update grant task details"),
    };
  }
}

export async function deleteGrantTask(input: DeleteGrantTaskInput): Promise<ServiceResult<GrantMutationResult>> {
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
            title: true,
            description: true,
            section: true,
            status: true,
            assigneeId: true,
            dueDate: true,
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
            message: "You cannot delete tasks outside your scope",
          };
        }

        await tx.grantTask.delete({
          where: {
            id: task.id,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, task.applicationId);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_TASK_DELETED",
            entityType: "grant_tasks",
            entityId: task.id,
            oldValues: {
              applicationId: task.applicationId,
              title: task.title,
              description: task.description,
              section: task.section,
              status: task.status,
              assigneeId: task.assigneeId,
              dueDate: toDateString(task.dueDate),
            },
            newValues: Prisma.JsonNull,
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
      message: extractPrismaMessage(error, "Could not delete grant task"),
    };
  }
}
