import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { mapProgramRow, toPlainDate } from "@/lib/programs-helpers";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, schoolProgramSchema } from "@/lib/validation";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string; programId: string }> },
) {
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

  const { schoolId, programId } = await params;

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

  const existing = await prisma.program.findUnique({
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
    },
  });

  if (!existing || existing.schoolId !== school.id) {
    return NextResponse.json({ message: "Program not found" }, { status: 404 });
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

  const updated = await prisma.program.update({
    where: { id: existing.id },
    data: {
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
    include: {
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
        name: existing.name,
        description: existing.description,
        programType: existing.programType,
        category: existing.category,
        themes: existing.themes,
        targetAgeGroups: existing.targetAgeGroups,
        geographicScope: existing.geographicScope,
        targetSchoolIds: existing.targetSchoolIds,
        targetCounties: existing.targetCounties,
        targetCountries: existing.targetCountries,
        mentorRequirements: existing.mentorRequirements,
        programFormat: existing.programFormat,
        sessionFrequency: existing.sessionFrequency,
        sessionDurationMinutes: existing.sessionDurationMinutes,
        applicationDeadline: existing.applicationDeadline?.toISOString() ?? null,
        rollingProgram: existing.rollingProgram,
        cohortLengthMonths: existing.cohortLengthMonths,
        maxMentors: existing.maxMentors,
        maxMentees: existing.maxMentees,
        programStatus: existing.programStatus,
        durationMonths: existing.durationMonths,
        minSessionsPerMonth: existing.minSessionsPerMonth,
        objectives: existing.objectives,
        targetEducationLevels: existing.targetEducationLevels,
        startDate: toPlainDate(existing.startDate),
        endDate: toPlainDate(existing.endDate),
        isActive: existing.isActive,
      },
      newValues: {
        name: updated.name,
        description: updated.description,
        programType: updated.programType,
        category: updated.category,
        themes: parsed.data.themes,
        targetAgeGroups: parsed.data.targetAgeGroups,
        geographicScope: updated.geographicScope,
        targetSchoolIds: parsed.data.targetSchoolIds,
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
    item: mapProgramRow(updated),
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ schoolId: string; programId: string }> },
) {
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

  const { schoolId, programId } = await params;

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

  const program = await prisma.program.findUnique({
    where: { id: programId },
    select: {
      id: true,
      schoolId: true,
      name: true,
      _count: {
        select: {
          mentorships: true,
        },
      },
    },
  });

  if (!program || program.schoolId !== school.id) {
    return NextResponse.json({ message: "Program not found" }, { status: 404 });
  }

  if (program._count.mentorships > 0) {
    return NextResponse.json(
      {
        message: "Cannot delete this program because mentorship records exist. Set it inactive instead.",
      },
      { status: 409 },
    );
  }

  await prisma.program.delete({
    where: { id: program.id },
  });

  const requestMeta = getRequestMetadata(request);
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "SCHOOL_PROGRAM_DELETED",
      entityType: "programs",
      entityId: program.id,
      oldValues: {
        name: program.name,
        schoolId: program.schoolId,
      },
      newValues: Prisma.JsonNull,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}
