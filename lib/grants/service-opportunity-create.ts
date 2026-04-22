import { GrantOpportunityStatus, Prisma } from "@prisma/client";
import {
  extractPrismaMessage,
  normalizeCurrencyCode,
  parseMinorAmount,
  resolveGrantScope,
  resolveOpportunityScope,
} from "@/lib/grants/service-support";
import type {
  CreateGrantOpportunityInput,
  GrantMutationResult,
  ServiceResult,
} from "@/lib/grants/service-support";
import { prisma } from "@/lib/prisma";

export async function createGrantOpportunity(
  input: CreateGrantOpportunityInput,
): Promise<ServiceResult<GrantMutationResult>> {
  const scope = resolveGrantScope(input.actor);
  if (!scope.ok) {
    return scope;
  }

  let amountMinor: bigint;
  try {
    amountMinor = parseMinorAmount(input.amountMinor);
  } catch (error) {
    return {
      ok: false,
      status: 400,
      message: error instanceof Error ? error.message : "Invalid amount",
    };
  }

  const resolvedScope = await resolveOpportunityScope({
    actor: input.actor,
    schoolId: input.schoolId,
    partnerId: input.partnerId,
  });
  if (!resolvedScope.ok) {
    return resolvedScope;
  }

  try {
    const created = await prisma.$transaction(
      async (tx) => {
        const item = await tx.grantOpportunity.create({
          data: {
            title: input.title,
            funderName: input.funderName,
            description: input.description?.trim() || null,
            sourceType: input.sourceType ?? null,
            sourceReference: input.sourceReference?.trim() || null,
            sourceUrl: input.sourceUrl?.trim() || null,
            attachmentUrl: input.attachmentUrl?.trim() || null,
            attachmentName: input.attachmentName?.trim() || null,
            attachmentMime: input.attachmentMime?.trim() || null,
            attachmentSize: input.attachmentSize ?? null,
            deadline: new Date(input.deadline),
            status: input.status ?? GrantOpportunityStatus.DISCOVERED,
            fitScore: input.fitScore ?? null,
            country: input.country?.trim() || null,
            currencyCode: normalizeCurrencyCode(input.currencyCode),
            amountMinor,
            schoolId: resolvedScope.data.schoolId,
            partnerId: resolvedScope.data.partnerId,
            createdById: input.actor.id,
          },
          select: {
            id: true,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "GRANT_OPPORTUNITY_CREATED",
            entityType: "grant_opportunities",
            entityId: item.id,
            oldValues: Prisma.JsonNull,
            newValues: {
              title: input.title,
              funderName: input.funderName,
              sourceType: input.sourceType ?? null,
              sourceReference: input.sourceReference?.trim() || null,
              sourceUrl: input.sourceUrl?.trim() || null,
              attachmentName: input.attachmentName?.trim() || null,
              currencyCode: normalizeCurrencyCode(input.currencyCode),
              amountMinor: amountMinor.toString(),
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return item;
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
      message: extractPrismaMessage(error, "Could not create grant opportunity"),
    };
  }
}
