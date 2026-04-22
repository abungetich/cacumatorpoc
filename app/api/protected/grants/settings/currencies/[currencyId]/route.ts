import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateGrantCurrencySettingSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    currencyId: string;
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

  const { currencyId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateGrantCurrencySettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const existing = await prisma.grantCurrencySetting.findUnique({
    where: {
      id: currencyId,
    },
    select: {
      id: true,
      code: true,
      isDefault: true,
      isActive: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Currency setting not found" }, { status: 404 });
  }

  const payload = parsed.data;
  if (payload.code && payload.code.toLowerCase() !== existing.code.toLowerCase()) {
    const duplicate = await prisma.grantCurrencySetting.findFirst({
      where: {
        id: {
          not: currencyId,
        },
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
  }

  const requestMeta = getRequestMetadata(request);
  const updated = await prisma.$transaction(async (tx) => {
    const requestedDefault = payload.isDefault === true;
    if (requestedDefault) {
      await tx.grantCurrencySetting.updateMany({
        where: {
          isDefault: true,
          id: {
            not: currencyId,
          },
        },
        data: {
          isDefault: false,
        },
      });
    }

    const item = await tx.grantCurrencySetting.update({
      where: {
        id: currencyId,
      },
      data: {
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        ...(payload.label !== undefined ? { label: payload.label } : {}),
        ...(payload.symbol !== undefined ? { symbol: payload.symbol.trim() || null } : {}),
        ...(payload.minorUnit !== undefined ? { minorUnit: payload.minorUnit } : {}),
        ...(payload.isDefault !== undefined ? { isDefault: payload.isDefault } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      select: {
        id: true,
        code: true,
        label: true,
        isDefault: true,
        isActive: true,
      },
    });

    if (existing.isDefault && payload.isDefault === false) {
      const fallback = await tx.grantCurrencySetting.findFirst({
        where: {
          isActive: true,
          id: {
            not: currencyId,
          },
        },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        select: {
          id: true,
        },
      });
      if (fallback) {
        await tx.grantCurrencySetting.update({
          where: {
            id: fallback.id,
          },
          data: {
            isDefault: true,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "GRANT_CURRENCY_SETTING_UPDATED",
        entityType: "grant_currency_settings",
        entityId: currencyId,
        oldValues: existing,
        newValues: item,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return item;
  });

  return NextResponse.json({
    ok: true,
    item: updated,
  });
}
