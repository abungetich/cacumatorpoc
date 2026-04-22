import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { listMatchingIntake, type MatchingIntakeStage } from "@/lib/matching-engine/workspace";

const allowedStageFilters = new Set<MatchingIntakeStage | "ALL">([
  "ALL",
  "CONSENT_REQUIRED",
  "AWAITING_MATCHING",
  "MATCHED",
  "ACTIVE",
  "INACTIVE",
]);

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
    const search = url.searchParams.get("search")?.trim() ?? "";
    const stageParam = (url.searchParams.get("stage")?.trim() ?? "ALL") as MatchingIntakeStage | "ALL";

    if (!allowedStageFilters.has(stageParam)) {
      return NextResponse.json({ message: "Invalid stage filter" }, { status: 400 });
    }

    const result = await listMatchingIntake(actor, {
      search,
      stage: stageParam,
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load matching intake";
    return NextResponse.json({ message }, { status: 500 });
  }
}
