import { GrantTaskReviewStatus, GrantTaskStatus, Prisma } from "@prisma/client";
import {
  canActorAccessScopedRecord,
  extractPrismaMessage,
  resolveGrantScope,
} from "@/lib/grants/service-support";
import type {
  GrantMutationResult,
  ServiceResult,
  UploadGrantTaskEvidenceInput,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";
import { computeAndSyncApplicationStage } from "@/lib/grants/service-stage";

export async function uploadGrantTaskEvidence(
  input: UploadGrantTaskEvidenceInput,
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
            message: "You cannot upload evidence outside your scope",
          };
        }

        if (task.assigneeId !== input.actor.id) {
          return {
            ok: false as const,
            status: 403,
            message: "Only the assigned user can upload evidence",
          };
        }

        if (task.status !== GrantTaskStatus.DONE) {
          return {
            ok: false as const,
            status: 409,
            message: "Task must be marked done before evidence upload",
          };
        }

        if (task.reviewStatus === GrantTaskReviewStatus.APPROVED) {
          return {
            ok: false as const,
            status: 409,
            message: "Evidence is locked after approval",
          };
        }

        await tx.grantTask.update({
          where: {
            id: task.id,
          },
          data: {
            evidenceUrl: input.evidenceUrl,
            evidenceName: input.evidenceName,
            evidenceMime: input.evidenceMime?.trim() || null,
            evidenceSize: input.evidenceSize ?? null,
            reviewStatus: GrantTaskReviewStatus.PENDING,
            reviewedById: null,
            reviewedAt: null,
            reviewNotes: null,
          },
        });

        const nextStage = await computeAndSyncApplicationStage(tx, task.applicationId);

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_TASK_EVIDENCE_UPLOADED",
            entityType: "grant_tasks",
            entityId: task.id,
            oldValues: {
              evidenceUrl: task.evidenceUrl,
              evidenceName: task.evidenceName,
              evidenceMime: task.evidenceMime,
              evidenceSize: task.evidenceSize,
            },
            newValues: {
              evidenceUrl: input.evidenceUrl,
              evidenceName: input.evidenceName,
              evidenceMime: input.evidenceMime?.trim() || null,
              evidenceSize: input.evidenceSize ?? null,
              reviewStatus: GrantTaskReviewStatus.PENDING,
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
      message: extractPrismaMessage(error, "Could not upload grant task evidence"),
    };
  }
}
