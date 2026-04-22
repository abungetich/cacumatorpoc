import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateGrantScoringProfileSchema } from "@/lib/validation";

export async function PUT(request: Request) {
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

  const parsed = updateGrantScoringProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;
  const requestMeta = getRequestMetadata(request);

  const result = await prisma.$transaction(async (tx) => {
    const activeProfile = await tx.grantScoringProfile.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        timelineWeight: true,
        amountWeight: true,
        areaWeight: true,
        eligibilityWeight: true,
        readinessWeight: true,
      },
    });

    const updated = activeProfile
      ? await tx.grantScoringProfile.update({
          where: {
            id: activeProfile.id,
          },
          data: {
            timelineWeight: payload.timelineWeight,
            amountWeight: payload.amountWeight,
            areaWeight: payload.areaWeight,
            eligibilityWeight: payload.eligibilityWeight,
            readinessWeight: payload.readinessWeight,
          },
          select: {
            id: true,
            name: true,
            timelineWeight: true,
            amountWeight: true,
            areaWeight: true,
            eligibilityWeight: true,
            readinessWeight: true,
            updatedAt: true,
          },
        })
      : await tx.grantScoringProfile.create({
          data: {
            name: "Default Weighted Matrix",
            timelineWeight: payload.timelineWeight,
            amountWeight: payload.amountWeight,
            areaWeight: payload.areaWeight,
            eligibilityWeight: payload.eligibilityWeight,
            readinessWeight: payload.readinessWeight,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            timelineWeight: true,
            amountWeight: true,
            areaWeight: true,
            eligibilityWeight: true,
            readinessWeight: true,
            updatedAt: true,
          },
        });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "GRANT_SCORING_PROFILE_UPDATED",
        entityType: "grant_scoring_profiles",
        entityId: updated.id,
        oldValues: activeProfile
          ? {
              timelineWeight: activeProfile.timelineWeight,
              amountWeight: activeProfile.amountWeight,
              areaWeight: activeProfile.areaWeight,
              eligibilityWeight: activeProfile.eligibilityWeight,
              readinessWeight: activeProfile.readinessWeight,
            }
          : Prisma.JsonNull,
        newValues: {
          timelineWeight: updated.timelineWeight,
          amountWeight: updated.amountWeight,
          areaWeight: updated.areaWeight,
          eligibilityWeight: updated.eligibilityWeight,
          readinessWeight: updated.readinessWeight,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return updated;
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...result,
      updatedAt: result.updatedAt.toISOString(),
    },
  });
}
