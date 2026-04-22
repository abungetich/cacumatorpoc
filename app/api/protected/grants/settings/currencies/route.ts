import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createGrantCurrencySettingSchema } from "@/lib/validation";

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

  const parsed = createGrantCurrencySettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;
  const duplicate = await prisma.grantCurrencySetting.findFirst({
    where: {
      code: {
        equals: payload.code,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    return NextResponse.json({ message: "Currency code already exists" }, { status: 409 });
  }

  const requestMeta = getRequestMetadata(request);
  const created = await prisma.$transaction(async (tx) => {
    const existingDefault = await tx.grantCurrencySetting.findFirst({
      where: {
        isDefault: true,
      },
      select: {
        id: true,
      },
    });

    const makeDefault = payload.isDefault === true || !existingDefault;
    if (makeDefault) {
      await tx.grantCurrencySetting.updateMany({
        where: {
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const item = await tx.grantCurrencySetting.create({
      data: {
        code: payload.code,
        label: payload.label,
        symbol: payload.symbol?.trim() || null,
        minorUnit: payload.minorUnit ?? 2,
        isDefault: makeDefault,
        sortOrder: payload.sortOrder ?? 100,
        isActive: payload.isActive ?? true,
      },
      select: {
        id: true,
        code: true,
        label: true,
        isDefault: true,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "GRANT_CURRENCY_SETTING_CREATED",
        entityType: "grant_currency_settings",
        entityId: item.id,
        oldValues: Prisma.JsonNull,
        newValues: item,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return item;
  });

  return NextResponse.json({
    ok: true,
    item: created,
  });
}
