import { randomUUID } from "crypto";
import { hash } from "bcryptjs";
import {
  EducationLevel,
  EnrollmentStatus,
  MenteeProfileStatus,
  MentoringFormat,
  MentorshipStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getActorContext, canCreateMentee } from "@/lib/actor-context";
import { authOptions } from "@/lib/auth-options";
import { resolveMenteeIntakeSnapshot } from "@/lib/mentee-intake";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";
import { prisma } from "@/lib/prisma";
import type { MenteeRow } from "@/lib/api-types";
import { buildValidationError, createMenteeSchema, normalizeEducationLevel } from "@/lib/validation";

const educationLevelMap: Record<string, EducationLevel> = {
  PRIMARY: EducationLevel.PRIMARY,
  SECONDARY: EducationLevel.SECONDARY,
  COLLEGE: EducationLevel.COLLEGE,
  UNIVERSITY: EducationLevel.UNIVERSITY,
  VOCATIONAL: EducationLevel.VOCATIONAL,
};

function toDisplayLevel(level: EducationLevel): MenteeRow["educationLevel"] {
  return `${level.charAt(0)}${level.slice(1).toLowerCase()}` as MenteeRow["educationLevel"];
}

function splitName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" ") || "-",
  };
}

function dateOnly(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "-";
}

function mapStatus(mentorship: { status: MentorshipStatus; lastSessionDate: Date | null } | null): MenteeRow["status"] {
  if (!mentorship) {
    return "Waiting";
  }

  if (mentorship.status === MentorshipStatus.PAUSED) {
    return "At Risk";
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 21);

  if (!mentorship.lastSessionDate || mentorship.lastSessionDate < cutoff) {
    return "At Risk";
  }

  return "Matched";
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const where: Prisma.MenteeProfileWhereInput =
    actor.role === UserRole.PLATFORM_ADMIN
      ? {}
      : actor.role === UserRole.PARTNER_ADMIN
        ? { school: { partnerId: actor.partnerId ?? "" } }
        : actor.role === UserRole.SCHOOL_ADMIN || actor.role === UserRole.MENTOR
          ? { schoolId: actor.schoolId ?? "" }
          : actor.role === UserRole.GUARDIAN
            ? { guardianUserId: actor.id }
            : { userId: actor.id };

  const mentees = await prisma.menteeProfile.findMany({
    where,
    include: {
      school: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          mentorshipsAsMentee: {
            where: {
              status: {
                in: [MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
              },
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
            select: {
              status: true,
              lastSessionDate: true,
              nextScheduledSession: true,
              mentor: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    items: mentees.map((profile) => {
      const activeMentorship = profile.user.mentorshipsAsMentee[0] ?? null;
      const mentorName = activeMentorship
        ? `${activeMentorship.mentor.firstName} ${activeMentorship.mentor.lastName}`.trim()
        : "Unassigned";

      return {
        id: profile.id,
        name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        school: profile.school.name,
        educationLevel: toDisplayLevel(profile.educationLevel),
        mentor: mentorName,
        nextSession: dateOnly(activeMentorship?.nextScheduledSession ?? null),
        status: mapStatus(activeMentorship),
      } satisfies MenteeRow;
    }),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canCreateMentee(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createMenteeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { name, email, phone, dateOfBirth, school: schoolName, schoolId, educationLevel: rawEducationLevel } = parsed.data;
  const levelRaw = normalizeEducationLevel(rawEducationLevel);
  const educationLevel = educationLevelMap[levelRaw];

  let school = null;
  if (schoolId) {
    school = await prisma.school.findUnique({ where: { id: schoolId } });
  } else if (actor.schoolId && actor.role === UserRole.SCHOOL_ADMIN) {
    school = await prisma.school.findUnique({ where: { id: actor.schoolId } });
  } else if (schoolName?.trim()) {
    school = await prisma.school.findFirst({
      where: {
        name: {
          contains: schoolName.trim(),
          mode: "insensitive",
        },
      },
    });
  }

  if (!school) {
    return NextResponse.json({ message: "A valid school is required" }, { status: 400 });
  }

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId && school.partnerId !== actor.partnerId) {
    return NextResponse.json({ message: "You can only create mentees in your partner network" }, { status: 403 });
  }

  const { firstName, lastName } = splitName(name);
  if (!firstName || !lastName || lastName === "-") {
    return NextResponse.json({ message: "Please provide first and last name" }, { status: 400 });
  }

  const tempPasswordHash = await hash(randomUUID(), 12);

  try {
    const dateOfBirthValue = new Date(dateOfBirth);
    const intakeSnapshot = resolveMenteeIntakeSnapshot({
      status: MenteeProfileStatus.WAITING,
      dateOfBirth: dateOfBirthValue,
      parentGuardianConsent: null,
    });
    const created = await prisma.user.create({
      data: {
        email,
        password: tempPasswordHash,
        firstName,
        lastName,
        phone,
        dateOfBirth: dateOfBirthValue,
        role: UserRole.MENTEE,
        schoolId: school.id,
        isActive: true,
        menteeProfile: {
          create: {
            schoolId: school.id,
            educationLevel,
            enrollmentStatus: EnrollmentStatus.FULL_TIME,
            interests: [],
            preferredFormat: MentoringFormat.HYBRID,
            emergencyContactName: `${firstName} ${lastName}`.trim(),
            emergencyContactPhone: phone,
            status: MenteeProfileStatus.WAITING,
            ...intakeSnapshot,
          },
        },
      },
      include: {
        menteeProfile: true,
        school: {
          select: {
            name: true,
          },
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "MENTEE_CREATED",
        entityType: "mentee_profiles",
        entityId: created.menteeProfile!.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          email: created.email,
          schoolId: created.schoolId,
          status: created.menteeProfile!.status,
        },
        ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
        userAgent: request.headers.get("user-agent") ?? "unknown",
      },
    });

    invalidatePeopleOverviewCache();

    return NextResponse.json({
      ok: true,
      item: {
        id: created.menteeProfile!.id,
        name: `${created.firstName} ${created.lastName}`.trim(),
        school: created.school?.name ?? "-",
        educationLevel: toDisplayLevel(created.menteeProfile!.educationLevel),
        mentor: "Unassigned",
        nextSession: "-",
        status: "Waiting",
      } satisfies MenteeRow,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Could not create mentee" }, { status: 500 });
  }
}
