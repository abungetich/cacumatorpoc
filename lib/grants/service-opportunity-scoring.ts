import { Prisma } from "@prisma/client";
import {
  calculateWeightedFitScore,
  canActorAccessScopedRecord,
  extractPrismaMessage,
  getActiveGrantScoringWeights,
  resolveGrantScope,
} from "@/lib/grants/service-support";
import type {
  GrantMutationResult,
  ScoreGrantOpportunityInput,
  ServiceResult,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";

export async function scoreGrantOpportunity(
  input: ScoreGrantOpportunityInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scope = resolveGrantScope(input.actor);
  if (!scope.ok) {
    return scope;
  }

  const weights = await getActiveGrantScoringWeights();
  const weightedScore = calculateWeightedFitScore({
    timelineScore: input.timelineScore,
    amountScore: input.amountScore,
    areaScore: input.areaScore,
    eligibilityScore: input.eligibilityScore,
    readinessScore: input.readinessScore,
  }, weights);

  const matrixPayload = {
    timelineScore: input.timelineScore,
    amountScore: input.amountScore,
    areaScore: input.areaScore,
    eligibilityScore: input.eligibilityScore,
    readinessScore: input.readinessScore,
    weights,
    weightedScore,
    notes: input.notes?.trim() || null,
  } satisfies Prisma.JsonObject;

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const opportunity = await tx.grantOpportunity.findUnique({
          where: {
            id: input.opportunityId,
          },
          select: {
            id: true,
            schoolId: true,
            partnerId: true,
            fitScore: true,
            fitMatrix: true,
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
            message: "You cannot score opportunities outside your scope",
          };
        }

        const saved = await tx.grantOpportunity.update({
          where: {
            id: opportunity.id,
          },
          data: {
            fitScore: weightedScore,
            fitMatrix: matrixPayload,
            scoredById: input.actor.id,
            scoredAt: new Date(),
          },
          select: {
            id: true,
            fitScore: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_OPPORTUNITY_SCORED",
            entityType: "grant_opportunities",
            entityId: opportunity.id,
            oldValues: {
              fitScore: opportunity.fitScore,
              fitMatrix: opportunity.fitMatrix,
            },
            newValues: matrixPayload,
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: saved,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!updated.ok) {
      return updated;
    }

    return {
      ok: true,
      data: {
        id: updated.data.id,
        fitScore: updated.data.fitScore ?? weightedScore,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not score grant opportunity"),
    };
  }
}
