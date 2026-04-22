import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

function toLocationLabel(address: string) {
  const parts = address
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (parts.length === 0) {
    return "-";
  }

  return parts[parts.length - 1];
}

function deriveAgreementStatus(agreement: Prisma.JsonValue | null): "SIGNED" | "MISSING" {
  return agreement ? "SIGNED" : "MISSING";
}

function deriveLifecycleStatus({
  agreementStatus,
  schoolCount,
}: {
  agreementStatus: "SIGNED" | "MISSING";
  schoolCount: number;
}): "ACTIVE" | "SETUP_REQUIRED" {
  return agreementStatus === "SIGNED" && schoolCount > 0 ? "ACTIVE" : "SETUP_REQUIRED";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ partnerId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (
    actor.role !== UserRole.PLATFORM_ADMIN &&
    actor.role !== UserRole.PARTNER_ADMIN &&
    actor.role !== UserRole.SCHOOL_ADMIN
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { partnerId } = await params;

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId !== partnerId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN) {
    const school = actor.schoolId
      ? await prisma.school.findUnique({
          where: { id: actor.schoolId },
          select: { partnerId: true },
        })
      : null;

    if (school?.partnerId !== partnerId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
  }

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    select: {
      id: true,
      name: true,
      type: true,
      contactPerson: true,
      contactEmail: true,
      contactPhone: true,
      website: true,
      logoUrl: true,
      partnershipAgreement: true,
      createdAt: true,
      _count: {
        select: {
          schools: true,
          users: true,
        },
      },
      schools: {
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          _count: {
            select: {
              menteeProfiles: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  if (!partner) {
    return NextResponse.json({ message: "Partner not found" }, { status: 404 });
  }

  const agreementStatus = deriveAgreementStatus(partner.partnershipAgreement);

  return NextResponse.json({
    item: {
      id: partner.id,
      name: partner.name,
      type: partner.type,
      contactPerson: partner.contactPerson,
      contactEmail: partner.contactEmail,
      contactPhone: partner.contactPhone,
      website: partner.website,
      logoUrl: partner.logoUrl,
      agreementStatus,
      lifecycleStatus: deriveLifecycleStatus({
        agreementStatus,
        schoolCount: partner._count.schools,
      }),
      createdAt: partner.createdAt.toISOString(),
      counts: {
        schools: partner._count.schools,
        users: partner._count.users,
      },
      schools: partner.schools.map((school) => ({
        id: school.id,
        name: school.name,
        type: school.type,
        location: toLocationLabel(school.address),
        students: school._count.menteeProfiles,
      })),
    },
  });
}
