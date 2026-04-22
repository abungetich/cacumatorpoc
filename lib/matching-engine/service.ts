import {
  CheckInFrequency,
  MatchDeclineCategory,
  MentoringFormat,
  MentorshipStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { canManageMatching, isUserInActorScope, type ActorContext } from "@/lib/actor-context";
import { getMatchingSettings } from "@/lib/matching-settings";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import { resolveMentorState } from "@/lib/mentor-engine/state-machine";
import { prisma } from "@/lib/prisma";
import type { MentorMentorshipCounts, MentorSnapshot } from "@/lib/mentor-engine/types";
import {
  computeAvailabilityScore,
  computeBaseScore,
  computeCapacityScore,
  computeFormatScore,
  computeInterestsScore,
  computeRiskAdjustedScore,
  isFormatCompatible,
  resolveFitLabel,
  type MatchRiskPenalty,
  type MatchScoreBreakdown,
} from "@/lib/matching-engine/scoring";

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

type RequestMetadata = {
  ipAddress: string;
  userAgent: string;
};

type ScopeParticipant = {
  id: string;
  schoolId: string | null;
  partnerId: string | null;
};

export type MatchCandidate = {
  mentorUserId: string;
  name: string;
  school: string;
  score: number;
  baseScore: number;
  fitLabel: string;
  scoreBreakdown: MatchScoreBreakdown;
  matchReasons: string[];
  riskFlags: string[];
  priorDeclineCount: number;
  priorDeclineReasons: string[];
  derivedState: string;
  blockers: string[];
  capacity: {
    current: number;
    max: number;
  };
};

export type MatchCandidatesView = {
  mentee: {
    userId: string;
    name: string;
    schoolId: string | null;
    schoolName: string;
    preferredFormat: MentoringFormat;
    interests: string[];
  };
  items: MatchCandidate[];
};

export type MatchProposalResult = {
  mentorshipId: string;
  status: MentorshipStatus;
  mentorAccepted: boolean;
  menteeAccepted: boolean;
};

function parseJsonStringArray(value: Prisma.JsonValue | null) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  return value.filter((item): item is string => typeof item === "string");
}

function getSlotCount(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 0;
  }

  const slots = value.slots;
  return Array.isArray(slots) ? slots.length : 0;
}

function isProgramOpenToSchool(program: { schoolId: string | null; targetSchoolIds: string[] }, schoolId: string | null) {
  if (!schoolId) {
    return false;
  }

  if (program.targetSchoolIds.length > 0) {
    return program.targetSchoolIds.includes(schoolId);
  }

  if (program.schoolId) {
    return program.schoolId === schoolId;
  }

  return true;
}

function createEmptyCounts(): MentorMentorshipCounts {
  return {
    [MentorshipStatus.PENDING]: 0,
    [MentorshipStatus.ACTIVE]: 0,
    [MentorshipStatus.PAUSED]: 0,
    [MentorshipStatus.COMPLETED]: 0,
    [MentorshipStatus.TERMINATED]: 0,
  };
}

function toCountsMap(
  groupedRows: Array<{
    mentorId: string;
    status: MentorshipStatus;
    _count?: true | { _all?: number };
  }>,
) {
  const byMentor = new Map<string, MentorMentorshipCounts>();

  for (const row of groupedRows) {
    const counts = byMentor.get(row.mentorId) ?? createEmptyCounts();
    counts[row.status] = row._count && typeof row._count === "object" ? row._count._all ?? 0 : 0;
    byMentor.set(row.mentorId, counts);
  }

  return byMentor;
}

function canActorManageParticipants(actor: ActorContext, mentor: ScopeParticipant, mentee: ScopeParticipant) {
  return isUserInActorScope(actor, mentor) && isUserInActorScope(actor, mentee);
}

function extractPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${fallback} (${error.code})`;
  }
  if (error instanceof Error) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}

function normalizeReasonText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function summarizeDeclinePattern(reasons: string[]) {
  const normalized = reasons.map((reason) => normalizeReasonText(reason).toLowerCase()).filter(Boolean);
  if (normalized.some((reason) => reason.includes("time") || reason.includes("avail"))) {
    return "Previous proposal declined for timing or availability";
  }
  if (normalized.some((reason) => reason.includes("format") || reason.includes("virtual") || reason.includes("online"))) {
    return "Previous proposal declined because delivery format did not fit";
  }
  if (normalized.some((reason) => reason.includes("interest") || reason.includes("fit"))) {
    return "Previous proposal declined because the match fit felt weak";
  }
  return "Previous proposal for this pair was declined";
}

function categoryPenalty(settings: Awaited<ReturnType<typeof getMatchingSettings>>, category: MatchDeclineCategory | null | undefined) {
  switch (category) {
    case MatchDeclineCategory.AVAILABILITY:
      return settings.availabilityDeclinePenalty;
    case MatchDeclineCategory.FORMAT:
      return settings.formatDeclinePenalty;
    case MatchDeclineCategory.FIT:
      return settings.fitDeclinePenalty;
    case MatchDeclineCategory.CONTEXT:
      return settings.contextDeclinePenalty;
    default:
      return settings.otherDeclinePenalty;
  }
}

function categoryRiskLabel(category: MatchDeclineCategory | null | undefined, reasons: string[]) {
  switch (category) {
    case MatchDeclineCategory.AVAILABILITY:
      return "Previous proposal declined because timing or availability did not work";
    case MatchDeclineCategory.FORMAT:
      return "Previous proposal declined because delivery format did not fit";
    case MatchDeclineCategory.FIT:
      return "Previous proposal declined because overall mentor-mentee fit was weak";
    case MatchDeclineCategory.CONTEXT:
      return "Previous proposal declined because school, scope, or context did not fit";
    default:
      return summarizeDeclinePattern(reasons);
  }
}

function buildMatchReasons(args: {
  scoreBreakdown: MatchScoreBreakdown;
  menteeInterests: string[];
  mentorSchool: string | null;
  sameSchool: boolean;
  samePartner: boolean;
  slotCount: number;
}) {
  const reasons: string[] = [];

  if (args.scoreBreakdown.interests >= 80 && args.menteeInterests.length > 0) {
    reasons.push("Strong interest and expertise overlap");
  }
  if (args.scoreBreakdown.format >= 90) {
    reasons.push("Preferred mentoring format is aligned");
  }
  if (args.slotCount >= 2) {
    reasons.push("Availability has enough overlap to support regular sessions");
  }
  if (args.sameSchool && args.mentorSchool) {
    reasons.push(`Shared school context with ${args.mentorSchool}`);
  } else if (args.samePartner) {
    reasons.push("Shared partner network context");
  }

  if (reasons.length === 0) {
    reasons.push("Clears all matching gates for the selected program");
  }

  return reasons.slice(0, 3);
}

function buildRiskPenalties(args: {
  slotCount: number;
  currentMentees: number;
  maxMentees: number;
  schoolContext: number;
  priorDeclineReasons: string[];
  priorDeclineCategory: MatchDeclineCategory | null | undefined;
  settings: Awaited<ReturnType<typeof getMatchingSettings>>;
}): MatchRiskPenalty[] {
  const penalties: MatchRiskPenalty[] = [];

  const freeSlots = Math.max(0, args.maxMentees - args.currentMentees);
  if (args.settings.penalizeNearCapacity && args.maxMentees > 0 && freeSlots <= 1) {
    penalties.push({
      code: "CAPACITY_NEAR_LIMIT",
      label: "Near mentor capacity",
      penalty: args.settings.nearCapacityPenalty,
    });
  }

  if (args.settings.penalizeLowAvailability && args.slotCount <= 1) {
    penalties.push({
      code: "LOW_AVAILABILITY_DEPTH",
      label: "Limited availability overlap",
      penalty: args.settings.lowAvailabilityPenalty,
    });
  }

  if (args.settings.penalizeWeakContext && args.schoolContext <= 55) {
    penalties.push({
      code: "LIGHT_CONTEXT_OVERLAP",
      label: "Context overlap is weaker than top-ranked options",
      penalty: args.settings.weakContextPenalty,
    });
  }

  if (args.settings.penalizePriorDecline && args.priorDeclineReasons.length > 0) {
    penalties.push({
      code: "PRIOR_DECLINE",
      label: categoryRiskLabel(args.priorDeclineCategory, args.priorDeclineReasons),
      penalty: Math.max(args.settings.priorDeclinePenalty, categoryPenalty(args.settings, args.priorDeclineCategory)),
    });
  }

  return penalties;
}

export async function listMatchCandidatesForMentee(
  actor: ActorContext,
  menteeUserId: string,
  programId: string,
  limit: number,
): Promise<ServiceResult<MatchCandidatesView>> {
  if (!canManageMatching(actor.role)) {
    return {
      ok: false,
      status: 403,
      message: "You are not allowed to use the matching engine",
    };
  }

  const settings = await getMatchingSettings();

  const mentee = await prisma.user.findUnique({
    where: {
      id: menteeUserId,
      role: UserRole.MENTEE,
    },
    include: {
      school: {
        select: {
          name: true,
        },
      },
      menteeProfile: {
        select: {
          interests: true,
          preferredFormat: true,
        },
      },
    },
  });

  if (!mentee || !mentee.menteeProfile) {
    return {
      ok: false,
      status: 404,
      message: "Mentee not found",
    };
  }

  if (!isUserInActorScope(actor, mentee)) {
    return {
      ok: false,
      status: 403,
      message: "You cannot match mentees outside your scope",
    };
  }

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      id: true,
      schoolId: true,
      targetSchoolIds: true,
    },
  });

  if (!program) {
    return {
      ok: false,
      status: 404,
      message: "Program not found",
    };
  }

  if (!isProgramOpenToSchool(program, mentee.schoolId)) {
    return {
      ok: false,
      status: 409,
      message: "Mentee is not eligible for the selected program schools",
    };
  }

  const mentorWhere: Prisma.UserWhereInput = {
    role: UserRole.MENTOR,
    isActive: true,
    mentorProfile: {
      isNot: null,
    },
    mentorProgramApplications: {
      some: {
        programId,
        status: "APPROVED",
      },
    },
    ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { schoolId: actor.schoolId } : {}),
    ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
  };

  const mentors = await prisma.user.findMany({
    where: mentorWhere,
    include: {
      school: {
        select: {
          name: true,
        },
      },
      mentorProfile: {
        select: {
          id: true,
          status: true,
          backgroundCheckStatus: true,
          trainingCompleted: true,
          safeguardingAgreed: true,
          maxMentees: true,
          currentMentees: true,
          expertiseAreas: true,
          mentoringFormats: true,
          availability: true,
        },
      },
    },
    take: Math.min(Math.max(limit * 3, 10), 200),
  });

  const mentorIds = mentors.map((mentor) => mentor.id);
  if (mentorIds.length === 0) {
    return {
      ok: true,
      data: {
        mentee: {
          userId: mentee.id,
          name: `${mentee.firstName} ${mentee.lastName}`.trim(),
          schoolId: mentee.schoolId,
          schoolName: mentee.school?.name ?? "-",
          preferredFormat: mentee.menteeProfile.preferredFormat,
          interests: parseJsonStringArray(mentee.menteeProfile.interests),
        },
        items: [],
      },
    };
  }

  const [groupedMentorships, existingPairs, declinedPairs] = await prisma.$transaction([
    prisma.mentorship.groupBy({
      by: ["mentorId", "status"],
      where: {
        mentorId: {
          in: mentorIds,
        },
        status: {
          in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
        },
      },
      orderBy: [{ mentorId: "asc" }, { status: "asc" }],
      _count: {
        _all: true,
      },
    }),
    prisma.mentorship.findMany({
      where: {
        mentorId: {
          in: mentorIds,
        },
        menteeId: mentee.id,
        status: {
          in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
        },
      },
      select: {
        mentorId: true,
      },
    }),
    prisma.mentorship.findMany({
      where: {
        mentorId: {
          in: mentorIds,
        },
        menteeId: mentee.id,
        status: MentorshipStatus.TERMINATED,
        terminationReason: "PROPOSAL_DECLINED",
      },
      select: {
        mentorId: true,
        acceptance: {
          select: {
            declineCategory: true,
            declineReason: true,
          },
        },
      },
    }),
  ]);

  const countsByMentor = toCountsMap(groupedMentorships);
  const pairedMentorIds = new Set(existingPairs.map((pair) => pair.mentorId));
  const declinedByMentor = new Map<string, { reasons: string[]; category: MatchDeclineCategory | null }>();
  for (const item of declinedPairs) {
    const existing = declinedByMentor.get(item.mentorId) ?? { reasons: [], category: item.acceptance?.declineCategory ?? null };
    const reasons = existing.reasons;
    if (item.acceptance?.declineReason?.trim()) {
      reasons.push(item.acceptance.declineReason.trim());
    }
    declinedByMentor.set(item.mentorId, {
      reasons,
      category: item.acceptance?.declineCategory ?? existing.category ?? null,
    });
  }
  const menteeInterests = parseJsonStringArray(mentee.menteeProfile.interests);

  const candidates: MatchCandidate[] = [];

  for (const mentor of mentors) {
    if (!mentor.mentorProfile) {
      continue;
    }

    const counts = countsByMentor.get(mentor.id) ?? createEmptyCounts();
    const mentorSnapshotBase = {
      userId: mentor.id,
      profileId: mentor.mentorProfile.id,
      fullName: `${mentor.firstName} ${mentor.lastName}`.trim(),
      role: mentor.role,
      userIsActive: mentor.isActive,
      schoolId: mentor.schoolId,
      partnerId: mentor.partnerId,
      profileStatus: mentor.mentorProfile.status,
      backgroundCheckStatus: mentor.mentorProfile.backgroundCheckStatus,
      trainingCompleted: mentor.mentorProfile.trainingCompleted,
      safeguardingAgreed: mentor.mentorProfile.safeguardingAgreed,
      maxMentees: mentor.mentorProfile.maxMentees,
      currentMentees: mentor.mentorProfile.currentMentees,
      mentorshipCounts: counts,
    };
    const mentorSnapshot: MentorSnapshot = {
      ...mentorSnapshotBase,
      derivedState: resolveMentorState(mentorSnapshotBase),
    };

    const eligibility = evaluateMentorEligibility(mentorSnapshot);
    const mentorFormats = parseJsonStringArray(mentor.mentorProfile.mentoringFormats);

    const blockers: string[] = [...eligibility.blockers];
    if (!isFormatCompatible(mentee.menteeProfile.preferredFormat, mentorFormats)) {
      blockers.push("FORMAT_MISMATCH");
    }
    if (pairedMentorIds.has(mentor.id)) {
      blockers.push("ALREADY_ASSIGNED_TO_MENTEE");
    }
    if (!canActorManageParticipants(actor, mentor, mentee)) {
      blockers.push("OUT_OF_SCOPE");
    }

    if (blockers.length > 0) {
      continue;
    }

    const sameSchool = Boolean(mentor.schoolId && mentee.schoolId && mentor.schoolId === mentee.schoolId);
    const samePartner = Boolean(mentor.partnerId && mentee.partnerId && mentor.partnerId === mentee.partnerId);
    const schoolContext = sameSchool ? 100 : samePartner ? 80 : 55;
    const slotCount = getSlotCount(mentor.mentorProfile.availability);

    const scoreBreakdown: MatchScoreBreakdown = {
      interests: computeInterestsScore(menteeInterests, parseJsonStringArray(mentor.mentorProfile.expertiseAreas)),
      format: computeFormatScore(mentee.menteeProfile.preferredFormat, mentorFormats),
      availability: computeAvailabilityScore(slotCount),
      capacity: computeCapacityScore(mentor.mentorProfile.maxMentees, mentor.mentorProfile.currentMentees),
      context: schoolContext,
    };
    const priorDecline = declinedByMentor.get(mentor.id) ?? { reasons: [], category: null };
    const priorDeclineReasons = priorDecline.reasons;
    const penalties = buildRiskPenalties({
      slotCount,
      currentMentees: mentor.mentorProfile.currentMentees,
      maxMentees: mentor.mentorProfile.maxMentees,
      schoolContext,
      priorDeclineReasons,
      priorDeclineCategory: priorDecline.category,
      settings,
    });
    if (settings.excludePriorDeclinedPair && priorDeclineReasons.length > 0) {
      continue;
    }
    const baseScore = computeBaseScore(scoreBreakdown, {
      interests: settings.interestsWeight,
      context: settings.contextWeight,
      availability: settings.availabilityWeight,
      format: settings.formatWeight,
      capacity: settings.capacityWeight,
    });
    const score = computeRiskAdjustedScore(baseScore, penalties);

    candidates.push({
      mentorUserId: mentor.id,
      name: `${mentor.firstName} ${mentor.lastName}`.trim(),
      school: mentor.school?.name ?? "-",
      score,
      baseScore,
      fitLabel: resolveFitLabel(score),
      scoreBreakdown,
      matchReasons: buildMatchReasons({
        scoreBreakdown,
        menteeInterests,
        mentorSchool: mentor.school?.name ?? null,
        sameSchool,
        samePartner,
        slotCount,
      }),
      riskFlags: penalties.map((item) => item.label),
      priorDeclineCount: priorDeclineReasons.length,
      priorDeclineReasons,
      derivedState: mentorSnapshot.derivedState,
      blockers,
      capacity: {
        current: mentor.mentorProfile.currentMentees,
        max: mentor.mentorProfile.maxMentees,
      },
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  return {
    ok: true,
    data: {
      mentee: {
        userId: mentee.id,
        name: `${mentee.firstName} ${mentee.lastName}`.trim(),
        schoolId: mentee.schoolId,
        schoolName: mentee.school?.name ?? "-",
        preferredFormat: mentee.menteeProfile.preferredFormat,
        interests: menteeInterests,
      },
      items: candidates.slice(0, Math.min(Math.max(limit, 1), 50)),
    },
  };
}

type CreateMatchProposalInput = {
  actor: ActorContext;
  programId: string;
  mentorUserId: string;
  menteeUserId: string;
  checkInFrequency?: CheckInFrequency;
  requestMeta: RequestMetadata;
};

export async function createMatchProposal(input: CreateMatchProposalInput): Promise<ServiceResult<MatchProposalResult>> {
  if (!canManageMatching(input.actor.role)) {
    return {
      ok: false,
      status: 403,
      message: "You are not allowed to create match proposals",
    };
  }

  if (input.mentorUserId === input.menteeUserId) {
    return {
      ok: false,
      status: 400,
      message: "Mentor and mentee must be different users",
    };
  }

  try {
    const settings = await getMatchingSettings();
    const created = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM mentor_profiles WHERE user_id = ${input.mentorUserId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.mentorUserId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.menteeUserId} FOR UPDATE`;

        const program = await tx.program.findUnique({
          where: {
            id: input.programId,
          },
          select: {
            id: true,
            schoolId: true,
            targetSchoolIds: true,
            endDate: true,
          },
        });
        const mentor = await tx.user.findUnique({
          where: {
            id: input.mentorUserId,
          },
          include: {
            mentorProfile: {
              select: {
                id: true,
                status: true,
                backgroundCheckStatus: true,
                trainingCompleted: true,
                safeguardingAgreed: true,
                maxMentees: true,
                currentMentees: true,
              },
            },
          },
        });
        const mentee = await tx.user.findUnique({
          where: {
            id: input.menteeUserId,
          },
          include: {
            menteeProfile: {
              select: {
                id: true,
              },
            },
          },
        });
        const groupedMentorships = await tx.mentorship.groupBy({
          by: ["status"],
          where: {
            mentorId: input.mentorUserId,
          },
          orderBy: {
            status: "asc",
          },
          _count: {
            _all: true,
          },
        });

        if (!program) {
          return {
            ok: false as const,
            status: 404,
            message: "Program not found",
          };
        }

        if (!mentor || mentor.role !== UserRole.MENTOR || !mentor.mentorProfile) {
          return {
            ok: false as const,
            status: 404,
            message: "Mentor not found",
          };
        }

        if (!mentee || mentee.role !== UserRole.MENTEE || !mentee.menteeProfile) {
          return {
            ok: false as const,
            status: 404,
            message: "Mentee not found",
          };
        }

        if (!canActorManageParticipants(input.actor, mentor, mentee)) {
          return {
            ok: false as const,
            status: 403,
            message: "You can only create proposals within your scope",
          };
        }

        if (!isProgramOpenToSchool(program, mentee.schoolId)) {
          return {
            ok: false as const,
            status: 409,
            message: "Mentee must belong to one of the selected program schools",
          };
        }

        const approvedApplication = await tx.mentorProgramApplication.findUnique({
          where: {
            mentorUserId_programId: {
              mentorUserId: mentor.id,
              programId: program.id,
            },
          },
          select: {
            status: true,
          },
        });

        if (!approvedApplication || approvedApplication.status !== "APPROVED") {
          return {
            ok: false as const,
            status: 409,
            message: "Mentor must be approved for the selected program before matching",
          };
        }

        const mentorCounts = createEmptyCounts();
        for (const row of groupedMentorships) {
          mentorCounts[row.status] = row._count && typeof row._count === "object" ? row._count._all ?? 0 : 0;
        }

        const snapshot = {
          userId: mentor.id,
          profileId: mentor.mentorProfile.id,
          fullName: `${mentor.firstName} ${mentor.lastName}`.trim(),
          role: mentor.role,
          userIsActive: mentor.isActive,
          schoolId: mentor.schoolId,
          partnerId: mentor.partnerId,
          profileStatus: mentor.mentorProfile.status,
          backgroundCheckStatus: mentor.mentorProfile.backgroundCheckStatus,
          trainingCompleted: mentor.mentorProfile.trainingCompleted,
          safeguardingAgreed: mentor.mentorProfile.safeguardingAgreed,
          maxMentees: mentor.mentorProfile.maxMentees,
          currentMentees: mentor.mentorProfile.currentMentees,
          mentorshipCounts: mentorCounts,
          derivedState: resolveMentorState({
            userId: mentor.id,
            profileId: mentor.mentorProfile.id,
            fullName: `${mentor.firstName} ${mentor.lastName}`.trim(),
            role: mentor.role,
            userIsActive: mentor.isActive,
            schoolId: mentor.schoolId,
            partnerId: mentor.partnerId,
            profileStatus: mentor.mentorProfile.status,
            backgroundCheckStatus: mentor.mentorProfile.backgroundCheckStatus,
            trainingCompleted: mentor.mentorProfile.trainingCompleted,
            safeguardingAgreed: mentor.mentorProfile.safeguardingAgreed,
            maxMentees: mentor.mentorProfile.maxMentees,
            currentMentees: mentor.mentorProfile.currentMentees,
            mentorshipCounts: mentorCounts,
          }),
        };
        const eligibility = evaluateMentorEligibility(snapshot);

        if (!eligibility.canBeMatched) {
          return {
            ok: false as const,
            status: 409,
            message: "Mentor does not satisfy matching gates",
            details: eligibility.blockers,
          };
        }

        const openMenteeCount = await tx.mentorship.count({
          where: {
            menteeId: mentee.id,
            status: {
              in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
            },
          },
        });
        const existingPair = await tx.mentorship.count({
          where: {
            mentorId: mentor.id,
            menteeId: mentee.id,
            status: {
              in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
            },
          },
        });

        if (existingPair > 0) {
          return {
            ok: false as const,
            status: 409,
            message: "A pending or active proposal already exists for this pair",
          };
        }

        if (openMenteeCount >= settings.maxOpenMentorshipsPerMentee) {
          return {
            ok: false as const,
            status: 409,
            message: `Mentee has reached the open mentorship limit (${settings.maxOpenMentorshipsPerMentee})`,
          };
        }

        const mentorship = await tx.mentorship.create({
          data: {
            programId: program.id,
            mentorId: mentor.id,
            menteeId: mentee.id,
            status: MentorshipStatus.PENDING,
            scheduledEndDate: program.endDate,
            checkInFrequency: input.checkInFrequency ?? CheckInFrequency.BIWEEKLY,
          },
        });

        const acceptance = await tx.mentorshipAcceptance.create({
          data: {
            mentorshipId: mentorship.id,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "MENTORSHIP_PROPOSAL_CREATED",
            entityType: "mentorships",
            entityId: mentorship.id,
            oldValues: Prisma.JsonNull,
            newValues: {
              mentorUserId: mentor.id,
              menteeUserId: mentee.id,
              programId: program.id,
              mentorAccepted: acceptance.mentorAccepted,
              menteeAccepted: acceptance.menteeAccepted,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            mentorshipId: mentorship.id,
            status: mentorship.status,
            mentorAccepted: acceptance.mentorAccepted,
            menteeAccepted: acceptance.menteeAccepted,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!created.ok) {
      return created;
    }

    return {
      ok: true,
      data: created.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not create match proposal"),
    };
  }
}

type RespondToProposalInput = {
  actor: ActorContext;
  mentorshipId: string;
  decision: "ACCEPT" | "DECLINE";
  category?: MatchDeclineCategory;
  reason?: string;
  requestMeta: RequestMetadata;
};

export async function respondToMatchProposal(
  input: RespondToProposalInput,
): Promise<ServiceResult<MatchProposalResult>> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM mentorships WHERE id = ${input.mentorshipId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM mentorship_acceptances WHERE mentorship_id = ${input.mentorshipId} FOR UPDATE`;

        const mentorship = await tx.mentorship.findUnique({
          where: {
            id: input.mentorshipId,
          },
          include: {
            acceptance: true,
          },
        });

        if (!mentorship || !mentorship.acceptance) {
          return {
            ok: false as const,
            status: 404,
            message: "Proposal not found",
          };
        }

        if (mentorship.status !== MentorshipStatus.PENDING) {
          return {
            ok: false as const,
            status: 409,
            message: "This proposal is no longer pending",
          };
        }

        const isMentor = input.actor.id === mentorship.mentorId;
        const isMentee = input.actor.id === mentorship.menteeId;
        if (!isMentor && !isMentee) {
          return {
            ok: false as const,
            status: 403,
            message: "Only the matched mentor or mentee can respond",
          };
        }

        if (input.decision === "ACCEPT") {
          if ((isMentor && mentorship.acceptance.mentorAccepted) || (isMentee && mentorship.acceptance.menteeAccepted)) {
            return {
              ok: false as const,
              status: 409,
              message: "You already accepted this proposal",
            };
          }

          const acceptance = await tx.mentorshipAcceptance.update({
            where: {
              mentorshipId: mentorship.id,
            },
            data: isMentor
              ? {
                  mentorAccepted: true,
                  mentorRespondedAt: new Date(),
                }
              : {
                  menteeAccepted: true,
                  menteeRespondedAt: new Date(),
                },
          });

          let status: MentorshipStatus = mentorship.status;
          if (acceptance.mentorAccepted && acceptance.menteeAccepted) {
            const activated = await tx.mentorship.update({
              where: {
                id: mentorship.id,
              },
              data: {
                status: MentorshipStatus.ACTIVE,
                startedAt: new Date(),
              },
            });
            status = activated.status;

            await tx.auditLog.create({
              data: {
                userId: input.actor.id,
                action: "MENTORSHIP_ACTIVATED",
                entityType: "mentorships",
                entityId: mentorship.id,
                oldValues: {
                  status: MentorshipStatus.PENDING,
                },
                newValues: {
                  status: MentorshipStatus.ACTIVE,
                  mentorAccepted: true,
                  menteeAccepted: true,
                },
                ipAddress: input.requestMeta.ipAddress,
                userAgent: input.requestMeta.userAgent,
              },
            });
          } else {
            await tx.auditLog.create({
              data: {
                userId: input.actor.id,
                action: "MENTORSHIP_PROPOSAL_ACCEPTED",
                entityType: "mentorships",
                entityId: mentorship.id,
                oldValues: Prisma.JsonNull,
                newValues: {
                  acceptedBy: input.actor.id,
                  acceptedRole: isMentor ? "MENTOR" : "MENTEE",
                  mentorAccepted: acceptance.mentorAccepted,
                  menteeAccepted: acceptance.menteeAccepted,
                },
                ipAddress: input.requestMeta.ipAddress,
                userAgent: input.requestMeta.userAgent,
              },
            });
          }

          return {
            ok: true as const,
            data: {
              mentorshipId: mentorship.id,
              status,
              mentorAccepted: acceptance.mentorAccepted,
              menteeAccepted: acceptance.menteeAccepted,
            },
          };
        }

        const declineReason = input.reason?.trim() || null;
        const declineCategory = input.category ?? MatchDeclineCategory.OTHER;

        const acceptance = await tx.mentorshipAcceptance.update({
          where: {
            mentorshipId: mentorship.id,
          },
          data: {
            declinedByUserId: input.actor.id,
            declineCategory,
            declineReason,
            mentorRespondedAt: isMentor ? new Date() : mentorship.acceptance.mentorRespondedAt,
            menteeRespondedAt: isMentee ? new Date() : mentorship.acceptance.menteeRespondedAt,
          },
        });

        const terminated = await tx.mentorship.update({
          where: {
            id: mentorship.id,
          },
          data: {
            status: MentorshipStatus.TERMINATED,
            actualEndDate: new Date(),
            terminationReason: "PROPOSAL_DECLINED",
            terminationNotes: declineReason,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "MENTORSHIP_PROPOSAL_DECLINED",
            entityType: "mentorships",
            entityId: mentorship.id,
            oldValues: {
              status: MentorshipStatus.PENDING,
            },
            newValues: {
              status: terminated.status,
              declinedBy: input.actor.id,
              declineCategory,
              declineReason,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            mentorshipId: mentorship.id,
            status: terminated.status,
            mentorAccepted: acceptance.mentorAccepted,
            menteeAccepted: acceptance.menteeAccepted,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not respond to proposal"),
    };
  }
}
