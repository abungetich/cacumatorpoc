import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getActorContext, getAuditScopeWhere } from "@/lib/actor-context";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isNaN(limitParam) ? 50 : Math.min(Math.max(limitParam, 1), 200);
  const actionFilter = url.searchParams.get("action")?.trim().toUpperCase();

  const where = getAuditScopeWhere(actor);

  const items = await prisma.auditLog.findMany({
    where: {
      ...where,
      ...(actionFilter ? { action: { contains: actionFilter, mode: "insensitive" } } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      action: item.action,
      actor: `${item.user.firstName} ${item.user.lastName}`.trim(),
      entityType: item.entityType,
      entityId: item.entityId,
      timestamp: item.createdAt.toISOString(),
    })),
  });
}
