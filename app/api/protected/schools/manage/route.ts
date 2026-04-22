import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
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

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "schools.manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";

  const where = {
    ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
    ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { id: actor.schoolId } : {}),
    ...(search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const schools = await prisma.school.findMany({
    where,
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      _count: {
        select: {
          menteeProfiles: true,
          users: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const schoolIds = schools.map((school) => school.id);
  const schoolAdmins = schoolIds.length
    ? await prisma.user.groupBy({
        by: ["schoolId"],
        where: {
          schoolId: { in: schoolIds },
          role: UserRole.SCHOOL_ADMIN,
        },
        _count: {
          _all: true,
        },
      })
    : [];

  const adminCountMap = new Map<string, number>();
  for (const entry of schoolAdmins) {
    if (entry.schoolId) {
      adminCountMap.set(entry.schoolId, entry._count._all);
    }
  }

  return NextResponse.json({
    items: schools.map((school) => ({
      id: school.id,
      name: school.name,
      type: school.type,
      address: school.address,
      location: toLocationLabel(school.address),
      phone: school.phone,
      email: school.email,
      principalName: school.principalName,
      principalEmail: school.principalEmail,
      studentPopulation: school.studentPopulation,
      accreditationStatus: school.accreditationStatus,
      partner: school.partner
        ? {
            id: school.partner.id,
            name: school.partner.name,
            type: school.partner.type,
          }
        : null,
      counts: {
        students: school._count.menteeProfiles,
        users: school._count.users,
        admins: adminCountMap.get(school.id) ?? 0,
      },
    })),
  });
}
