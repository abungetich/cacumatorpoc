import type { ActorContext } from "@/lib/actor-context";
import { getScopedOpportunityById, mapGrantOpportunity, mapGrantOpportunityLot } from "@/lib/grants/service-support";
import type { GrantOpportunityDetail, ServiceResult } from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";

export async function getGrantOpportunityDetail(
  actor: ActorContext,
  opportunityId: string,
): Promise<ServiceResult<GrantOpportunityDetail>> {
  const scopedOpportunity = await getScopedOpportunityById(actor, opportunityId);
  if (!scopedOpportunity.ok) {
    return scopedOpportunity;
  }

  const lots = await prisma.grantOpportunityLot.findMany({
    where: {
      opportunityId,
    },
    select: {
      id: true,
      description: true,
      quantity: true,
      minBudgetMinor: true,
      maxBudgetMinor: true,
      sortOrder: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return {
    ok: true,
    data: {
      opportunity: mapGrantOpportunity(scopedOpportunity.data),
      lots: lots.map((item) => mapGrantOpportunityLot(item)),
    },
  };
}
