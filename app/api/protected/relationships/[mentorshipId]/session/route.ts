import { SessionAttendanceStatus, SessionFormat } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { logRelationshipSession } from "@/lib/relationship-engine/service";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, relationshipSessionLogSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ mentorshipId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { mentorshipId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = relationshipSessionLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const result = await logRelationshipSession({
    actor,
    mentorshipId,
    scheduledDate: parsed.data.scheduledDate,
    actualDate: parsed.data.actualDate,
    durationMinutes: parsed.data.durationMinutes,
    format: parsed.data.format as SessionFormat,
    location: parsed.data.location,
    meetingLink: parsed.data.meetingLink,
    topicsCovered: parsed.data.topicsCovered,
    sessionNotes: parsed.data.sessionNotes,
    attendanceStatus: parsed.data.attendanceStatus as SessionAttendanceStatus,
    nextScheduledSession: parsed.data.nextScheduledSession,
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
