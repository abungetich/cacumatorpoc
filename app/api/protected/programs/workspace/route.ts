import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { can } from "@/lib/permissions";
import { getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { mapProgramRow } from "@/lib/programs-helpers";

const allowedStatuses = new Set(["ALL", "ACTIVE", "INACTIVE"]);
const allowedLifecycleStatuses = new Set(["ALL", "DRAFT", "PUBLISHED", "ENROLLMENT_OPEN", "ACTIVE", "COMPLETED", "ARCHIVED"]);
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter((item) => item.trim().length > 0)));
}

export async function GET(request: NextRequest) {
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

  if (actor.role === UserRole.SCHOOL_ADMIN && !actor.schoolId) {
    return NextResponse.json({ message: "School admin account is missing school scope" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const schoolId = url.searchParams.get("schoolId")?.trim() ?? "";
  const status = (url.searchParams.get("status")?.trim().toUpperCase() ?? "ALL") as "ALL" | "ACTIVE" | "INACTIVE";
  const category = url.searchParams.get("category")?.trim().toUpperCase() ?? "";
  const lifecycle = (url.searchParams.get("lifecycle")?.trim().toUpperCase() ?? "ALL") as
    | "ALL"
    | "DRAFT"
    | "PUBLISHED"
    | "ENROLLMENT_OPEN"
    | "ACTIVE"
    | "COMPLETED"
    | "ARCHIVED";

  if (!allowedStatuses.has(status)) {
    return NextResponse.json({ message: "Invalid status filter" }, { status: 400 });
  }

  if (!allowedLifecycleStatuses.has(lifecycle)) {
    return NextResponse.json({ message: "Invalid lifecycle filter" }, { status: 400 });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId && schoolId && schoolId !== actor.schoolId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const schoolWhere = {
    ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
    ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { id: actor.schoolId } : {}),
  };

  const schools = await prisma.school.findMany({
    where: schoolWhere,
    select: {
      id: true,
      name: true,
      type: true,
    },
    orderBy: [{ name: "asc" }],
  });

  const scopedSchoolIds = new Set(schools.map((school) => school.id));
  const scopedSchoolIdList = Array.from(scopedSchoolIds);

  if (schoolId && !scopedSchoolIds.has(schoolId)) {
    return NextResponse.json({ message: "School not found in your scope" }, { status: 404 });
  }

  const scopeWhere =
    actor.role === UserRole.PLATFORM_ADMIN
      ? {}
      : actor.role === UserRole.PARTNER_ADMIN
        ? scopedSchoolIdList.length > 0
          ? {
              OR: [
                { schoolId: { in: scopedSchoolIdList } },
                { targetSchoolIds: { hasSome: scopedSchoolIdList } },
              ],
            }
          : { id: EMPTY_UUID }
        : actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId
          ? {
              OR: [
                { schoolId: actor.schoolId },
                { targetSchoolIds: { has: actor.schoolId } },
              ],
            }
          : {};

  const programs = await prisma.program.findMany({
    where: {
      ...scopeWhere,
      ...(status === "ACTIVE" ? { isActive: true } : {}),
      ...(status === "INACTIVE" ? { isActive: false } : {}),
      ...(category ? { category } : {}),
      ...(lifecycle !== "ALL" ? { programStatus: lifecycle } : {}),
    },
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
    orderBy: [{ isActive: "desc" }, { endDate: "asc" }, { createdAt: "desc" }],
  });

  const schoolMap = new Map(
    schools.map((school) => [
      school.id,
      {
        id: school.id,
        name: school.name,
        type: school.type,
      },
    ]),
  );

  const normalizedSearch = search.toLowerCase();
  const items = programs
    .map((program) => {
      const targetSchoolIds = uniqueValues(program.targetSchoolIds ?? []);
      const targetSchools = targetSchoolIds
        .map((id) => schoolMap.get(id))
        .filter((school): school is NonNullable<typeof school> => Boolean(school));

      return {
        ...mapProgramRow(program),
        school: program.school
          ? {
              id: program.school.id,
              name: program.school.name,
              type: program.school.type,
              partnerName: program.school.partner?.name ?? null,
            }
          : null,
        targetSchools,
      };
    })
    .filter((program) => {
      if (schoolId && program.school?.id !== schoolId && !program.targetSchoolIds.includes(schoolId)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        program.name,
        program.description,
        program.category,
        program.programType,
        program.school?.name ?? "",
        ...program.targetSchools.map((item) => item.name),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

  return NextResponse.json({
    items,
    schools: schools.map((school) => ({
      id: school.id,
      name: school.name,
      type: school.type,
    })),
  });
}
