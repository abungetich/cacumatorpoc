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
  if (!actor || !can(actor, "schools.read")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const location = url.searchParams.get("location")?.trim() ?? "";
  const limitParam = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);

  const schools = await prisma.school.findMany({
    where: {
      ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { id: actor.schoolId } : {}),
      ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(location
        ? {
            address: {
              contains: location,
              mode: "insensitive",
            },
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      address: true,
    },
    orderBy: [{ name: "asc" }],
    take: limit,
  });

  return NextResponse.json({
    items: schools.map((school) => ({
      id: school.id,
      name: school.name,
      type: school.type,
      address: school.address,
      location: toLocationLabel(school.address),
    })),
  });
}
