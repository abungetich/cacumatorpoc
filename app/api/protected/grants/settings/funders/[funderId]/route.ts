import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateGrantFunderSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    funderId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canManageGrants(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { funderId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateGrantFunderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;
  const minAmount = payload.typicalMinAmountMinor ? BigInt(payload.typicalMinAmountMinor) : undefined;
  const maxAmount = payload.typicalMaxAmountMinor ? BigInt(payload.typicalMaxAmountMinor) : undefined;

  if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
    return NextResponse.json(
      {
        message: "Typical maximum amount cannot be lower than the minimum amount",
      },
      { status: 400 },
    );
  }

  const existing = await prisma.grantFunder.findUnique({
    where: { id: funderId },
    select: {
      id: true,
      name: true,
      type: true,
      isActive: true,
      typicalMinAmountMinor: true,
      typicalMaxAmountMinor: true,
      contacts: {
        where: {
          isActive: true,
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          isPrimary: true,
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Funder not found" }, { status: 404 });
  }

  if (payload.name && payload.name.toLowerCase() !== existing.name.toLowerCase()) {
    const duplicate = await prisma.grantFunder.findFirst({
      where: {
        id: {
          not: funderId,
        },
        name: {
          equals: payload.name,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (duplicate) {
      return NextResponse.json({ message: "A funder with this name already exists" }, { status: 409 });
    }
  }

  const requestMeta = getRequestMetadata(request);
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.grantFunder.update({
      where: {
        id: funderId,
      },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.type !== undefined ? { type: payload.type } : {}),
        ...(payload.website !== undefined ? { website: payload.website.trim() || null } : {}),
        ...(payload.country !== undefined ? { country: payload.country.trim() || null } : {}),
        ...(payload.hqCity !== undefined ? { hqCity: payload.hqCity.trim() || null } : {}),
        ...(payload.focusAreas !== undefined
          ? { focusAreas: payload.focusAreas.length ? payload.focusAreas : Prisma.JsonNull }
          : {}),
        ...(minAmount !== undefined ? { typicalMinAmountMinor: minAmount } : {}),
        ...(maxAmount !== undefined ? { typicalMaxAmountMinor: maxAmount } : {}),
        ...(payload.currencyCode !== undefined ? { currencyCode: payload.currencyCode.trim() || null } : {}),
        ...(payload.applicationUrl !== undefined ? { applicationUrl: payload.applicationUrl.trim() || null } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
    });

    if (payload.contact) {
      const nextIsPrimary = payload.contact.isPrimary ?? true;
      if (nextIsPrimary) {
        await tx.grantFunderContact.updateMany({
          where: {
            funderId,
            isPrimary: true,
            isActive: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      const existingPrimary = existing.contacts.find((contact) => contact.isPrimary) ?? existing.contacts[0];

      if (existingPrimary) {
        await tx.grantFunderContact.update({
          where: {
            id: existingPrimary.id,
          },
          data: {
            name: payload.contact.name,
            email: payload.contact.email?.trim() || null,
            phone: payload.contact.phone?.trim() || null,
            role: payload.contact.role?.trim() || null,
            isPrimary: nextIsPrimary,
            isActive: true,
          },
        });
      } else {
        await tx.grantFunderContact.create({
          data: {
            funderId,
            name: payload.contact.name,
            email: payload.contact.email?.trim() || null,
            phone: payload.contact.phone?.trim() || null,
            role: payload.contact.role?.trim() || null,
            isPrimary: nextIsPrimary,
            isActive: true,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "GRANT_FUNDER_UPDATED",
        entityType: "grant_funders",
        entityId: updated.id,
        oldValues: {
          name: existing.name,
          type: existing.type,
          isActive: existing.isActive,
          typicalMinAmountMinor: existing.typicalMinAmountMinor?.toString() ?? null,
          typicalMaxAmountMinor: existing.typicalMaxAmountMinor?.toString() ?? null,
        },
        newValues: {
          name: updated.name,
          type: updated.type,
          isActive: updated.isActive,
          hasContactChange: Boolean(payload.contact),
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return updated;
  });

  return NextResponse.json({
    ok: true,
    item: result,
  });
}
