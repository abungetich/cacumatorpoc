import { MentorshipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { listRelationshipsOverview, type RelationshipRiskFilter } from "@/lib/relationship-engine/service";

const allowedRisk = new Set<RelationshipRiskFilter>(["ALL", "AT_RISK", "ON_TRACK", "REVIEW_DUE"]);
const allowedStatus = new Set<MentorshipStatus | "ALL">([
  "ALL",
  MentorshipStatus.PENDING,
  MentorshipStatus.ACTIVE,
  MentorshipStatus.PAUSED,
  MentorshipStatus.COMPLETED,
  MentorshipStatus.TERMINATED,
]);

export async function GET(request: NextRequest) {
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
  const risk = (url.searchParams.get("risk")?.trim() ?? "ALL") as RelationshipRiskFilter;
  const status = (url.searchParams.get("status")?.trim() ?? "ALL") as MentorshipStatus | "ALL";

  if (!allowedRisk.has(risk)) {
    return NextResponse.json({ message: "Invalid risk filter" }, { status: 400 });
  }

  if (!allowedStatus.has(status)) {
    return NextResponse.json({ message: "Invalid status filter" }, { status: 400 });
  }

  const result = await listRelationshipsOverview(actor, {
    search,
    risk,
    status,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
