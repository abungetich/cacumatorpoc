import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canOnboardSchool, getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canOnboardSchool(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const items = await prisma.partner.findMany({
    where:
      actor.role === UserRole.PARTNER_ADMIN && actor.partnerId
        ? {
            id: actor.partnerId,
          }
        : undefined,
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({ items });
}
