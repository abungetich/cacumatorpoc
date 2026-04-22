import { GrantApplicationStage } from "@prisma/client";
import type { ActorContext } from "@/lib/actor-context";
import { resolveGrantScope } from "@/lib/grants/service-support";
import type { GrantWorkspaceView, ServiceResult } from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";
import { mapWorkspaceApplications } from "@/lib/grants/service-workspace-applications";
import { mapWorkspaceOpportunities } from "@/lib/grants/service-workspace-opportunities";

export { listGrantTaskAssignees } from "@/lib/grants/service-workspace-assignees";

export async function listGrantWorkspace(
  actor: ActorContext,
  params?: {
    search?: string;
    stage?: GrantApplicationStage | "ALL";
  },
): Promise<ServiceResult<GrantWorkspaceView>> {
  const scope = resolveGrantScope(actor);
  if (!scope.ok) {
    return scope;
  }

  const [opportunities, applications] = await prisma.$transaction([
    prisma.grantOpportunity.findMany({
      where: scope.data.opportunityWhere,
      select: {
        id: true,
        title: true,
        funderName: true,
        description: true,
        status: true,
        sourceType: true,
        sourceReference: true,
        sourceUrl: true,
        attachmentUrl: true,
        attachmentName: true,
        deadline: true,
        currencyCode: true,
        amountMinor: true,
        fitScore: true,
        fitMatrix: true,
        scoredAt: true,
        country: true,
        school: {
          select: {
            name: true,
          },
        },
        partner: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
        createdAt: true,
      },
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.grantApplication.findMany({
      where: {
        ...scope.data.applicationWhere,
        ...(params?.stage && params.stage !== "ALL" ? { stage: params.stage } : {}),
      },
      select: {
        id: true,
        title: true,
        stage: true,
        currencyCode: true,
        amountRequestedMinor: true,
        submittedAt: true,
        updatedAt: true,
        opportunity: {
          select: {
            id: true,
            title: true,
            funderName: true,
            deadline: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            section: true,
            status: true,
            reviewStatus: true,
            reviewedAt: true,
            reviewedById: true,
            reviewNotes: true,
            evidenceUrl: true,
            evidenceName: true,
            evidenceMime: true,
            evidenceSize: true,
            dueDate: true,
            assigneeId: true,
            assignee: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            reviewedBy: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        approvals: {
          select: {
            approvalType: true,
            status: true,
          },
        },
        submission: {
          select: {
            id: true,
            confirmationReference: true,
            proofUrl: true,
          },
        },
      },
      orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
    }),
  ]);

  const search = params?.search?.trim().toLowerCase() ?? "";

  return {
    ok: true,
    data: {
      opportunities: mapWorkspaceOpportunities(opportunities, search),
      applications: mapWorkspaceApplications(applications, search),
    },
  };
}
