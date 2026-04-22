import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { deriveAccountStatus } from "@/lib/auth-user";
import { syncOrganizationAdminUser } from "@/lib/organization-onboarding";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { safeSendMentorOnboardingProgressEmail } from "@/lib/mentor-onboarding/email";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";
import { prisma } from "@/lib/prisma";
import { buildValidationError, profileUpdateSchema } from "@/lib/validation";

const profileSelect = {
  id: true,
  password: true,
  firstName: true,
  middleName: true,
  lastName: true,
  phone: true,
  email: true,
  dateOfBirth: true,
  role: true,
  schoolId: true,
  partnerId: true,
  timeZone: true,
  profilePhoto: true,
  isActive: true,
  emailVerifiedAt: true,
  twoFactorEnabled: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  school: {
    select: {
      name: true,
    },
  },
  mentorProfile: {
    select: {
      status: true,
      backgroundCheckStatus: true,
      trainingCompleted: true,
      safeguardingAgreed: true,
    },
  },
  mentorOnboarding: {
    select: {
      consentSignedAt: true,
    },
  },
  organizationMemberships: {
    where: {
      role: "ADMIN",
      status: {
        in: ["ACTIVE", "PENDING"],
      },
    },
    take: 1,
    select: {
      role: true,
      status: true,
      organization: {
        select: {
          status: true,
          mentorParticipation: true,
          financialSupport: true,
          inKindSupport: true,
          primaryContactName: true,
          contactEmail: true,
          country: true,
          agreements: {
            select: {
              code: true,
              version: true,
            },
          },
        },
      },
    },
  },
  menteeProfile: {
    select: {
      status: true,
    },
  },
} as const;

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: profileSelect,
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    profile: {
      id: user.id,
      firstName: user.firstName,
      middleName: user.middleName ?? "",
      lastName: user.lastName,
      phone: user.phone === "PENDING_PROFILE" ? "" : user.phone,
      email: user.email,
      dateOfBirth: user.dateOfBirth.toISOString().startsWith("1970-01-01") ? "" : user.dateOfBirth.toISOString().slice(0, 10),
      timeZone: user.timeZone ?? "Africa/Nairobi",
      role: user.role,
      profilePhoto: user.profilePhoto,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { firstName, middleName, lastName, phone, email, dateOfBirth, timeZone, profilePhoto } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        phone: true,
        dateOfBirth: true,
        role: true,
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        firstName,
        middleName: middleName?.trim() || null,
        lastName,
        phone,
        email,
        dateOfBirth: new Date(dateOfBirth),
        timeZone,
        ...(profilePhoto !== undefined ? { profilePhoto: profilePhoto.trim() || null } : {}),
      },
      select: profileSelect,
    });

    const fullName = [updatedUser.firstName, updatedUser.middleName, updatedUser.lastName].filter(Boolean).join(" ").trim();
    const status = deriveAccountStatus(updatedUser);

    const accountStepJustCompleted =
      existingUser?.role === "MENTOR" &&
      (existingUser.phone === "PENDING_PROFILE" || existingUser.dateOfBirth.toISOString().startsWith("1970-01-01")) &&
      updatedUser.phone !== "PENDING_PROFILE" &&
      !updatedUser.dateOfBirth.toISOString().startsWith("1970-01-01");

    if (updatedUser.role === "MENTOR") {
      await syncMentorOnboarding(session.user.id);
      invalidatePeopleOverviewCache();
    }

    if (updatedUser.role === "ORGANIZATION_ADMIN") {
      await syncOrganizationAdminUser(session.user.id);
    }

    if (accountStepJustCompleted) {
      void safeSendMentorOnboardingProgressEmail({
        userId: session.user.id,
        achievedStep: "Account details completed",
        detail: "Your identity, contact, and timezone details are now on file.",
      });
    }

    return NextResponse.json({
      ok: true,
      user: {
        name: fullName,
        email: updatedUser.email,
        status,
      },
      profile: {
        id: updatedUser.id,
        firstName: updatedUser.firstName,
        middleName: updatedUser.middleName ?? "",
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        email: updatedUser.email,
        dateOfBirth: updatedUser.dateOfBirth.toISOString().slice(0, 10),
        timeZone: updatedUser.timeZone ?? "Africa/Nairobi",
        role: updatedUser.role,
        profilePhoto: updatedUser.profilePhoto,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Unable to update profile" }, { status: 500 });
  }
}
