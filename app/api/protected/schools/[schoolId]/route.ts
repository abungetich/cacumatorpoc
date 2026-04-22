import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { mapProgramRow } from "@/lib/programs-helpers";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateSchoolSchema } from "@/lib/validation";

function toLocationLabel(address: string) {
  const parts = address
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (parts.length === 0) {
    return "-";
  }

  return parts[parts.length - 1];
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "schools.read")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { schoolId } = await params;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          type: true,
        },
      },
      _count: {
        select: {
          menteeProfiles: true,
          users: true,
        },
      },
      programs: {
        select: {
          id: true,
          name: true,
          description: true,
          programType: true,
          category: true,
          themes: true,
          targetAgeGroups: true,
          geographicScope: true,
          targetSchoolIds: true,
          targetCounties: true,
          targetCountries: true,
          mentorRequirements: true,
          programFormat: true,
          sessionFrequency: true,
          sessionDurationMinutes: true,
          applicationDeadline: true,
          rollingProgram: true,
          cohortLengthMonths: true,
          maxMentors: true,
          maxMentees: true,
          programStatus: true,
          durationMonths: true,
          minSessionsPerMonth: true,
          objectives: true,
          targetEducationLevels: true,
          startDate: true,
          endDate: true,
          isActive: true,
          _count: {
            select: {
              mentorships: true,
            },
          },
        },
        orderBy: [{ isActive: "desc" }, { startDate: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 });
  }

  if (!isSchoolInActorScope(actor, school)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const adminCount = await prisma.user.count({
    where: {
      schoolId: school.id,
      role: UserRole.SCHOOL_ADMIN,
    },
  });

  return NextResponse.json({
    item: {
      id: school.id,
      name: school.name,
      type: school.type,
      address: school.address,
      location: toLocationLabel(school.address),
      phone: school.phone,
      email: school.email,
      principalName: school.principalName,
      principalEmail: school.principalEmail,
      studentPopulation: school.studentPopulation,
      accreditationStatus: school.accreditationStatus,
      partner: school.partner
        ? {
            id: school.partner.id,
            name: school.partner.name,
            type: school.partner.type,
          }
        : null,
      counts: {
        students: school._count.menteeProfiles,
        users: school._count.users,
        admins: adminCount,
      },
      programs: school.programs.map((program) => ({
        ...mapProgramRow(program),
      })),
    },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "schools.manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { schoolId } = await params;
  const existing = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      partnerId: true,
      name: true,
      type: true,
      address: true,
      phone: true,
      email: true,
      principalName: true,
      principalEmail: true,
      studentPopulation: true,
      accreditationStatus: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "School not found" }, { status: 404 });
  }

  if (!isSchoolInActorScope(actor, existing)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateSchoolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  try {
    const updated = await prisma.school.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        address: parsed.data.address,
        phone: parsed.data.phone,
        email: parsed.data.email,
        principalName: parsed.data.principalName,
        principalEmail: parsed.data.principalEmail,
        studentPopulation: parsed.data.studentPopulation ?? null,
        accreditationStatus: parsed.data.accreditationStatus ?? null,
      },
    });

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "SCHOOL_UPDATED",
        entityType: "schools",
        entityId: existing.id,
        oldValues: {
          name: existing.name,
          type: existing.type,
          address: existing.address,
          phone: existing.phone,
          email: existing.email,
          principalName: existing.principalName,
          principalEmail: existing.principalEmail,
          studentPopulation: existing.studentPopulation,
          accreditationStatus: existing.accreditationStatus,
        },
        newValues: {
          name: updated.name,
          type: updated.type,
          address: updated.address,
          phone: updated.phone,
          email: updated.email,
          principalName: updated.principalName,
          principalEmail: updated.principalEmail,
          studentPopulation: updated.studentPopulation,
          accreditationStatus: updated.accreditationStatus,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "School email already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Could not update school" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "schools.onboard")) {
    return NextResponse.json({ message: "Only platform or partner admins can delete schools" }, { status: 403 });
  }

  const { schoolId } = await params;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      partnerId: true,
      name: true,
      type: true,
      address: true,
      _count: {
        select: {
          users: true,
          menteeProfiles: true,
          programs: true,
        },
      },
    },
  });

  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 });
  }

  if (!isSchoolInActorScope(actor, school)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (school._count.users > 0 || school._count.menteeProfiles > 0 || school._count.programs > 0) {
    return NextResponse.json(
      {
        message:
          "Cannot delete this school because it has linked admins, students, or programs. Archive or reassign records first.",
      },
      { status: 409 },
    );
  }

  const requestMeta = getRequestMetadata(request);
  await prisma.$transaction(async (tx) => {
    await tx.school.delete({
      where: { id: school.id },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "SCHOOL_DELETED",
        entityType: "schools",
        entityId: school.id,
        oldValues: {
          name: school.name,
          type: school.type,
          address: school.address,
          partnerId: school.partnerId,
        },
        newValues: Prisma.JsonNull,
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
