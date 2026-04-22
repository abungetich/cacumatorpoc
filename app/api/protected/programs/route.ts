import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { can } from "@/lib/permissions";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { mapProgramRow } from "@/lib/programs-helpers";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, programWorkspaceCreateSchema } from "@/lib/validation";

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter((item) => item.trim().length > 0)));
}

export async function POST(request: NextRequest) {
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

  const payload = parsed.data;
  const resolvedSchoolId =
    actor.role === UserRole.SCHOOL_ADMIN
      ? actor.schoolId
      : payload.schoolId;
  const targetSchoolIds = uniqueValues(payload.targetSchoolIds ?? []);

  if (actor.role === UserRole.SCHOOL_ADMIN && payload.schoolId && payload.schoolId !== actor.schoolId) {
    return NextResponse.json({ message: "School admins can only create programs for their own school" }, { status: 403 });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && targetSchoolIds.some((item) => item !== actor.schoolId)) {
    return NextResponse.json({ message: "School admins can only attach their own school" }, { status: 403 });
  }

  const referencedSchoolIds = uniqueValues([...(resolvedSchoolId ? [resolvedSchoolId] : []), ...targetSchoolIds]);
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

  const referencedSchoolMap = new Map(referencedSchools.map((school) => [school.id, school]));

  if (referencedSchools.length !== referencedSchoolIds.length) {
    return NextResponse.json({ message: "One or more selected schools were not found" }, { status: 404 });
  }

  for (const school of referencedSchools) {
    if (!isSchoolInActorScope(actor, { id: school.id, partnerId: school.partnerId })) {
      return NextResponse.json({ message: "One or more selected schools are outside your scope" }, { status: 403 });
    }
  }

  const created = await prisma.program.create({
    data: {
      schoolId: resolvedSchoolId ?? null,
      name: payload.name,
      description: payload.description,
      programType: payload.programType,
      category: payload.category,
      themes: payload.themes,
      targetAgeGroups: payload.targetAgeGroups,
      geographicScope: payload.geographicScope,
      targetSchoolIds,
      targetCounties: payload.targetCounties,
      targetCountries: payload.targetCountries,
      mentorRequirements: payload.mentorRequirements,
      programFormat: payload.programFormat,
      sessionFrequency: payload.sessionFrequency,
      sessionDurationMinutes: payload.sessionDurationMinutes,
      applicationDeadline: payload.applicationDeadline ? new Date(payload.applicationDeadline) : null,
      rollingProgram: payload.rollingProgram,
      cohortLengthMonths: payload.cohortLengthMonths,
      maxMentors: payload.maxMentors,
      maxMentees: payload.maxMentees,
      programStatus: "DRAFT",
      durationMonths: payload.durationMonths,
      minSessionsPerMonth: payload.minSessionsPerMonth,
      objectives: payload.objectives,
      targetEducationLevels: payload.targetEducationLevels,
      startDate: new Date(payload.startDate),
      endDate: new Date(payload.endDate),
      isActive: payload.isActive,
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
      action: "SCHOOL_PROGRAM_CREATED",
      entityType: "programs",
      entityId: created.id,
      oldValues: Prisma.JsonNull,
      newValues: {
        schoolId: created.schoolId,
        targetSchoolIds,
        name: created.name,
        programType: created.programType,
        category: created.category,
        programStatus: created.programStatus,
        isActive: created.isActive,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...mapProgramRow(created),
      school: created.school
        ? {
            id: created.school.id,
            name: created.school.name,
            type: created.school.type,
            partnerName: created.school.partner?.name ?? null,
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
