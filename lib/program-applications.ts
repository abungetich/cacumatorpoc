import { MentorBackgroundCheckStatus, MentorProfileStatus, MentorProgramApplicationStatus, Prisma, UserRole } from "@prisma/client";
import type { ActorContext } from "@/lib/actor-context";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { prisma } from "@/lib/prisma";
import { parseStringArray } from "@/lib/programs-config";
import { normalizeMentorRequirements } from "@/lib/programs-helpers";

type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string; details?: unknown };

type RequestMeta = {
  ipAddress: string;
  userAgent: string;
};

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

function canReview(actor: ActorContext) {
  return actor.role === UserRole.PLATFORM_ADMIN || actor.role === UserRole.PARTNER_ADMIN || actor.role === UserRole.SCHOOL_ADMIN;
}

async function resolveScopedSchoolIds(actor: ActorContext) {
  if (actor.schoolId) {
    return [actor.schoolId];
  }

  if (actor.partnerId) {
    const schools = await prisma.school.findMany({
      where: {
        partnerId: actor.partnerId,
      },
      select: {
        id: true,
      },
    });
    return schools.map((school) => school.id);
  }

  return [];
}

function mentorProgramScopeWhere(actor: ActorContext, scopedSchoolIds: string[]): Prisma.ProgramWhereInput {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return {};
  }

  if (scopedSchoolIds.length > 0) {
    return {
      OR: [
        { schoolId: { in: scopedSchoolIds } },
        actor.schoolId
          ? { targetSchoolIds: { has: actor.schoolId } }
          : { targetSchoolIds: { hasSome: scopedSchoolIds } },
      ],
    };
  }

  if (actor.role === UserRole.PARTNER_ADMIN || actor.role === UserRole.SCHOOL_ADMIN) {
    return {
      id: EMPTY_UUID,
    };
  }

  return {};
}

function mapApplicationStatus(status: MentorProgramApplicationStatus) {
  return status as "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN";
}

export async function listDiscoverablePrograms(
  actor: ActorContext,
  params?: { search?: string; category?: string; status?: string },
): Promise<
  ServiceResult<{
    onboarding: {
      currentStage: string;
      profileCompletionPercentage: number;
    } | null;
    items: Array<{
      id: string;
      schoolId: string | null;
      schoolName: string;
      partnerName: string | null;
      name: string;
      description: string;
      category: "CAREER" | "ACADEMIC" | "ENTREPRENEURSHIP" | "LEADERSHIP" | "MENTAL_HEALTH" | "LIFE_SKILLS";
      programType: "FIXED" | "ROLLING" | "COHORT";
      programFormat: "VIRTUAL" | "IN_PERSON" | "HYBRID";
      programStatus: "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
      durationMonths: number;
      sessionFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY";
      sessionDurationMinutes: number;
      applicationDeadline: string | null;
      targetAgeGroups: Array<"EARLY_SECONDARY" | "SENIOR_SECONDARY" | "UNIVERSITY" | "YOUNG_PROFESSIONALS">;
      targetEducationLevels: Array<"PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL">;
      targetCounties: string[];
      targetCountries: string[];
      mentorRequirements: ReturnType<typeof normalizeMentorRequirements>;
      themes: string[];
      openApplications: number;
      myApplicationStatus: "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN" | null;
    }>;
    applications: Array<{
      id: string;
      status: "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN";
      availabilityNotes: string;
      interestAreas: string[];
      commitmentHoursPerMonth: number;
      applicationNote: string | null;
      appliedAt: string;
      reviewedAt: string | null;
      reviewNotes: string | null;
      program: {
        id: string;
        name: string;
        schoolName: string;
        category: "CAREER" | "ACADEMIC" | "ENTREPRENEURSHIP" | "LEADERSHIP" | "MENTAL_HEALTH" | "LIFE_SKILLS";
        programFormat: "VIRTUAL" | "IN_PERSON" | "HYBRID";
        programStatus: "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
      };
    }>;
  }>
> {
  if (actor.role !== UserRole.MENTOR) {
    return {
      ok: false,
      status: 403,
      message: "Only mentors can browse mentor program discovery",
    };
  }

  const onboarding = await syncMentorOnboarding(actor.id);
  const scopedSchoolIds = await resolveScopedSchoolIds(actor);

  const [programs, applications] = await prisma.$transaction([
    prisma.program.findMany({
      where: {
        ...mentorProgramScopeWhere(actor, scopedSchoolIds),
        isActive: true,
        programStatus: {
          in: ["PUBLISHED", "ENROLLMENT_OPEN", "ACTIVE"],
        },
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.status ? { programStatus: params.status } : {}),
        ...(params?.search?.trim()
          ? {
              OR: [
                { name: { contains: params.search.trim(), mode: "insensitive" } },
                { description: { contains: params.search.trim(), mode: "insensitive" } },
                { category: { contains: params.search.trim(), mode: "insensitive" } },
                { school: { name: { contains: params.search.trim(), mode: "insensitive" } } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        schoolId: true,
        targetSchoolIds: true,
        name: true,
        description: true,
        category: true,
        programType: true,
        programFormat: true,
        programStatus: true,
        durationMonths: true,
        sessionFrequency: true,
        sessionDurationMinutes: true,
        applicationDeadline: true,
        targetAgeGroups: true,
        targetEducationLevels: true,
        targetCounties: true,
        targetCountries: true,
        mentorRequirements: true,
        themes: true,
        school: {
          select: {
            name: true,
            partner: {
              select: {
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            mentorProgramApplications: true,
          },
        },
      },
      orderBy: [{ programStatus: "asc" }, { applicationDeadline: "asc" }, { createdAt: "desc" }],
    }),
    prisma.mentorProgramApplication.findMany({
      where: {
        mentorUserId: actor.id,
      },
      select: {
        id: true,
        status: true,
        availabilityNotes: true,
        interestAreas: true,
        commitmentHoursPerMonth: true,
        applicationNote: true,
        appliedAt: true,
        reviewedAt: true,
        reviewNotes: true,
        program: {
          select: {
            id: true,
            name: true,
            category: true,
            programFormat: true,
            programStatus: true,
            school: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: [{ appliedAt: "desc" }],
    }),
  ]);

  const myStatuses = new Map(applications.map((item) => [item.program.id, mapApplicationStatus(item.status)]));

  return {
    ok: true,
    data: {
      onboarding: onboarding
        ? {
            currentStage: onboarding.currentStage,
            profileCompletionPercentage: onboarding.profileCompletionPercentage,
          }
        : null,
      items: programs.map((program) => ({
        id: program.id,
        schoolId: program.schoolId,
        schoolName: program.school?.name ?? (program.targetSchoolIds.length ? "Multi-school program" : "Open program"),
        partnerName: program.school?.partner?.name ?? null,
        name: program.name,
        description: program.description,
        category: program.category as
          | "CAREER"
          | "ACADEMIC"
          | "ENTREPRENEURSHIP"
          | "LEADERSHIP"
          | "MENTAL_HEALTH"
          | "LIFE_SKILLS",
        programType: program.programType as "FIXED" | "ROLLING" | "COHORT",
        programFormat: program.programFormat as "VIRTUAL" | "IN_PERSON" | "HYBRID",
        programStatus: program.programStatus as "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED",
        durationMonths: program.durationMonths,
        sessionFrequency: program.sessionFrequency as "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY",
        sessionDurationMinutes: program.sessionDurationMinutes,
        applicationDeadline: program.applicationDeadline?.toISOString() ?? null,
        targetAgeGroups: parseStringArray(program.targetAgeGroups) as Array<
          "EARLY_SECONDARY" | "SENIOR_SECONDARY" | "UNIVERSITY" | "YOUNG_PROFESSIONALS"
        >,
        targetEducationLevels: parseStringArray(program.targetEducationLevels) as Array<
          "PRIMARY" | "SECONDARY" | "COLLEGE" | "UNIVERSITY" | "VOCATIONAL"
        >,
        targetCounties: parseStringArray(program.targetCounties),
        targetCountries: parseStringArray(program.targetCountries),
        mentorRequirements: normalizeMentorRequirements(program.mentorRequirements),
        themes: parseStringArray(program.themes),
        openApplications: program._count.mentorProgramApplications,
        myApplicationStatus: myStatuses.get(program.id) ?? null,
      })),
      applications: applications.map((item) => ({
        id: item.id,
        status: mapApplicationStatus(item.status),
        availabilityNotes: item.availabilityNotes,
        interestAreas: parseStringArray(item.interestAreas),
        commitmentHoursPerMonth: item.commitmentHoursPerMonth,
        applicationNote: item.applicationNote,
        appliedAt: item.appliedAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        reviewNotes: item.reviewNotes,
        program: {
          id: item.program.id,
          name: item.program.name,
          schoolName: item.program.school?.name ?? "Multi-school program",
          category: item.program.category as
            | "CAREER"
            | "ACADEMIC"
            | "ENTREPRENEURSHIP"
            | "LEADERSHIP"
            | "MENTAL_HEALTH"
            | "LIFE_SKILLS",
          programFormat: item.program.programFormat as "VIRTUAL" | "IN_PERSON" | "HYBRID",
          programStatus: item.program.programStatus as
            | "DRAFT"
            | "PUBLISHED"
            | "ENROLLMENT_OPEN"
            | "ACTIVE"
            | "COMPLETED"
            | "ARCHIVED",
        },
      })),
    },
  };
}

export async function applyToMentorProgram(
  actor: ActorContext,
  payload: {
    programId: string;
    availabilityNotes: string;
    interestAreas: string[];
    commitmentHoursPerMonth: number;
    applicationNote?: string;
  },
  requestMeta: RequestMeta,
): Promise<ServiceResult<{ id: string }>> {
  if (actor.role !== UserRole.MENTOR) {
    return {
      ok: false,
      status: 403,
      message: "Only mentors can apply to programs",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const onboarding = await syncMentorOnboarding(actor.id, tx);
      const mentor = await tx.user.findUnique({
        where: {
          id: actor.id,
        },
        select: {
          id: true,
          isActive: true,
          mentorProfile: {
            select: {
              status: true,
              backgroundCheckStatus: true,
              trainingCompleted: true,
              safeguardingAgreed: true,
            },
          },
        },
      });

      const program = await tx.program.findUnique({
        where: {
          id: payload.programId,
        },
        select: {
          id: true,
          schoolId: true,
          targetSchoolIds: true,
          school: {
            select: {
              id: true,
              partnerId: true,
            },
          },
          isActive: true,
          programStatus: true,
        },
      });

      if (!mentor?.mentorProfile) {
        return { ok: false as const, status: 404, message: "Mentor profile not found" };
      }

      if (!mentor.isActive) {
        return { ok: false as const, status: 409, message: "Mentor account is not active" };
      }

      if (
        mentor.mentorProfile.status !== MentorProfileStatus.APPROVED ||
        mentor.mentorProfile.backgroundCheckStatus !== MentorBackgroundCheckStatus.CLEARED ||
        !mentor.mentorProfile.trainingCompleted ||
        !mentor.mentorProfile.safeguardingAgreed
      ) {
        return {
          ok: false as const,
          status: 409,
          message: "Complete mentor approval, training, safeguarding, and background clearance before applying",
        };
      }

      if (!program) {
        return { ok: false as const, status: 404, message: "Program not found" };
      }

      if (!program.isActive || program.programStatus !== "ENROLLMENT_OPEN") {
        return { ok: false as const, status: 409, message: "This program is not accepting mentor applications right now" };
      }

      if (actor.schoolId && program.schoolId !== actor.schoolId && !program.targetSchoolIds.includes(actor.schoolId)) {
        return { ok: false as const, status: 403, message: "Program is outside your school scope" };
      }

      if (!actor.schoolId && actor.partnerId && program.school?.partnerId !== actor.partnerId) {
        return { ok: false as const, status: 403, message: "Program is outside your partner scope" };
      }

      const existing = await tx.mentorProgramApplication.findUnique({
        where: {
          mentorUserId_programId: {
            mentorUserId: actor.id,
            programId: payload.programId,
          },
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existing && existing.status !== MentorProgramApplicationStatus.REJECTED && existing.status !== MentorProgramApplicationStatus.WITHDRAWN) {
        return { ok: false as const, status: 409, message: "You already have an active application for this program" };
      }

      const application = existing
        ? await tx.mentorProgramApplication.update({
            where: {
              mentorUserId_programId: {
                mentorUserId: actor.id,
                programId: payload.programId,
              },
            },
            data: {
              status: MentorProgramApplicationStatus.PENDING,
              availabilityNotes: payload.availabilityNotes,
              interestAreas: payload.interestAreas,
              commitmentHoursPerMonth: payload.commitmentHoursPerMonth,
              applicationNote: payload.applicationNote?.trim() || null,
              appliedAt: new Date(),
              reviewedAt: null,
              reviewedById: null,
              reviewNotes: null,
            },
          })
        : await tx.mentorProgramApplication.create({
            data: {
              mentorUserId: actor.id,
              programId: payload.programId,
              availabilityNotes: payload.availabilityNotes,
              interestAreas: payload.interestAreas,
              commitmentHoursPerMonth: payload.commitmentHoursPerMonth,
              applicationNote: payload.applicationNote?.trim() || null,
            },
          });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "MENTOR_PROGRAM_APPLIED",
          entityType: "mentor_program_applications",
          entityId: application.id,
          oldValues: Prisma.JsonNull,
          newValues: {
            mentorUserId: actor.id,
            programId: payload.programId,
            status: application.status,
          },
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        },
      });

      if (onboarding) {
        await tx.mentorOnboarding.update({
          where: {
            userId: actor.id,
          },
          data: {
            currentStage: "MATCHING",
          },
        });
      }

      return {
        ok: true as const,
        data: {
          id: application.id,
        },
      };
    });

    return result;
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: error instanceof Error ? error.message : "Could not apply to program",
    };
  }
}

export async function listMentorProgramApplicationsWorkspace(
  actor: ActorContext,
  params?: { search?: string; status?: string },
): Promise<
  ServiceResult<{
    items: Array<{
      id: string;
      status: "PENDING" | "APPROVED" | "WAITLISTED" | "REJECTED" | "WITHDRAWN";
      availabilityNotes: string;
      interestAreas: string[];
      commitmentHoursPerMonth: number;
      applicationNote: string | null;
      appliedAt: string;
      reviewedAt: string | null;
      reviewNotes: string | null;
      mentor: {
        userId: string;
        name: string;
        email: string;
        onboardingStage: string | null;
      };
      program: {
        id: string;
        name: string;
        schoolId: string | null;
        schoolName: string;
        category: "CAREER" | "ACADEMIC" | "ENTREPRENEURSHIP" | "LEADERSHIP" | "MENTAL_HEALTH" | "LIFE_SKILLS";
        programStatus: "DRAFT" | "PUBLISHED" | "ENROLLMENT_OPEN" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
      };
    }>;
  }>
> {
  if (!canReview(actor)) {
    return {
      ok: false,
      status: 403,
      message: "Only admin roles can review mentor program applications",
    };
  }

  const scopedSchoolIds = await resolveScopedSchoolIds(actor);

  const items = await prisma.mentorProgramApplication.findMany({
    where: {
      program: mentorProgramScopeWhere(actor, scopedSchoolIds),
      ...(params?.status ? { status: params.status as MentorProgramApplicationStatus } : {}),
      ...(params?.search?.trim()
        ? {
            OR: [
              { mentor: { firstName: { contains: params.search.trim(), mode: "insensitive" } } },
              { mentor: { lastName: { contains: params.search.trim(), mode: "insensitive" } } },
              { mentor: { email: { contains: params.search.trim(), mode: "insensitive" } } },
              { program: { name: { contains: params.search.trim(), mode: "insensitive" } } },
              { program: { school: { name: { contains: params.search.trim(), mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      status: true,
      availabilityNotes: true,
      interestAreas: true,
      commitmentHoursPerMonth: true,
      applicationNote: true,
      appliedAt: true,
      reviewedAt: true,
      reviewNotes: true,
      mentor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          mentorOnboarding: {
            select: {
              currentStage: true,
            },
          },
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          category: true,
          programStatus: true,
          school: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { appliedAt: "desc" }],
  });

  return {
    ok: true,
    data: {
      items: items.map((item) => ({
        id: item.id,
        status: mapApplicationStatus(item.status),
        availabilityNotes: item.availabilityNotes,
        interestAreas: parseStringArray(item.interestAreas),
        commitmentHoursPerMonth: item.commitmentHoursPerMonth,
        applicationNote: item.applicationNote,
        appliedAt: item.appliedAt.toISOString(),
        reviewedAt: item.reviewedAt?.toISOString() ?? null,
        reviewNotes: item.reviewNotes,
        mentor: {
          userId: item.mentor.id,
          name: `${item.mentor.firstName} ${item.mentor.lastName}`.trim(),
          email: item.mentor.email,
          onboardingStage: item.mentor.mentorOnboarding?.currentStage ?? null,
        },
        program: {
          id: item.program.id,
          name: item.program.name,
          schoolId: item.program.schoolId,
          schoolName: item.program.school?.name ?? "Multi-school program",
          category: item.program.category as
            | "CAREER"
            | "ACADEMIC"
            | "ENTREPRENEURSHIP"
            | "LEADERSHIP"
            | "MENTAL_HEALTH"
            | "LIFE_SKILLS",
          programStatus: item.program.programStatus as
            | "DRAFT"
            | "PUBLISHED"
            | "ENROLLMENT_OPEN"
            | "ACTIVE"
            | "COMPLETED"
            | "ARCHIVED",
        },
      })),
    },
  };
}

export async function reviewMentorProgramApplication(
  actor: ActorContext,
  applicationId: string,
  status: "APPROVED" | "WAITLISTED" | "REJECTED",
  reviewNotes: string | undefined,
  requestMeta: RequestMeta,
): Promise<ServiceResult<{ id: string }>> {
  if (!canReview(actor)) {
    return {
      ok: false,
      status: 403,
      message: "Only admin roles can review mentor program applications",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.mentorProgramApplication.findUnique({
        where: {
          id: applicationId,
        },
        select: {
          id: true,
          mentorUserId: true,
          status: true,
          program: {
            select: {
              schoolId: true,
              targetSchoolIds: true,
              school: {
                select: {
                  partnerId: true,
                },
              },
            },
          },
        },
      });

      if (!existing) {
        return { ok: false as const, status: 404, message: "Application not found" };
      }

      const inScope =
        actor.role === UserRole.PLATFORM_ADMIN ||
        (actor.schoolId
          ? existing.program.schoolId === actor.schoolId || existing.program.targetSchoolIds.includes(actor.schoolId)
          : Boolean(actor.partnerId && existing.program.school?.partnerId === actor.partnerId));

      if (!inScope) {
        return { ok: false as const, status: 403, message: "Application is outside your scope" };
      }

      const updated = await tx.mentorProgramApplication.update({
        where: {
          id: applicationId,
        },
        data: {
          status: status as MentorProgramApplicationStatus,
          reviewedAt: new Date(),
          reviewedById: actor.id,
          reviewNotes: reviewNotes?.trim() || null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "MENTOR_PROGRAM_APPLICATION_REVIEWED",
          entityType: "mentor_program_applications",
          entityId: updated.id,
          oldValues: {
            status: existing.status,
          },
          newValues: {
            status: updated.status,
            reviewedById: actor.id,
          },
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        },
      });

      await syncMentorOnboarding(existing.mentorUserId, tx);

      return {
        ok: true as const,
        data: {
          id: updated.id,
        },
      };
    });

    return result;
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: error instanceof Error ? error.message : "Could not review application",
    };
  }
}
