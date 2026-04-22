import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageGrants, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canManageGrants(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const [funders, sources, currencies, profile] = await prisma.$transaction([
    prisma.grantFunder.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        website: true,
        country: true,
        hqCity: true,
        focusAreas: true,
        typicalMinAmountMinor: true,
        typicalMaxAmountMinor: true,
        currencyCode: true,
        applicationUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        contacts: {
          where: {
            isActive: true,
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isPrimary: true,
          },
        },
        _count: {
          select: {
            opportunities: true,
          },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    }),
    prisma.grantSourceSetting.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        description: true,
        sortOrder: true,
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.grantCurrencySetting.findMany({
      select: {
        id: true,
        code: true,
        label: true,
        symbol: true,
        minorUnit: true,
        isDefault: true,
        sortOrder: true,
        isActive: true,
      },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { code: "asc" }],
    }),
    prisma.grantScoringProfile.findFirst({
      where: {
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
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  return NextResponse.json({
    canEdit:
      actor.role === UserRole.PLATFORM_ADMIN || actor.role === UserRole.PARTNER_ADMIN || actor.role === UserRole.SCHOOL_ADMIN,
    funders: funders.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      website: item.website,
      country: item.country,
      hqCity: item.hqCity,
      focusAreas: Array.isArray(item.focusAreas)
        ? item.focusAreas.filter((entry): entry is string => typeof entry === "string")
        : [],
      typicalMinAmountMinor: item.typicalMinAmountMinor?.toString() ?? null,
      typicalMaxAmountMinor: item.typicalMaxAmountMinor?.toString() ?? null,
      currencyCode: item.currencyCode,
      applicationUrl: item.applicationUrl,
      isActive: item.isActive,
      opportunitiesCount: item._count.opportunities,
      contacts: item.contacts,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    sourceSettings: sources,
    currencySettings: currencies,
    scoringProfile: profile
      ? {
          ...profile,
          updatedAt: profile.updatedAt.toISOString(),
        }
      : null,
  });
}
