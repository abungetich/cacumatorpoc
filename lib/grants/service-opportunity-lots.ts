import { Prisma } from "@prisma/client";
import {
  extractPrismaMessage,
  getScopedOpportunityById,
  parseMinorAmount,
} from "@/lib/grants/service-support";
import type {
  CreateGrantOpportunityLotInput,
  DeleteGrantOpportunityLotInput,
  GrantMutationResult,
  ServiceResult,
  UpdateGrantOpportunityLotInput,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";

export async function createGrantOpportunityLot(
  input: CreateGrantOpportunityLotInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scopedOpportunity = await getScopedOpportunityById(input.actor, input.opportunityId);
  if (!scopedOpportunity.ok) {
    return scopedOpportunity;
  }

  let minBudgetMinor: bigint;
  let maxBudgetMinor: bigint;
  try {
    minBudgetMinor = parseMinorAmount(input.minBudgetMinor);
    maxBudgetMinor = parseMinorAmount(input.maxBudgetMinor);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      message: error instanceof Error ? error.message : "Invalid lot budget",
    };
  }

  if (minBudgetMinor > maxBudgetMinor) {
    return {
      ok: false,
      status: 400,
      message: "Maximum budget must be greater than or equal to minimum budget",
    };
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const orderState = await tx.grantOpportunityLot.aggregate({
          where: {
            opportunityId: input.opportunityId,
          },
          _max: {
            sortOrder: true,
          },
        });

        const lot = await tx.grantOpportunityLot.create({
          data: {
            opportunityId: input.opportunityId,
            description: input.description.trim(),
            quantity: input.quantity,
            minBudgetMinor,
            maxBudgetMinor,
            sortOrder: (orderState._max.sortOrder ?? 0) + 1,
          },
          select: {
            id: true,
            description: true,
            quantity: true,
            minBudgetMinor: true,
            maxBudgetMinor: true,
            sortOrder: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_OPPORTUNITY_LOT_CREATED",
            entityType: "grant_opportunity_lots",
            entityId: lot.id,
            oldValues: Prisma.JsonNull,
            newValues: {
              opportunityId: input.opportunityId,
              description: lot.description,
              quantity: lot.quantity,
              minBudgetMinor: lot.minBudgetMinor.toString(),
              maxBudgetMinor: lot.maxBudgetMinor.toString(),
              sortOrder: lot.sortOrder,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return lot;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return {
      ok: true,
      data: {
        id: created.id,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not create opportunity lot"),
    };
  }
}

export async function updateGrantOpportunityLot(
  input: UpdateGrantOpportunityLotInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scopedOpportunity = await getScopedOpportunityById(input.actor, input.opportunityId);
  if (!scopedOpportunity.ok) {
    return scopedOpportunity;
  }

  let minBudgetMinor: bigint;
  let maxBudgetMinor: bigint;
  try {
    minBudgetMinor = parseMinorAmount(input.minBudgetMinor);
    maxBudgetMinor = parseMinorAmount(input.maxBudgetMinor);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      message: error instanceof Error ? error.message : "Invalid lot budget",
    };
  }

  if (minBudgetMinor > maxBudgetMinor) {
    return {
      ok: false,
      status: 400,
      message: "Maximum budget must be greater than or equal to minimum budget",
    };
  }

  try {
    const updated = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.grantOpportunityLot.findUnique({
          where: {
            id: input.lotId,
          },
          select: {
            id: true,
            opportunityId: true,
            description: true,
            quantity: true,
            minBudgetMinor: true,
            maxBudgetMinor: true,
            sortOrder: true,
          },
        });

        if (!existing || existing.opportunityId !== input.opportunityId) {
          return {
            ok: false as const,
            status: 404,
            message: "Opportunity lot not found",
          };
        }

        const lot = await tx.grantOpportunityLot.update({
          where: {
            id: existing.id,
          },
          data: {
            description: input.description.trim(),
            quantity: input.quantity,
            minBudgetMinor,
            maxBudgetMinor,
          },
          select: {
            id: true,
            description: true,
            quantity: true,
            minBudgetMinor: true,
            maxBudgetMinor: true,
            sortOrder: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_OPPORTUNITY_LOT_UPDATED",
            entityType: "grant_opportunity_lots",
            entityId: lot.id,
            oldValues: {
              description: existing.description,
              quantity: existing.quantity,
              minBudgetMinor: existing.minBudgetMinor.toString(),
              maxBudgetMinor: existing.maxBudgetMinor.toString(),
              sortOrder: existing.sortOrder,
            },
            newValues: {
              description: lot.description,
              quantity: lot.quantity,
              minBudgetMinor: lot.minBudgetMinor.toString(),
              maxBudgetMinor: lot.maxBudgetMinor.toString(),
              sortOrder: lot.sortOrder,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: lot,
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
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not update opportunity lot"),
    };
  }
}

export async function deleteGrantOpportunityLot(
  input: DeleteGrantOpportunityLotInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scopedOpportunity = await getScopedOpportunityById(input.actor, input.opportunityId);
  if (!scopedOpportunity.ok) {
    return scopedOpportunity;
  }

  try {
    const deleted = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.grantOpportunityLot.findUnique({
          where: {
            id: input.lotId,
          },
          select: {
            id: true,
            opportunityId: true,
            description: true,
            quantity: true,
            minBudgetMinor: true,
            maxBudgetMinor: true,
            sortOrder: true,
          },
        });

        if (!existing || existing.opportunityId !== input.opportunityId) {
          return {
            ok: false as const,
            status: 404,
            message: "Opportunity lot not found",
          };
        }

        await tx.grantOpportunityLot.delete({
          where: {
            id: existing.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_OPPORTUNITY_LOT_DELETED",
            entityType: "grant_opportunity_lots",
            entityId: existing.id,
            oldValues: {
              opportunityId: existing.opportunityId,
              description: existing.description,
              quantity: existing.quantity,
              minBudgetMinor: existing.minBudgetMinor.toString(),
              maxBudgetMinor: existing.maxBudgetMinor.toString(),
              sortOrder: existing.sortOrder,
            },
            newValues: Prisma.JsonNull,
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: existing,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!deleted.ok) {
      return deleted;
    }

    return {
      ok: true,
      data: {
        id: deleted.data.id,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not delete opportunity lot"),
    };
  }
}
