import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createGrantFunderSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canManageGrants(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createGrantFunderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;
  const minAmount = payload.typicalMinAmountMinor ? BigInt(payload.typicalMinAmountMinor) : null;
  const maxAmount = payload.typicalMaxAmountMinor ? BigInt(payload.typicalMaxAmountMinor) : null;

  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    return NextResponse.json(
      {
        message: "Typical maximum amount cannot be lower than the minimum amount",
      },
      { status: 400 },
    );
  }

  const duplicate = await prisma.grantFunder.findFirst({
    where: {
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

  const requestMeta = getRequestMetadata(request);

  const created = await prisma.$transaction(async (tx) => {
    const funder = await tx.grantFunder.create({
      data: {
        name: payload.name,
        type: payload.type,
        website: payload.website?.trim() || null,
        country: payload.country?.trim() || null,
        hqCity: payload.hqCity?.trim() || null,
        focusAreas: payload.focusAreas?.length ? payload.focusAreas : Prisma.JsonNull,
        typicalMinAmountMinor: minAmount,
        typicalMaxAmountMinor: maxAmount,
        currencyCode: payload.currencyCode?.trim() || null,
        applicationUrl: payload.applicationUrl?.trim() || null,
        contacts: payload.contact
          ? {
              create: {
                name: payload.contact.name,
                email: payload.contact.email?.trim() || null,
                phone: payload.contact.phone?.trim() || null,
                role: payload.contact.role?.trim() || null,
                isPrimary: payload.contact.isPrimary ?? true,
              },
            }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        type: true,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "GRANT_FUNDER_CREATED",
        entityType: "grant_funders",
        entityId: funder.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          name: funder.name,
          type: funder.type,
          isActive: funder.isActive,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return funder;
  });

  return NextResponse.json({
    ok: true,
    item: created,
  });
}
