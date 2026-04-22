import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || (actor.role !== UserRole.PLATFORM_ADMIN && actor.role !== UserRole.PARTNER_ADMIN && actor.role !== UserRole.ORGANIZATION_ADMIN)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { organizationId } = await params;
  const item = await prisma.organization.findUnique({
    where: { id: organizationId },
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
      primaryContactTitle: true,
      adminFirstName: true,
      adminLastName: true,
      adminEmail: true,
      adminPhone: true,
      adminTitle: true,
      mentorParticipation: true,
      financialSupport: true,
      inKindSupport: true,
      publicProfileEnabled: true,
      schoolsOfInterest: true,
      createdAt: true,
      description: true,
      mission: true,
      website: true,
      address: true,
      partnerId: true,
      partner: {
        select: {
          id: true,
          name: true,
        },
      },
      agreements: {
        select: {
          id: true,
          code: true,
          title: true,
          version: true,
          agreedByName: true,
          agreedByEmail: true,
          agreedAt: true,
        },
        orderBy: [{ agreedAt: "desc" }],
      },
      _count: {
        select: {
          memberships: true,
          agreements: true,
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ message: "Organization not found" }, { status: 404 });
  }

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId !== item.partnerId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.ORGANIZATION_ADMIN) {
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: actor.id,
        organizationId: item.id,
        role: "ADMIN",
        status: { in: ["ACTIVE", "PENDING"] },
      },
      select: { id: true },
    });

    if (!membership) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    item: {
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
      primaryContactTitle: item.primaryContactTitle,
      adminName: `${item.adminFirstName} ${item.adminLastName}`.trim(),
      adminEmail: item.adminEmail,
      adminPhone: item.adminPhone,
      adminTitle: item.adminTitle,
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
      description: item.description,
      mission: item.mission,
      website: item.website,
      address: item.address,
      agreements: item.agreements.map((agreement) => ({
        ...agreement,
        agreedAt: agreement.agreedAt.toISOString(),
      })),
    },
  });
}
