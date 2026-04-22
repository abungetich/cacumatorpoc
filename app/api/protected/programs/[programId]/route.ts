import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type { ActorContext } from "@/lib/actor-context";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { mapProgramRow, toPlainDate } from "@/lib/programs-helpers";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, programWorkspaceCreateSchema } from "@/lib/validation";

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter((item) => item.trim().length > 0)));
}

async function getScopedSchoolIds(actor: ActorContext) {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    const schools = await prisma.school.findMany({
      select: { id: true },
    });
    return new Set(schools.map((school) => school.id));
  }

  const schools = await prisma.school.findMany({
    where: {
      ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { id: actor.schoolId } : {}),
    },
    select: { id: true },
  });

  return new Set(schools.map((school) => school.id));
}

async function resolveProgramInScope(actor: ActorContext, programId: string) {
  const scopedSchoolIds = await getScopedSchoolIds(actor);
  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      schoolId: true,
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
      school: {
        select: {
          id: true,
          partnerId: true,
          name: true,
          type: true,
          partner: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          mentorships: true,
        },
      },
    },
  });

  if (!program) {
    return {
      ok: false as const,
      status: 404,
      message: "Program not found",
    };
  }

  const isInScope =
    actor.role === UserRole.PLATFORM_ADMIN ||
    (program.schoolId ? scopedSchoolIds.has(program.schoolId) : false) ||
    uniqueValues(program.targetSchoolIds ?? []).some((id) => scopedSchoolIds.has(id));

  if (!isInScope) {
    return {
      ok: false as const,
      status: 403,
      message: "Forbidden",
    };
  }

  return {
    ok: true as const,
    data: program,
  };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "programs.manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { programId } = await params;
  const existing = await resolveProgramInScope(actor, programId);
  if (!existing.ok) {
    return NextResponse.json({ message: existing.message }, { status: existing.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = programWorkspaceCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const nextSchoolId = actor.role === UserRole.SCHOOL_ADMIN ? actor.schoolId : parsed.data.schoolId;
  const targetSchoolIds = uniqueValues(parsed.data.targetSchoolIds ?? []);

  if (actor.role === UserRole.SCHOOL_ADMIN && parsed.data.schoolId && parsed.data.schoolId !== actor.schoolId) {
    return NextResponse.json({ message: "School admins can only set their own school as owner" }, { status: 403 });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && targetSchoolIds.some((item) => item !== actor.schoolId)) {
    return NextResponse.json({ message: "School admins can only attach their own school" }, { status: 403 });
  }

  const referencedSchoolIds = uniqueValues([...(nextSchoolId ? [nextSchoolId] : []), ...targetSchoolIds]);
  const referencedSchools = referencedSchoolIds.length
    ? await prisma.school.findMany({
        where: {
          id: {
            in: referencedSchoolIds,
          },
        },
        select: {
          id: true,
          partnerId: true,
          name: true,
          type: true,
          partner: {
            select: {
              name: true,
            },
          },
        },
      })
    : [];

  if (referencedSchools.length !== referencedSchoolIds.length) {
    return NextResponse.json({ message: "One or more selected schools were not found" }, { status: 404 });
  }

  for (const school of referencedSchools) {
    if (!isSchoolInActorScope(actor, { id: school.id, partnerId: school.partnerId })) {
      return NextResponse.json({ message: "One or more selected schools are outside your scope" }, { status: 403 });
    }
  }

  const referencedSchoolMap = new Map(referencedSchools.map((school) => [school.id, school]));

  const updated = await prisma.program.update({
    where: { id: existing.data.id },
    data: {
      schoolId: nextSchoolId ?? null,
      name: parsed.data.name,
      description: parsed.data.description,
      programType: parsed.data.programType,
      category: parsed.data.category,
      themes: parsed.data.themes,
      targetAgeGroups: parsed.data.targetAgeGroups,
      geographicScope: parsed.data.geographicScope,
      targetSchoolIds,
      targetCounties: parsed.data.targetCounties,
      targetCountries: parsed.data.targetCountries,
      mentorRequirements: parsed.data.mentorRequirements,
      programFormat: parsed.data.programFormat,
      sessionFrequency: parsed.data.sessionFrequency,
      sessionDurationMinutes: parsed.data.sessionDurationMinutes,
      applicationDeadline: parsed.data.applicationDeadline ? new Date(parsed.data.applicationDeadline) : null,
      rollingProgram: parsed.data.rollingProgram,
      cohortLengthMonths: parsed.data.cohortLengthMonths,
      maxMentors: parsed.data.maxMentors,
      maxMentees: parsed.data.maxMentees,
      programStatus: parsed.data.programStatus,
      durationMonths: parsed.data.durationMonths,
      minSessionsPerMonth: parsed.data.minSessionsPerMonth,
      objectives: parsed.data.objectives,
      targetEducationLevels: parsed.data.targetEducationLevels,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      isActive: parsed.data.isActive,
    },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          type: true,
          partner: {
            select: {
              name: true,
            },
          },
        },
      },
      _count: {
        select: {
          mentorships: true,
        },
      },
    },
  });

  const requestMeta = getRequestMetadata(request);
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "SCHOOL_PROGRAM_UPDATED",
      entityType: "programs",
      entityId: updated.id,
      oldValues: {
        schoolId: existing.data.schoolId,
        name: existing.data.name,
        description: existing.data.description,
        programType: existing.data.programType,
        category: existing.data.category,
        themes: existing.data.themes,
        targetAgeGroups: existing.data.targetAgeGroups,
        geographicScope: existing.data.geographicScope,
        targetSchoolIds: existing.data.targetSchoolIds,
        targetCounties: existing.data.targetCounties,
        targetCountries: existing.data.targetCountries,
        mentorRequirements: existing.data.mentorRequirements,
        programFormat: existing.data.programFormat,
        sessionFrequency: existing.data.sessionFrequency,
        sessionDurationMinutes: existing.data.sessionDurationMinutes,
        applicationDeadline: existing.data.applicationDeadline?.toISOString() ?? null,
        rollingProgram: existing.data.rollingProgram,
        cohortLengthMonths: existing.data.cohortLengthMonths,
        maxMentors: existing.data.maxMentors,
        maxMentees: existing.data.maxMentees,
        programStatus: existing.data.programStatus,
        durationMonths: existing.data.durationMonths,
        minSessionsPerMonth: existing.data.minSessionsPerMonth,
        objectives: existing.data.objectives,
        targetEducationLevels: existing.data.targetEducationLevels,
        startDate: toPlainDate(existing.data.startDate),
        endDate: toPlainDate(existing.data.endDate),
        isActive: existing.data.isActive,
      },
      newValues: {
        schoolId: updated.schoolId,
        name: updated.name,
        description: updated.description,
        programType: updated.programType,
        category: updated.category,
        themes: parsed.data.themes,
        targetAgeGroups: parsed.data.targetAgeGroups,
        geographicScope: updated.geographicScope,
        targetSchoolIds,
        targetCounties: parsed.data.targetCounties,
        targetCountries: parsed.data.targetCountries,
        mentorRequirements: parsed.data.mentorRequirements,
        programFormat: updated.programFormat,
        sessionFrequency: updated.sessionFrequency,
        sessionDurationMinutes: updated.sessionDurationMinutes,
        applicationDeadline: updated.applicationDeadline?.toISOString() ?? null,
        rollingProgram: updated.rollingProgram,
        cohortLengthMonths: updated.cohortLengthMonths,
        maxMentors: updated.maxMentors,
        maxMentees: updated.maxMentees,
        programStatus: updated.programStatus,
        durationMonths: updated.durationMonths,
        minSessionsPerMonth: updated.minSessionsPerMonth,
        objectives: parsed.data.objectives,
        targetEducationLevels: parsed.data.targetEducationLevels,
        startDate: toPlainDate(updated.startDate),
        endDate: toPlainDate(updated.endDate),
        isActive: updated.isActive,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...mapProgramRow(updated),
      school: updated.school
        ? {
            id: updated.school.id,
            name: updated.school.name,
            type: updated.school.type,
            partnerName: updated.school.partner?.name ?? null,
          }
        : null,
      targetSchools: targetSchoolIds
        .map((id) => referencedSchoolMap.get(id))
        .filter((school): school is NonNullable<typeof school> => Boolean(school))
        .map((school) => ({
          id: school.id,
          name: school.name,
          type: school.type,
        })),
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ programId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "programs.manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { programId } = await params;
  const existing = await resolveProgramInScope(actor, programId);
  if (!existing.ok) {
    return NextResponse.json({ message: existing.message }, { status: existing.status });
  }

  if (existing.data._count.mentorships > 0) {
    return NextResponse.json(
      {
        message: "Cannot delete this program because mentorship records exist. Set it inactive instead.",
      },
      { status: 409 },
    );
  }

  await prisma.program.delete({
    where: { id: existing.data.id },
  });

  const requestMeta = getRequestMetadata(request);
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "SCHOOL_PROGRAM_DELETED",
      entityType: "programs",
      entityId: existing.data.id,
      oldValues: {
        name: existing.data.name,
        schoolId: existing.data.schoolId,
      },
      newValues: Prisma.JsonNull,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}
