import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { listMatchCandidatesForMentee } from "@/lib/matching-engine/service";

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

    const url = new URL(request.url);
    const menteeUserId = url.searchParams.get("menteeUserId")?.trim();
    if (!menteeUserId) {
      return NextResponse.json({ message: "menteeUserId is required" }, { status: 400 });
    }

    const programId = url.searchParams.get("programId")?.trim();
    if (!programId) {
      return NextResponse.json({ message: "programId is required" }, { status: 400 });
    }

    const limitParam = Number(url.searchParams.get("limit") ?? "10");
    const limit = Number.isNaN(limitParam) ? 10 : Math.min(Math.max(limitParam, 1), 50);

    const result = await listMatchCandidatesForMentee(actor, menteeUserId, programId, limit);

    if (!result.ok) {
      return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load mentor suggestions";
    return NextResponse.json({ message }, { status: 500 });
  }
}
