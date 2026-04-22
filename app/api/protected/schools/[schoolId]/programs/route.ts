import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { mapProgramRow } from "@/lib/programs-helpers";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, schoolProgramSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
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
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, partnerId: true },
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

  const parsed = schoolProgramSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const created = await prisma.program.create({
    data: {
      schoolId: school.id,
      name: parsed.data.name,
      description: parsed.data.description,
      programType: parsed.data.programType,
      category: parsed.data.category,
      themes: parsed.data.themes,
      targetAgeGroups: parsed.data.targetAgeGroups,
      geographicScope: parsed.data.geographicScope,
      targetSchoolIds: parsed.data.targetSchoolIds,
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
        schoolId: school.id,
        targetSchoolIds: parsed.data.targetSchoolIds,
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
    item: mapProgramRow(created),
  });
}
