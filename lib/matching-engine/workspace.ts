import {
  CheckInFrequency,
  EducationLevel,
  MenteeIntakeStage as PrismaMenteeIntakeStage,
  MenteeProfileStatus,
  MentoringFormat,
  MentorshipStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import type { ActorContext } from "@/lib/actor-context";
import { canManageMatching } from "@/lib/actor-context";
import { getMatchingSettings } from "@/lib/matching-settings";
import { prisma } from "@/lib/prisma";

type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      message: string;
      details?: unknown;
    };

export type MatchingIntakeStage = "CONSENT_REQUIRED" | "AWAITING_MATCHING" | "MATCHED" | "ACTIVE" | "INACTIVE";

export type MatchingProgramOption = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  programStatus: string;
  stateLabel: string;
  proposalEnabled: boolean;
};

export type MatchingIntakeItem = {
  profileId: string;
  userId: string;
  fullName: string;
  email: string;
  schoolId: string;
  schoolName: string;
  educationLevel: EducationLevel;
  preferredFormat: MentoringFormat;
  interests: string[];
  status: MenteeProfileStatus;
  requiresConsent: boolean;
  hasConsent: boolean;
  openMentorships: number;
  maxOpenMentorships: number;
  intakeStage: MatchingIntakeStage;
  eligibleForProposal: boolean;
  proposalBlockers: string[];
  programOptions: MatchingProgramOption[];
  createdAt: string;
};

export type MatchingIntakeView = {
  items: MatchingIntakeItem[];
};

export type MatchingOverviewView = {
  summary: {
    awaiting: number;
    blockedByConsent: number;
    pending: number;
    active: number;
    readyForProposal: number;
    blockedByNoEligiblePrograms: number;
    blockedByProgramState: number;
    blockedByCapacity: number;
    runnablePrograms: number;
    nonRunnablePrograms: number;
    matchableMentors: number;
    approvedMentorsForRunnablePrograms: number;
    mentorSupplyGap: number;
  };
  insights: {
    severityCounts: {
      high: number;
      medium: number;
      low: number;
    };
    bottlenecks: Array<{
      key: "consent" | "programs" | "capacity" | "mentor_supply";
      label: string;
      value: number;
      tone: "rose" | "amber" | "sky" | "emerald";
      detail: string;
    }>;
    recommendations: string[];
  };
};

export type MatchProposalQueueItem = {
  mentorshipId: string;
  status: MentorshipStatus;
  createdAt: string;
  startedAt: string | null;
  scheduledEndDate: string;
  checkInFrequency: CheckInFrequency;
  terminationReason: string | null;
  terminationNotes: string | null;
  program: {
    id: string;
    name: string;
    schoolId: string;
    schoolName: string;
  };
  mentor: {
    userId: string;
    name: string;
    email: string;
    accepted: boolean;
    respondedAt: string | null;
  };
  mentee: {
    userId: string;
    name: string;
    email: string;
    accepted: boolean;
    respondedAt: string | null;
  };
  declinedByUserId: string | null;
  declineReason: string | null;
};

export type MatchProposalQueueView = {
  items: MatchProposalQueueItem[];
};

type ListMatchProposalsInput = {
  actor: ActorContext;
  status?: MentorshipStatus;
  limit?: number;
};

function parseJsonStringArray(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function toDateString(value: Date | null) {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
}

function resolveProgramState(programStatus: string, startDate: Date | null, endDate: Date | null) {
  const today = new Date();
  const status = programStatus.trim().toUpperCase();

  if (status === "ACTIVE") {
    return {
      stateLabel: endDate && endDate < today ? "Completed window" : "Running now",
      proposalEnabled: true,
    };
  }

  if (status === "ENROLLMENT_OPEN") {
    return {
      stateLabel: "Enrollment open",
      proposalEnabled: true,
    };
  }

  if (status === "PUBLISHED") {
    return {
      stateLabel: startDate && startDate > today ? "Upcoming" : "Published",
      proposalEnabled: true,
    };
  }

  if (status === "COMPLETED") {
    return {
      stateLabel: "Completed",
      proposalEnabled: false,
    };
  }

  if (status === "ARCHIVED") {
    return {
      stateLabel: "Archived",
      proposalEnabled: false,
    };
  }

  return {
    stateLabel: "Draft / not runnable",
    proposalEnabled: false,
  };
}

function resolveMatchingScopeWhere(
  actor: ActorContext,
): ServiceResult<{
  menteeWhere: Prisma.MenteeProfileWhereInput;
  mentorshipWhere: Prisma.MentorshipWhereInput;
}> {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return {
      ok: true,
      data: {
        menteeWhere: {},
        mentorshipWhere: {},
      },
    };
  }

  if (actor.role === UserRole.PARTNER_ADMIN) {
    if (!actor.partnerId) {
      return {
        ok: false,
        status: 403,
        message: "Partner admin account is missing partner scope",
      };
    }

    return {
      ok: true,
      data: {
        menteeWhere: {
          school: {
            partnerId: actor.partnerId,
          },
        },
        mentorshipWhere: {
          program: {
            school: {
              partnerId: actor.partnerId,
            },
          },
        },
      },
    };
  }

  if (actor.role === UserRole.SCHOOL_ADMIN) {
    if (!actor.schoolId) {
      return {
        ok: false,
        status: 403,
        message: "School admin account is missing school scope",
      };
    }

    return {
      ok: true,
      data: {
        menteeWhere: {
          schoolId: actor.schoolId,
        },
        mentorshipWhere: {
          program: {
            schoolId: actor.schoolId,
          },
        },
      },
    };
  }

  if (actor.role === UserRole.MENTOR) {
    return {
      ok: true,
      data: {
        menteeWhere: {
          user: {
            mentorshipsAsMentee: {
              some: {
                mentorId: actor.id,
              },
            },
          },
        },
        mentorshipWhere: {
          mentorId: actor.id,
        },
      },
    };
  }

  if (actor.role === UserRole.MENTEE) {
    return {
      ok: true,
      data: {
        menteeWhere: {
          userId: actor.id,
        },
        mentorshipWhere: {
          menteeId: actor.id,
        },
      },
    };
  }

  return {
    ok: true,
    data: {
      menteeWhere: {
        guardianUserId: actor.id,
      },
      mentorshipWhere: {
        mentee: {
          menteeProfile: {
            guardianUserId: actor.id,
          },
        },
      },
    },
  };
}

function isProgramEligibleForEducationLevel(targetEducationLevels: string[], level: EducationLevel) {
  if (targetEducationLevels.length === 0) {
    return true;
  }

  return targetEducationLevels
    .map((value) => value.trim().toUpperCase())
    .includes(level);
}

function isProgramOpenToSchool(program: { schoolId: string | null; targetSchoolIds: string[] }, schoolId: string) {
  if (program.targetSchoolIds.length > 0) {
    return program.targetSchoolIds.includes(schoolId);
  }

  if (program.schoolId) {
    return program.schoolId === schoolId;
  }

  return true;
}

export async function listMatchingIntake(
  actor: ActorContext,
  params?: {
    search?: string;
    stage?: MatchingIntakeStage | "ALL";
  },
): Promise<ServiceResult<MatchingIntakeView>> {
  if (!canManageMatching(actor.role)) {
    return {
      ok: false,
      status: 403,
      message: "Only admins can access matching intake",
    };
  }

  const scope = resolveMatchingScopeWhere(actor);
  if (!scope.ok) {
    return scope;
  }

  const profiles = await prisma.menteeProfile.findMany({
    where: {
      ...scope.data.menteeWhere,
      status: {
        in: [
          MenteeProfileStatus.WAITING,
          MenteeProfileStatus.MATCHED,
          MenteeProfileStatus.ACTIVE,
          MenteeProfileStatus.INACTIVE,
        ],
      },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      educationLevel: true,
      preferredFormat: true,
      interests: true,
      parentGuardianConsent: true,
      intakeStageCached: true,
      requiresConsentCached: true,
      hasConsentCached: true,
      schoolId: true,
      createdAt: true,
      school: {
        select: {
          name: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const menteeIds = profiles.map((profile) => profile.userId);
  const schoolIds = Array.from(new Set(profiles.map((profile) => profile.schoolId)));

  const mentorshipGroups = menteeIds.length
    ? await prisma.mentorship.groupBy({
        by: ["menteeId", "status"],
        where: {
          menteeId: {
            in: menteeIds,
          },
          status: {
            in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
          },
        },
        _count: {
          _all: true,
        },
      })
    : [];

  const programs = schoolIds.length
      ? await prisma.program.findMany({
        where: {
          OR: [
            {
              schoolId: {
                in: schoolIds,
              },
            },
            {
              targetSchoolIds: {
                hasSome: schoolIds,
              },
            },
          ],
          isActive: true,
        },
        select: {
          id: true,
          schoolId: true,
          targetSchoolIds: true,
          name: true,
          programStatus: true,
          startDate: true,
          endDate: true,
          targetEducationLevels: true,
        },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const mentorshipCounts = new Map<
    string,
    {
      pending: number;
      active: number;
      paused: number;
    }
  >();
  for (const row of mentorshipGroups) {
    const current = mentorshipCounts.get(row.menteeId) ?? {
      pending: 0,
      active: 0,
      paused: 0,
    };

    if (row.status === MentorshipStatus.PENDING) {
      current.pending += row._count._all;
    } else if (row.status === MentorshipStatus.ACTIVE) {
      current.active += row._count._all;
    } else if (row.status === MentorshipStatus.PAUSED) {
      current.paused += row._count._all;
    }

    mentorshipCounts.set(row.menteeId, current);
  }

  const normalizedSearch = params?.search?.trim().toLowerCase() ?? "";
  const settings = await getMatchingSettings();

  const items = profiles
    .map((profile) => {
      const counts = mentorshipCounts.get(profile.userId) ?? {
        pending: 0,
        active: 0,
        paused: 0,
      };
      const openMentorships = counts.pending + counts.active + counts.paused;
      const requiresConsent = profile.requiresConsentCached;
      const hasConsent = profile.hasConsentCached;
      const intakeStage = profile.intakeStageCached as MatchingIntakeStage;

      const programOptions = programs
        .filter((program) => {
          if (!isProgramOpenToSchool(program, profile.schoolId)) {
            return false;
          }

          const targets = parseJsonStringArray(program.targetEducationLevels);
          return isProgramEligibleForEducationLevel(targets, profile.educationLevel);
        })
        .map((program) => {
          const programState = resolveProgramState(program.programStatus, program.startDate, program.endDate);

          return {
            id: program.id,
            name: program.name,
            startDate: toDateString(program.startDate),
            endDate: toDateString(program.endDate),
            programStatus: program.programStatus,
            stateLabel: programState.stateLabel,
            proposalEnabled: programState.proposalEnabled,
          };
        });

      const proposalBlockers: string[] = [];
      if (requiresConsent && !hasConsent) {
        proposalBlockers.push("Guardian consent is still required");
      }
      if (profile.status === MenteeProfileStatus.INACTIVE || intakeStage === "INACTIVE") {
        proposalBlockers.push("Learner is inactive");
      }
      if (programOptions.length === 0) {
        proposalBlockers.push("No eligible programs are available for this learner");
      }
      if (programOptions.length > 0 && !programOptions.some((program) => program.proposalEnabled)) {
        proposalBlockers.push("Eligible programs exist, but none are currently open for matching");
      }
      if (openMentorships >= settings.maxOpenMentorshipsPerMentee) {
        proposalBlockers.push(
          `Learner already has ${openMentorships} open mentorship${openMentorships === 1 ? "" : "s"} and has reached the limit (${settings.maxOpenMentorshipsPerMentee})`,
        );
      }

      const eligibleForProposal = proposalBlockers.length === 0;

      return {
        profileId: profile.id,
        userId: profile.user.id,
        fullName: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        email: profile.user.email,
        schoolId: profile.schoolId,
        schoolName: profile.school.name,
        educationLevel: profile.educationLevel,
        preferredFormat: profile.preferredFormat,
        interests: parseJsonStringArray(profile.interests),
        status: profile.status,
        requiresConsent,
        hasConsent,
        openMentorships,
        maxOpenMentorships: settings.maxOpenMentorshipsPerMentee,
        intakeStage,
        eligibleForProposal,
        proposalBlockers,
        programOptions,
        createdAt: profile.createdAt.toISOString(),
      } satisfies MatchingIntakeItem;
    })
    .filter((item) => {
      if (params?.stage && params.stage !== "ALL" && item.intakeStage !== params.stage) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        item.fullName,
        item.email,
        item.schoolName,
        item.educationLevel,
        item.preferredFormat,
        item.intakeStage,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

  return {
    ok: true,
    data: {
      items,
    },
  };
}

export async function getMatchingOverview(actor: ActorContext): Promise<ServiceResult<MatchingOverviewView>> {
  if (!canManageMatching(actor.role)) {
    return {
      ok: false,
      status: 403,
      message: "Only admins can access matching overview",
    };
  }

  const scope = resolveMatchingScopeWhere(actor);
  if (!scope.ok) {
    return scope;
  }

  const [awaiting, blockedByConsent, pending, active, profiles, programs, matchableMentors, approvedMentorsForRunnablePrograms] = await Promise.all([
    prisma.menteeProfile.count({
      where: {
        AND: [
          scope.data.menteeWhere,
          {
            intakeStageCached: PrismaMenteeIntakeStage.AWAITING_MATCHING,
          },
        ],
      },
    }),
    prisma.menteeProfile.count({
      where: {
        AND: [
          scope.data.menteeWhere,
          {
            intakeStageCached: PrismaMenteeIntakeStage.CONSENT_REQUIRED,
          },
        ],
      },
    }),
    prisma.mentorship.count({
      where: {
        ...scope.data.mentorshipWhere,
        status: MentorshipStatus.PENDING,
      },
    }),
    prisma.mentorship.count({
      where: {
        ...scope.data.mentorshipWhere,
        status: MentorshipStatus.ACTIVE,
      },
    }),
    prisma.menteeProfile.findMany({
      where: {
        ...scope.data.menteeWhere,
        status: {
          in: [
            MenteeProfileStatus.WAITING,
            MenteeProfileStatus.MATCHED,
            MenteeProfileStatus.ACTIVE,
            MenteeProfileStatus.INACTIVE,
          ],
        },
      },
      select: {
        userId: true,
        schoolId: true,
        educationLevel: true,
        status: true,
        requiresConsentCached: true,
        hasConsentCached: true,
      },
    }),
    prisma.program.findMany({
      where:
        actor.role === UserRole.PLATFORM_ADMIN
          ? { isActive: true }
          : actor.role === UserRole.PARTNER_ADMIN && actor.partnerId
            ? {
                isActive: true,
                school: {
                  partnerId: actor.partnerId,
                },
              }
            : actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId
              ? {
                  isActive: true,
                  OR: [
                    { schoolId: actor.schoolId },
                    { targetSchoolIds: { has: actor.schoolId } },
                  ],
                }
              : { id: "__no_matching_scope__" },
      select: {
        id: true,
        schoolId: true,
        targetSchoolIds: true,
        targetEducationLevels: true,
        programStatus: true,
        startDate: true,
        endDate: true,
      },
    }),
    prisma.mentorOnboarding.count({
      where:
        actor.role === UserRole.PLATFORM_ADMIN
          ? { canBeMatched: true }
          : actor.role === UserRole.PARTNER_ADMIN && actor.partnerId
            ? {
                canBeMatched: true,
                user: {
                  OR: [{ partnerId: actor.partnerId }, { school: { partnerId: actor.partnerId } }],
                },
              }
            : actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId
              ? {
                  canBeMatched: true,
                  user: {
                    schoolId: actor.schoolId,
                  },
                }
              : { userId: "__no_matching_scope__" },
    }),
    prisma.mentorProgramApplication.findMany({
      where:
        actor.role === UserRole.PLATFORM_ADMIN
          ? {
              status: "APPROVED",
              mentorUser: {
                mentorOnboarding: {
                  canBeMatched: true,
                },
              },
              program: {
                isActive: true,
                programStatus: {
                  in: ["ACTIVE", "ENROLLMENT_OPEN", "PUBLISHED"],
                },
              },
            }
          : actor.role === UserRole.PARTNER_ADMIN && actor.partnerId
            ? {
                status: "APPROVED",
                mentorUser: {
                  mentorOnboarding: {
                    canBeMatched: true,
                  },
                },
                program: {
                  isActive: true,
                  programStatus: {
                    in: ["ACTIVE", "ENROLLMENT_OPEN", "PUBLISHED"],
                  },
                  school: {
                    partnerId: actor.partnerId,
                  },
                },
              }
            : actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId
              ? {
                  status: "APPROVED",
                  mentorUser: {
                    mentorOnboarding: {
                      canBeMatched: true,
                    },
                  },
                  program: {
                    isActive: true,
                    programStatus: {
                      in: ["ACTIVE", "ENROLLMENT_OPEN", "PUBLISHED"],
                    },
                    OR: [{ schoolId: actor.schoolId }, { targetSchoolIds: { has: actor.schoolId } }],
                  },
                }
              : {
                  mentorUserId: "00000000-0000-0000-0000-000000000000",
                },
      distinct: ["mentorUserId"],
      select: {
        mentorUserId: true,
      },
    }),
  ]);

  const settings = await getMatchingSettings();

  const mentorshipGroups = profiles.length
    ? await prisma.mentorship.groupBy({
        by: ["menteeId", "status"],
        where: {
          menteeId: { in: profiles.map((profile) => profile.userId) },
          status: { in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED] },
        },
        _count: { _all: true },
      })
    : [];

  const mentorshipCounts = new Map<string, number>();
  for (const row of mentorshipGroups) {
    mentorshipCounts.set(row.menteeId, (mentorshipCounts.get(row.menteeId) ?? 0) + row._count._all);
  }

  const runnableProgramIds = new Set(
    programs
      .filter((program) => resolveProgramState(program.programStatus, program.startDate, program.endDate).proposalEnabled)
      .map((program) => program.id),
  );
  const runnablePrograms = runnableProgramIds.size;
  const nonRunnablePrograms = Math.max(programs.length - runnablePrograms, 0);

  let readyForProposal = 0;
  let blockedByNoEligiblePrograms = 0;
  let blockedByProgramState = 0;
  let blockedByCapacity = 0;

  for (const profile of profiles) {
    const eligiblePrograms = programs.filter((program) => {
      if (!isProgramOpenToSchool(program, profile.schoolId)) {
        return false;
      }
      const targets = parseJsonStringArray(program.targetEducationLevels);
      return isProgramEligibleForEducationLevel(targets, profile.educationLevel);
    });

    const hasEligiblePrograms = eligiblePrograms.length > 0;
    const hasRunnableProgram = eligiblePrograms.some((program) => runnableProgramIds.has(program.id));
    const openMentorships = mentorshipCounts.get(profile.userId) ?? 0;

    const blockers: string[] = [];
    if (profile.requiresConsentCached && !profile.hasConsentCached) {
      blockers.push("consent");
    }
    if (profile.status === MenteeProfileStatus.INACTIVE) {
      blockers.push("inactive");
    }
    if (!hasEligiblePrograms) {
      blockers.push("no_programs");
    }
    if (hasEligiblePrograms && !hasRunnableProgram) {
      blockers.push("program_state");
    }
    if (openMentorships >= settings.maxOpenMentorshipsPerMentee) {
      blockers.push("capacity");
    }

    if (blockers.length === 0) {
      readyForProposal += 1;
    }
    if (blockers.includes("no_programs")) {
      blockedByNoEligiblePrograms += 1;
    }
    if (blockers.includes("program_state")) {
      blockedByProgramState += 1;
    }
    if (blockers.includes("capacity")) {
      blockedByCapacity += 1;
    }
  }

  const approvedMentorSupply = approvedMentorsForRunnablePrograms.length;
  const mentorSupplyGap = Math.max(readyForProposal - approvedMentorSupply, 0);

  const bottlenecks = [
    {
      key: "mentor_supply" as const,
      label: "Mentor supply gap",
      value: mentorSupplyGap,
      tone: mentorSupplyGap > 0 ? ("rose" as const) : ("emerald" as const),
      detail:
        mentorSupplyGap > 0
          ? `${readyForProposal} learners are ready, but only ${approvedMentorSupply} approved mentors are currently positioned for runnable programs.`
          : `${approvedMentorSupply} approved mentors are currently available for runnable programs.`,
    },
    {
      key: "consent" as const,
      label: "Consent blockers",
      value: blockedByConsent,
      tone: blockedByConsent > 0 ? ("amber" as const) : ("emerald" as const),
      detail:
        blockedByConsent > 0
          ? `${blockedByConsent} learners still need guardian or consent clearance before matching can start.`
          : "No learners are currently blocked only by consent.",
    },
    {
      key: "programs" as const,
      label: "Program availability blockers",
      value: blockedByNoEligiblePrograms + blockedByProgramState,
      tone: blockedByNoEligiblePrograms + blockedByProgramState > 0 ? ("sky" as const) : ("emerald" as const),
      detail:
        blockedByNoEligiblePrograms + blockedByProgramState > 0
          ? `${blockedByNoEligiblePrograms} learners have no eligible program and ${blockedByProgramState} only have non-runnable program options.`
          : `${runnablePrograms} runnable programs are currently available for matching.`,
    },
    {
      key: "capacity" as const,
      label: "Learner capacity blockers",
      value: blockedByCapacity,
      tone: blockedByCapacity > 0 ? ("rose" as const) : ("emerald" as const),
      detail:
        blockedByCapacity > 0
          ? `${blockedByCapacity} learners have reached the open relationship limit of ${settings.maxOpenMentorshipsPerMentee}.`
          : "No learners are blocked by the current open relationship limit.",
    },
  ];

  const severityCounts = {
    high: bottlenecks.filter((item) => item.tone === "rose").length,
    medium: bottlenecks.filter((item) => item.tone === "amber" || item.tone === "sky").length,
    low: bottlenecks.filter((item) => item.tone === "emerald").length,
  };

  const recommendations: string[] = [];
  if (mentorSupplyGap > 0) {
    recommendations.push(`Approve or recruit at least ${mentorSupplyGap} more mentors for runnable programs to cover currently ready learners.`);
  }
  if (blockedByConsent > 0) {
    recommendations.push(`Resolve guardian and consent clearance for ${blockedByConsent} learner${blockedByConsent === 1 ? "" : "s"} before opening new proposals.`);
  }
  if (blockedByNoEligiblePrograms > 0) {
    recommendations.push(`Create or attach eligible programs for ${blockedByNoEligiblePrograms} learner${blockedByNoEligiblePrograms === 1 ? "" : "s"} who currently have no program path.`);
  }
  if (blockedByProgramState > 0 || runnablePrograms === 0) {
    recommendations.push(`Publish or activate more runnable programs. ${blockedByProgramState} learner${blockedByProgramState === 1 ? "" : "s"} only have draft, archived, or closed program options.`);
  }
  if (blockedByCapacity > 0) {
    recommendations.push(`Review learner capacity settings or close completed relationships for ${blockedByCapacity} learner${blockedByCapacity === 1 ? "" : "s"} at the open-relationship limit.`);
  }
  if (recommendations.length === 0) {
    recommendations.push("Matching supply and program readiness look healthy. Focus on proposal throughput and response times.");
  }

  return {
    ok: true,
    data: {
      summary: {
        awaiting,
        blockedByConsent,
        pending,
        active,
        readyForProposal,
        blockedByNoEligiblePrograms,
        blockedByProgramState,
        blockedByCapacity,
        runnablePrograms,
        nonRunnablePrograms,
        matchableMentors,
        approvedMentorsForRunnablePrograms: approvedMentorSupply,
        mentorSupplyGap,
      },
      insights: {
        severityCounts,
        bottlenecks,
        recommendations,
      },
    },
  };
}

export async function listMatchProposals(input: ListMatchProposalsInput): Promise<ServiceResult<MatchProposalQueueView>> {
  const scope = resolveMatchingScopeWhere(input.actor);
  if (!scope.ok) {
    return scope;
  }

  const limit = Math.min(Math.max(input.limit ?? 100, 1), 200);

  const items = await prisma.mentorship.findMany({
    where: {
      ...scope.data.mentorshipWhere,
      ...(input.status ? { status: input.status } : {}),
    },
    select: {
      id: true,
      status: true,
      createdAt: true,
      startedAt: true,
      scheduledEndDate: true,
      checkInFrequency: true,
      terminationReason: true,
      terminationNotes: true,
      mentor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      mentee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          school: {
            select: {
              name: true,
            },
          },
        },
      },
      acceptance: {
        select: {
          mentorAccepted: true,
          mentorRespondedAt: true,
          menteeAccepted: true,
          menteeRespondedAt: true,
          declinedByUserId: true,
          declineReason: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return {
    ok: true,
    data: {
      items: items.map((item) => ({
        mentorshipId: item.id,
        status: item.status,
        createdAt: item.createdAt.toISOString(),
        startedAt: item.startedAt ? item.startedAt.toISOString() : null,
        scheduledEndDate: toDateString(item.scheduledEndDate),
        checkInFrequency: item.checkInFrequency,
        terminationReason: item.terminationReason,
        terminationNotes: item.terminationNotes,
        program: {
          id: item.program.id,
          name: item.program.name,
          schoolId: item.program.schoolId ?? "",
          schoolName: item.program.school?.name ?? "Open program",
        },
        mentor: {
          userId: item.mentor.id,
          name: `${item.mentor.firstName} ${item.mentor.lastName}`.trim(),
          email: item.mentor.email,
          accepted: item.acceptance?.mentorAccepted ?? false,
          respondedAt: item.acceptance?.mentorRespondedAt ? item.acceptance.mentorRespondedAt.toISOString() : null,
        },
        mentee: {
          userId: item.mentee.id,
          name: `${item.mentee.firstName} ${item.mentee.lastName}`.trim(),
          email: item.mentee.email,
          accepted: item.acceptance?.menteeAccepted ?? false,
          respondedAt: item.acceptance?.menteeRespondedAt ? item.acceptance.menteeRespondedAt.toISOString() : null,
        },
        declinedByUserId: item.acceptance?.declinedByUserId ?? null,
        declineReason: item.acceptance?.declineReason ?? null,
      })),
    },
  };
}
