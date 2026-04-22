import {
  GrantApplicationStage,
  GrantApprovalStatus,
  GrantApprovalType,
  GrantTaskReviewStatus,
  GrantTaskStatus,
} from "@prisma/client";
import { isGrantTaskCompletedForProgress, toDateString } from "@/lib/grants/service-support";
import type { GrantWorkspaceApplication } from "@/lib/grants/service-support";

type WorkspaceApplicationInput = {
  id: string;
  title: string;
  stage: GrantApplicationStage;
  currencyCode: string;
  amountRequestedMinor: bigint;
  submittedAt: Date | null;
  updatedAt: Date;
  opportunity: {
    id: string;
    title: string;
    funderName: string;
    deadline: Date;
  };
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    section: string | null;
    status: GrantTaskStatus;
    reviewStatus: GrantTaskReviewStatus | null;
    reviewedAt: Date | null;
    reviewedById: string | null;
    reviewNotes: string | null;
    evidenceUrl: string | null;
    evidenceName: string | null;
    evidenceMime: string | null;
    evidenceSize: number | null;
    dueDate: Date | null;
    assigneeId: string | null;
    assignee: { firstName: string; lastName: string } | null;
    reviewedBy: { firstName: string; lastName: string } | null;
  }>;
  approvals: Array<{
    approvalType: GrantApprovalType;
    status: GrantApprovalStatus;
  }>;
  submission: {
    id: string;
    confirmationReference: string | null;
    proofUrl: string | null;
  } | null;
};

export function mapWorkspaceApplications(applications: WorkspaceApplicationInput[], search: string) {
  return applications
    .map((item) => {
      const tasksTotal = item.tasks.length;
      const tasksDone = item.tasks.filter((task) => isGrantTaskCompletedForProgress(task)).length;

      const approvalMap = new Map<GrantApprovalType, GrantApprovalStatus>();
      let pendingCount = 0;

      for (const approval of item.approvals) {
        approvalMap.set(approval.approvalType, approval.status);
        if (approval.status === GrantApprovalStatus.PENDING) {
          pendingCount += 1;
        }
      }

      return {
        id: item.id,
        title: item.title,
        stage: item.stage,
        currencyCode: item.currencyCode,
        amountRequestedMinor: item.amountRequestedMinor.toString(),
        submittedAt: item.submittedAt ? item.submittedAt.toISOString() : null,
        opportunity: {
          id: item.opportunity.id,
          title: item.opportunity.title,
          funderName: item.opportunity.funderName,
          deadline: toDateString(item.opportunity.deadline) ?? "",
        },
        progress: {
          tasksTotal,
          tasksDone,
        },
        tasks: item.tasks
          .map((task) => ({
            id: task.id,
            title: task.title,
            description: task.description,
            section: task.section,
            status: task.status,
            reviewStatus: task.reviewStatus,
            reviewedAt: task.reviewedAt ? task.reviewedAt.toISOString() : null,
            reviewedById: task.reviewedById,
            reviewedByName: task.reviewedBy
              ? `${task.reviewedBy.firstName} ${task.reviewedBy.lastName}`.trim()
              : null,
            reviewNotes: task.reviewNotes,
            evidenceUrl: task.evidenceUrl,
            evidenceName: task.evidenceName,
            evidenceMime: task.evidenceMime,
            evidenceSize: task.evidenceSize,
            dueDate: toDateString(task.dueDate),
            assigneeId: task.assigneeId,
            assigneeName: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}`.trim() : null,
          }))
          .sort((a, b) => {
            const rank = (task: { status: GrantTaskStatus; reviewStatus: GrantTaskReviewStatus | null }) => {
              if (task.status === GrantTaskStatus.TODO) return 0;
              if (task.status === GrantTaskStatus.IN_PROGRESS) return 1;
              if (task.reviewStatus === GrantTaskReviewStatus.PENDING) return 2;
              return 3;
            };
            const rankA = rank(a);
            const rankB = rank(b);
            if (rankA !== rankB) return rankA - rankB;
            return a.title.localeCompare(b.title);
          }),
        approvals: {
          pursue: approvalMap.get(GrantApprovalType.PURSUE) ?? "MISSING",
          budget: approvalMap.get(GrantApprovalType.BUDGET) ?? "MISSING",
          finalSubmission: approvalMap.get(GrantApprovalType.FINAL_SUBMISSION) ?? "MISSING",
          pendingCount,
        },
        submission: {
          submitted: Boolean(item.submission),
          confirmationReference: item.submission?.confirmationReference ?? null,
          proofUrl: item.submission?.proofUrl ?? null,
        },
        updatedAt: item.updatedAt.toISOString(),
      } satisfies GrantWorkspaceApplication;
    })
    .filter((item) => {
      if (!search) {
        return true;
      }

      const haystack = `${item.title} ${item.opportunity.title} ${item.opportunity.funderName} ${item.stage}`.toLowerCase();
      return haystack.includes(search);
    });
}
