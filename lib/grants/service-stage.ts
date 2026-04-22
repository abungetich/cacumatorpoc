import { GrantApplicationStage, GrantApprovalStatus, GrantApprovalType, Prisma } from "@prisma/client";
import { isGrantTaskCompletedForProgress } from "@/lib/grants/service-support";

export async function computeAndSyncApplicationStage(tx: Prisma.TransactionClient, applicationId: string) {
  const app = await tx.grantApplication.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      stage: true,
      submission: {
        select: {
          id: true,
        },
      },
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
    return null;
  }

  const tasksTotal = app.tasks.length;
  const tasksDone = app.tasks.filter((item) => isGrantTaskCompletedForProgress(item)).length;
  const allTasksDone = tasksTotal > 0 && tasksDone === tasksTotal;

  const approvals = new Map<GrantApprovalType, GrantApprovalStatus>();
  for (const item of app.approvals) {
    approvals.set(item.approvalType, item.status);
  }

  const pursue = approvals.get(GrantApprovalType.PURSUE);
  const budget = approvals.get(GrantApprovalType.BUDGET);
  const finalSubmission = approvals.get(GrantApprovalType.FINAL_SUBMISSION);

  const allApprovalsApproved =
    pursue === GrantApprovalStatus.APPROVED &&
    budget === GrantApprovalStatus.APPROVED &&
    finalSubmission === GrantApprovalStatus.APPROVED;

  let nextStage: GrantApplicationStage = GrantApplicationStage.DISCOVERY;

  if (app.submission) {
    nextStage = GrantApplicationStage.SUBMITTED;
  } else if (allApprovalsApproved && allTasksDone) {
    nextStage = GrantApplicationStage.SUBMISSION;
  } else if (tasksTotal > 0) {
    nextStage = GrantApplicationStage.WRITING;
  } else if (app.approvals.length > 0) {
    nextStage = GrantApplicationStage.APPROVAL;
  }

  if (nextStage !== app.stage) {
    await tx.grantApplication.update({
      where: {
        id: app.id,
      },
      data: {
        stage: nextStage,
      },
    });
  }

  return nextStage;
}
