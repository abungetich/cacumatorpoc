import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateGrantSourceSettingSchema } from "@/lib/validation";

type RouteContext = {
  params: Promise<{
    sourceId: string;
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

  const { sourceId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateGrantSourceSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const existing = await prisma.grantSourceSetting.findUnique({
    where: {
      id: sourceId,
    },
    select: {
      id: true,
      code: true,
      label: true,
      isActive: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Source setting not found" }, { status: 404 });
  }

  const payload = parsed.data;
  if (payload.code && payload.code.toLowerCase() !== existing.code.toLowerCase()) {
    const duplicate = await prisma.grantSourceSetting.findFirst({
      where: {
        id: {
          not: sourceId,
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
      return NextResponse.json({ message: "Source code already exists" }, { status: 409 });
    }
  }

  const requestMeta = getRequestMetadata(request);
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.grantSourceSetting.update({
      where: {
        id: sourceId,
      },
      data: {
        ...(payload.code !== undefined ? { code: payload.code } : {}),
        ...(payload.label !== undefined ? { label: payload.label } : {}),
        ...(payload.description !== undefined ? { description: payload.description.trim() || null } : {}),
        ...(payload.sortOrder !== undefined ? { sortOrder: payload.sortOrder } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      },
      select: {
        id: true,
        code: true,
        label: true,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "GRANT_SOURCE_SETTING_UPDATED",
        entityType: "grant_source_settings",
        entityId: sourceId,
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
