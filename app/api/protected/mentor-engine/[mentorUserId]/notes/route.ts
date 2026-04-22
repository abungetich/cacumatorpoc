import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canViewMentor, getActorContext } from "@/lib/actor-context";
import { getMentorDetailView, getMentorSnapshotByUserId } from "@/lib/mentor-engine/service";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, mentorNoteSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ mentorUserId: string }> }) {
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

  const parsed = mentorNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { mentorUserId } = await params;
  const snapshot = await getMentorSnapshotByUserId(mentorUserId);
  if (!snapshot) {
    return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
  }

  if (!canViewMentor(actor, snapshot)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const requestMeta = getRequestMetadata(request);

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "MENTOR_NOTE_ADDED",
      entityType: "mentor_profiles",
      entityId: snapshot.profileId,
      oldValues: Prisma.JsonNull,
      newValues: {
        comment: parsed.data.message.trim(),
        noteType: "THREAD_MESSAGE",
        actorRole: actor.role,
        createdAt: new Date().toISOString(),
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  const next = await getMentorDetailView(mentorUserId);
  if (!next) {
    return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    item: next,
  });
}
