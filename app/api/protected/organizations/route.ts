import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

const allowedStatuses = new Set(["ALL", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "INACTIVE"]);

function mapOrganizationRow(
  item: Prisma.OrganizationGetPayload<{
    select: {
      id: true;
      name: true;
      slug: true;
      logoUrl: true;
      type: true;
      status: true;
      country: true;
      county: true;
      city: true;
      contactEmail: true;
      contactPhone: true;
      primaryContactName: true;
      adminFirstName: true;
      adminLastName: true;
      adminEmail: true;
      mentorParticipation: true;
      financialSupport: true;
      inKindSupport: true;
      publicProfileEnabled: true;
      schoolsOfInterest: true;
      createdAt: true;
      partner: { select: { id: true; name: true } };
      _count: { select: { memberships: true; agreements: true } };
    };
  }>,
) {
  return {
    id: item.id,
    name: item.name,
    slug: item.slug,
    logoUrl: item.logoUrl,
    type: item.type,
    status: item.status,
    country: item.country,
    county: item.county,
    city: item.city,
    contactEmail: item.contactEmail,
    contactPhone: item.contactPhone,
    primaryContactName: item.primaryContactName,
    adminName: `${item.adminFirstName} ${item.adminLastName}`.trim(),
    adminEmail: item.adminEmail,
    mentorParticipation: item.mentorParticipation,
    financialSupport: item.financialSupport,
    inKindSupport: item.inKindSupport,
    publicProfileEnabled: item.publicProfileEnabled,
    partner: item.partner,
    schoolsOfInterest: Array.isArray(item.schoolsOfInterest)
      ? item.schoolsOfInterest.filter((school): school is string => typeof school === "string")
      : [],
    counts: {
      memberships: item._count.memberships,
      agreements: item._count.agreements,
    },
    createdAt: item.createdAt.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || (actor.role !== UserRole.PLATFORM_ADMIN && actor.role !== UserRole.PARTNER_ADMIN && actor.role !== UserRole.ORGANIZATION_ADMIN)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const membership = actor.role === UserRole.ORGANIZATION_ADMIN
    ? await prisma.organizationMembership.findFirst({
        where: {
          userId: actor.id,
          role: "ADMIN",
          status: { in: ["ACTIVE", "PENDING"] },
        },
        select: { organizationId: true },
      })
    : null;

  if (actor.role === UserRole.ORGANIZATION_ADMIN && !membership?.organizationId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim().toUpperCase() ?? "ALL";

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ message: "Invalid organization status filter" }, { status: 400 });
  }

  const where: Prisma.OrganizationWhereInput = {
    ...(actor.role === UserRole.ORGANIZATION_ADMIN && membership?.organizationId ? { id: membership.organizationId } : {}),
    ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
            { adminEmail: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status !== "ALL" ? { status: status as Prisma.OrganizationWhereInput["status"] } : {}),
  };

  const items = await prisma.organization.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      type: true,
      status: true,
      country: true,
      county: true,
      city: true,
      contactEmail: true,
      contactPhone: true,
      primaryContactName: true,
      adminFirstName: true,
      adminLastName: true,
      adminEmail: true,
      mentorParticipation: true,
      financialSupport: true,
      inKindSupport: true,
      publicProfileEnabled: true,
      schoolsOfInterest: true,
      createdAt: true,
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          memberships: true,
          agreements: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ items: items.map(mapOrganizationRow) });
}
