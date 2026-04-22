import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { getMenteesIntake, readMenteeFilters } from "@/lib/people-intake";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!can(actor, "mentees.read")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (actor.role === UserRole.PARTNER_ADMIN && !actor.partnerId) {
      return NextResponse.json({ message: "Partner admin account is missing partner scope" }, { status: 403 });
    }

    if (actor.role === UserRole.SCHOOL_ADMIN && !actor.schoolId) {
      return NextResponse.json({ message: "School admin account is missing school scope" }, { status: 403 });
    }

    if (
      actor.role !== UserRole.PLATFORM_ADMIN &&
      actor.role !== UserRole.PARTNER_ADMIN &&
      actor.role !== UserRole.SCHOOL_ADMIN
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      await getMenteesIntake(
        {
          role: actor.role,
          partnerId: actor.partnerId,
          schoolId: actor.schoolId,
        },
        readMenteeFilters(new URL(request.url).searchParams),
      ),
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not load mentee intake" },
      { status: 500 },
    );
  }
}
