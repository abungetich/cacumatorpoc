import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { canViewMentee, getActorContext } from "@/lib/actor-context";
import { getMenteeDetailView } from "@/lib/mentee-engine/service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ menteeProfileId: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { menteeProfileId } = await params;
    const item = await getMenteeDetailView(menteeProfileId);

    if (!item) {
      return NextResponse.json({ message: "Mentee not found" }, { status: 404 });
    }

    if (
      !canViewMentee(actor, {
        userId: item.snapshot.userId,
        schoolId: item.snapshot.schoolId,
        partnerId: item.snapshot.partnerId,
        guardianUserId: item.snapshot.guardianUserId,
      })
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not load mentee detail" },
      { status: 500 },
    );
  }
}
