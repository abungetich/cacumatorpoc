import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { sendMentorVerificationEmail } from "@/lib/verification/email";
import { logVerificationEmailAttempt } from "@/lib/verification/attempts";
import { issueMentorVerificationToken } from "@/lib/verification/service";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const email = typeof body === "object" && body && "email" in body ? String((body as { email?: unknown }).email ?? "").trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ message: "Email is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      emailVerifiedAt: true,
      mentorProfile: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!user || user.role !== UserRole.MENTOR) {
    return NextResponse.json({ message: "Mentor account not found" }, { status: 404 });
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ message: "Email is already confirmed" }, { status: 409 });
  }

  const origin = new URL(request.url).origin;
  const { verificationUrl, expiresAt } = await issueMentorVerificationToken({
    tx: prisma,
    userId: user.id,
    email,
    origin,
  });

  const emailResult = await sendMentorVerificationEmail({
    to: email,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    verificationUrl,
    expiresAt,
  });

  if (user.mentorProfile?.id) {
    const requestMeta = getRequestMetadata(request);
    await logVerificationEmailAttempt({
      actorUserId: user.id,
      mentorProfileId: user.mentorProfile.id,
      email,
      context: "PUBLIC_RESEND",
      result: emailResult,
      expiresAt,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    });
  }

  if (!emailResult.sent) {
    return NextResponse.json({ message: emailResult.reason ?? "Could not send verification email" }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    message: "Verification email sent",
  });
}
