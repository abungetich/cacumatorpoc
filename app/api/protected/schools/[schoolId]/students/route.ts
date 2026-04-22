import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import {
  EducationLevel,
  EnrollmentStatus,
  MenteeProfileStatus,
  MentoringFormat,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { resolveMenteeIntakeSnapshot } from "@/lib/mentee-intake";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createSchoolStudentSchema, normalizeEducationLevel } from "@/lib/validation";

const educationLevelMap: Record<string, EducationLevel> = {
  PRIMARY: EducationLevel.PRIMARY,
  SECONDARY: EducationLevel.SECONDARY,
  COLLEGE: EducationLevel.COLLEGE,
  UNIVERSITY: EducationLevel.UNIVERSITY,
  VOCATIONAL: EducationLevel.VOCATIONAL,
};

function splitName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" ") || "-",
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "mentees.create")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { schoolId } = await params;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, name: true, partnerId: true },
  });
  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 });
  }

  if (!isSchoolInActorScope(actor, school)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createSchoolStudentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { firstName, lastName } = splitName(parsed.data.name);
  if (!firstName || !lastName || lastName === "-") {
    return NextResponse.json({ message: "Please provide first and last name" }, { status: 400 });
  }

  const normalizedLevel = normalizeEducationLevel(parsed.data.educationLevel);
  const educationLevel = educationLevelMap[normalizedLevel];

  if (!educationLevel) {
    return NextResponse.json({ message: "Invalid education level" }, { status: 400 });
  }

  try {
    const dateOfBirthValue = new Date(parsed.data.dateOfBirth);
    const intakeSnapshot = resolveMenteeIntakeSnapshot({
      status: MenteeProfileStatus.WAITING,
      dateOfBirth: dateOfBirthValue,
      parentGuardianConsent: null,
    });
    const passwordHash = await hash(randomUUID(), 12);
    const created = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password: passwordHash,
        firstName,
        lastName,
        phone: parsed.data.phone,
        dateOfBirth: dateOfBirthValue,
        role: UserRole.MENTEE,
        schoolId: school.id,
        partnerId: school.partnerId,
        isActive: true,
        menteeProfile: {
          create: {
            schoolId: school.id,
            educationLevel,
            enrollmentStatus: EnrollmentStatus.FULL_TIME,
            interests: [],
            preferredFormat: MentoringFormat.HYBRID,
            emergencyContactName: parsed.data.emergencyContactName || parsed.data.name,
            emergencyContactPhone: parsed.data.emergencyContactPhone || parsed.data.phone,
            status: MenteeProfileStatus.WAITING,
            ...intakeSnapshot,
          },
        },
      },
      include: {
        menteeProfile: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "SCHOOL_STUDENT_ADDED",
        entityType: "mentee_profiles",
        entityId: created.menteeProfile!.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          schoolId: school.id,
          email: created.email,
          status: created.menteeProfile!.status,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    invalidatePeopleOverviewCache();

    return NextResponse.json({
      ok: true,
      item: {
        id: created.menteeProfile!.id,
        userId: created.id,
        name: `${created.firstName} ${created.lastName}`.trim(),
        email: created.email,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Could not create student" }, { status: 500 });
  }
}
