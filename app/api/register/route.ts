import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { MentorBackgroundCheckStatus, MentorProfileStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { sendMentorVerificationEmail } from "@/lib/verification/email";
import { logVerificationEmailAttempt } from "@/lib/verification/attempts";
import { issueMentorVerificationToken } from "@/lib/verification/service";
import { buildValidationError, registerSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { firstName, lastName, email, password, role, phone, dateOfBirth, timeZone, organizationSlug } = parsed.data;
  const passwordHash = await hash(password, 12);
  const origin = new URL(request.url).origin;
  const requestMeta = getRequestMetadata(request);
  let verificationUrl = "";
  let expiresAt = new Date();
  let createdUserId = "";
  let mentorProfileId = "";

  try {
    const organization = organizationSlug
      ? await prisma.organization.findUnique({
          where: { slug: organizationSlug },
          select: {
            id: true,
            name: true,
            status: true,
            mentorParticipation: true,
          },
        })
      : null;

    if (organizationSlug) {
      if (role !== "MENTOR") {
        return NextResponse.json({ message: "Organization join is only available for mentors" }, { status: 400 });
      }

      if (!organization || organization.status !== "ACTIVE" || !organization.mentorParticipation) {
        return NextResponse.json({ message: "Selected organization is not available for mentor join" }, { status: 400 });
      }
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          firstName,
          lastName,
          phone: phone?.trim() || "PENDING_PROFILE",
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date("1970-01-01"),
          timeZone: timeZone?.trim() || null,
          role: role as UserRole,
          isActive: false,
        },
        select: {
          id: true,
        },
      });
      createdUserId = user.id;

      if (organization) {
        await tx.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            role: "MEMBER",
            status: "PENDING",
          },
        });
      }

      if (role === "MENTOR") {
        const createdProfile = await tx.mentorProfile.create({
          data: {
            userId: user.id,
            profession: "Pending onboarding",
            employer: organization?.name ?? "Independent",
            jobTitle: "Pending onboarding",
            industry: "Pending onboarding",
            yearsExperience: 0,
            expertiseAreas: [],
            mentoringFormats: ["VIRTUAL"],
            availability: { status: "PENDING_ONBOARDING" },
            hoursPerMonth: 2,
            motivation: "Registration submitted. Detailed mentor profile pending onboarding.",
            backgroundCheckStatus: MentorBackgroundCheckStatus.PENDING,
            trainingCompleted: false,
            safeguardingAgreed: false,
            status: MentorProfileStatus.PENDING,
          },
          select: {
            id: true,
          },
        });
        mentorProfileId = createdProfile.id;

        const verification = await issueMentorVerificationToken({
          tx,
          userId: user.id,
          email,
          origin,
        });
        verificationUrl = verification.verificationUrl;
        expiresAt = verification.expiresAt;
      }
    });

    const emailResult =
      role === "MENTOR"
        ? await sendMentorVerificationEmail({
            to: email,
            fullName: `${firstName} ${lastName}`.trim(),
            verificationUrl,
            expiresAt,
          })
        : { sent: false, reason: null, channel: "NONE" as const, providerStatusCode: null, providerMessage: null, providerPayload: null };

    if (role === "MENTOR" && createdUserId && mentorProfileId) {
      await logVerificationEmailAttempt({
        actorUserId: createdUserId,
        mentorProfileId,
        email,
        context: "REGISTRATION",
        result: emailResult,
        expiresAt,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      });
    }

    return NextResponse.json({
      ok: true,
      email,
      status: role === "MENTOR" ? "verify_email" : "pending",
      message:
        role === "MENTOR"
          ? emailResult.sent
            ? "Check your email to confirm your account before signing in."
            : "Your account was created, but the verification email could not be sent automatically."
          : organization
            ? `Registration submitted and linked to ${organization.name}. Awaiting approval.`
            : "Registration submitted and awaiting approval",
      verification: role === "MENTOR" ? { sent: emailResult.sent, reason: emailResult.reason } : null,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Could not create account" }, { status: 500 });
  }
}
