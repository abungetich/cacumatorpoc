import { CheckInFrequency, MentorshipStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { createMatchProposal } from "@/lib/matching-engine/service";
import { listMatchProposals } from "@/lib/matching-engine/workspace";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createMatchProposalSchema } from "@/lib/validation";

const statusFilters = new Set<"ALL" | MentorshipStatus>([
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
  const statusParam = (url.searchParams.get("status")?.trim() ?? "ALL") as "ALL" | MentorshipStatus;
  if (!statusFilters.has(statusParam)) {
    return NextResponse.json({ message: "Invalid status filter" }, { status: 400 });
  }

  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isNaN(limitParam) ? 100 : Math.min(Math.max(limitParam, 1), 200);

  const result = await listMatchProposals({
    actor,
    status: statusParam === "ALL" ? undefined : statusParam,
    limit,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createMatchProposalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const result = await createMatchProposal({
    actor,
    programId: parsed.data.programId,
    mentorUserId: parsed.data.mentorUserId,
    menteeUserId: parsed.data.menteeUserId,
    checkInFrequency: parsed.data.checkInFrequency as CheckInFrequency | undefined,
    requestMeta: getRequestMetadata(request),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    item: result.data,
  });
}
