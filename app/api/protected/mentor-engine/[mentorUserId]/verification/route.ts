import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canViewMentor, getActorContext } from "@/lib/actor-context";
import { getMentorDetailView, getMentorSnapshotByUserId } from "@/lib/mentor-engine/service";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { sendMentorVerificationEmail } from "@/lib/verification/email";
import { logVerificationEmailAttempt } from "@/lib/verification/attempts";
import { issueMentorVerificationToken } from "@/lib/verification/service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ mentorUserId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (actor.role !== UserRole.PLATFORM_ADMIN) {
    return NextResponse.json({ message: "Only platform admins can manage mentor verification" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const action =
    typeof body === "object" && body && "action" in body
      ? String((body as { action?: unknown }).action ?? "").trim().toUpperCase()
      : "";

  if (action !== "RESEND_EMAIL" && action !== "GENERATE_LINK") {
    return NextResponse.json({ message: "Unsupported verification action" }, { status: 400 });
  }

  const { mentorUserId } = await params;
  const snapshot = await getMentorSnapshotByUserId(mentorUserId);
  if (!snapshot) {
    return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
  }

  if (!canViewMentor(actor, snapshot)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const mentor = await prisma.user.findUnique({
    where: { id: mentorUserId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      emailVerifiedAt: true,
    },
  });

  if (!mentor || mentor.role !== UserRole.MENTOR) {
    return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
  }

  if (mentor.emailVerifiedAt) {
    return NextResponse.json({ message: "Email is already confirmed" }, { status: 409 });
  }

  const origin = new URL(request.url).origin;
  const requestMeta = getRequestMetadata(request);
  const { verificationUrl, expiresAt } = await issueMentorVerificationToken({
    tx: prisma,
    userId: mentor.id,
    email: mentor.email,
    origin,
  });

  if (action === "RESEND_EMAIL") {
    const emailResult = await sendMentorVerificationEmail({
      to: mentor.email,
      fullName: `${mentor.firstName} ${mentor.lastName}`.trim(),
      verificationUrl,
      expiresAt,
    });

    await logVerificationEmailAttempt({
      actorUserId: actor.id,
      mentorProfileId: snapshot.profileId,
      email: mentor.email,
      context: "ADMIN_RESEND",
      result: emailResult,
      expiresAt,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });

    if (!emailResult.sent) {
      return NextResponse.json({ message: emailResult.reason ?? "Could not send verification email" }, { status: 502 });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: action === "RESEND_EMAIL" ? "MENTOR_VERIFICATION_EMAIL_RESENT" : "MENTOR_VERIFICATION_LINK_GENERATED",
      entityType: "mentor_profiles",
      entityId: snapshot.profileId,
      oldValues: Prisma.JsonNull,
      newValues: {
        email: mentor.email,
        expiresAt: expiresAt.toISOString(),
        action,
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
    verificationUrl,
    expiresAt: expiresAt.toISOString(),
    item: next,
  });
}
