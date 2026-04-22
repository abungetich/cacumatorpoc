import { MenteeIntakeStage as PrismaMenteeIntakeStage, MentorshipStatus, UserRole, type Prisma } from "@prisma/client";
import { revalidateTag, unstable_cache } from "next/cache";
import type { MenteeIntakeRow, PeopleMenteesResponse, PeopleMentorsResponse, PeopleOverviewResponse } from "@/lib/api-types/people";
import type { MentorIntakeRow, MentorIntakeState } from "@/lib/api-types/mentors";
import { resolveMenteeIntakeSnapshot } from "@/lib/mentee-intake";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import { resolveMentorState } from "@/lib/mentor-engine/state-machine";
import { prisma } from "@/lib/prisma";

type PeopleActor = {
  role: "PLATFORM_ADMIN" | "PARTNER_ADMIN" | "SCHOOL_ADMIN";
  partnerId: string | null;
  schoolId: string | null;
};

type PaginationInput = {
  page: number;
  pageSize: number;
};

type MentorQueryInput = PaginationInput & {
  search?: string;
  mentorState?: string;
  newRegistrationsOnly?: boolean;
  declinedConsentsOnly?: boolean;
};

type MenteeQueryInput = PaginationInput & {
  search?: string;
  menteeStage?: string;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const NEW_MENTOR_WINDOW_DAYS = 7;
const PEOPLE_OVERVIEW_TAG = "people-overview";

function normalizeSearch(value?: string | null) {
  return value?.trim() ?? "";
}

function parsePositiveInt(value?: string | null, fallback = DEFAULT_PAGE) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(searchParams: URLSearchParams): PaginationInput {
  return {
    page: parsePositiveInt(searchParams.get("page"), DEFAULT_PAGE),
    pageSize: Math.min(parsePositiveInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
  };
}

function paginate<T>(items: T[], pagination: PaginationInput) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);
  const start = (page - 1) * pagination.pageSize;

  return {
    page,
    pageSize: pagination.pageSize,
    totalItems,
    totalPages,
    items: items.slice(start, start + pagination.pageSize),
  };
}

function buildMentorWhere(actor: PeopleActor, options?: { search?: string; newRegistrationsOnly?: boolean }): Prisma.UserWhereInput {
  const search = normalizeSearch(options?.search);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEW_MENTOR_WINDOW_DAYS);

  const conditions: Prisma.UserWhereInput[] = [
    { role: UserRole.MENTOR },
    { mentorProfile: { isNot: null } },
  ];

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId) {
    conditions.push({ partnerId: actor.partnerId });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
    conditions.push({ schoolId: actor.schoolId });
  }

  if (options?.newRegistrationsOnly) {
    conditions.push({
      createdAt: { gte: cutoff },
    });
    conditions.push({
      mentorProfile: {
        is: {
          status: "PENDING",
        },
      },
    });
  }

  if (search) {
    conditions.push({
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { school: { is: { name: { contains: search, mode: "insensitive" } } } },
        { partner: { is: { name: { contains: search, mode: "insensitive" } } } },
      ],
    });
  }

  return { AND: conditions };
}

function buildMenteeWhere(actor: PeopleActor, options?: { search?: string; menteeStage?: string }): Prisma.MenteeProfileWhereInput {
  const search = normalizeSearch(options?.search);
  const conditions: Prisma.MenteeProfileWhereInput[] = [];

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId) {
    conditions.push({
      school: {
        partnerId: actor.partnerId,
      },
    });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId) {
    conditions.push({ schoolId: actor.schoolId });
  }

  if (search) {
    conditions.push({
      OR: [
        { user: { firstName: { contains: search, mode: "insensitive" } } },
        { user: { lastName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { school: { name: { contains: search, mode: "insensitive" } } },
      ],
    });
  }

  if (options?.menteeStage && options.menteeStage !== "ALL") {
    conditions.push({
      intakeStageCached: options.menteeStage as PrismaMenteeIntakeStage,
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

async function loadMentorRows(
  actor: PeopleActor,
  options?: {
    search?: string;
    mentorState?: string;
    newRegistrationsOnly?: boolean;
    declinedConsentsOnly?: boolean;
    includeEligibility?: boolean;
  },
): Promise<MentorIntakeRow[]> {
  const mentorUsers = await prisma.user.findMany({
    where: buildMentorWhere(actor, {
      search: options?.search,
      newRegistrationsOnly: options?.newRegistrationsOnly,
    }),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      createdAt: true,
      isActive: true,
      school: {
        select: {
          name: true,
        },
      },
      partner: {
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
        },
      },
      mentorOnboarding: {
        select: {
          readinessState: true,
          canBeApproved: true,
          canBeMatched: true,
          readinessBlockers: true,
          pendingMentorshipCount: true,
          activeMentorshipCount: true,
          pausedMentorshipCount: true,
          unresolvedDeclinedConsentCount: true,
          latestDeclinedConsentAt: true,
          latestDeclinedConsentTitle: true,
          latestDeclinedConsentReason: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const rows: MentorIntakeRow[] = [];

  for (const mentor of mentorUsers) {
    const profile = mentor.mentorProfile;
    if (!profile) {
      continue;
    }

    const snapshot = {
      userId: mentor.id,
      profileId: profile.id,
      fullName: `${mentor.firstName} ${mentor.lastName}`.trim(),
      role: UserRole.MENTOR,
      userIsActive: mentor.isActive,
      schoolId: null,
      partnerId: null,
      profileStatus: profile.status,
      backgroundCheckStatus: profile.backgroundCheckStatus,
      trainingCompleted: profile.trainingCompleted,
      safeguardingAgreed: profile.safeguardingAgreed,
      maxMentees: profile.maxMentees,
      currentMentees: profile.currentMentees,
      mentorshipCounts: {
        [MentorshipStatus.PENDING]: mentor.mentorOnboarding?.pendingMentorshipCount ?? 0,
        [MentorshipStatus.ACTIVE]: mentor.mentorOnboarding?.activeMentorshipCount ?? 0,
        [MentorshipStatus.PAUSED]: mentor.mentorOnboarding?.pausedMentorshipCount ?? 0,
        [MentorshipStatus.COMPLETED]: 0,
        [MentorshipStatus.TERMINATED]: 0,
      },
    };

    const derivedState = (mentor.mentorOnboarding?.readinessState as MentorIntakeState | null) ?? (resolveMentorState(snapshot) as MentorIntakeState);
    if (options?.mentorState && options.mentorState !== "ALL" && derivedState !== options.mentorState) {
      continue;
    }

    const declinedConsentCount = mentor.mentorOnboarding?.unresolvedDeclinedConsentCount ?? 0;
    if (options?.declinedConsentsOnly && declinedConsentCount === 0) {
      continue;
    }

    const eligibility =
      options?.includeEligibility
        ? mentor.mentorOnboarding
          ? {
              canBeApproved: mentor.mentorOnboarding.canBeApproved,
              canBeMatched: mentor.mentorOnboarding.canBeMatched,
              blockers: mentor.mentorOnboarding.readinessBlockers,
            }
          : evaluateMentorEligibility({
              ...snapshot,
              derivedState,
            })
        : null;

    rows.push({
      userId: mentor.id,
      profileId: profile.id,
      fullName: snapshot.fullName,
      email: mentor.email,
      schoolName: mentor.school?.name ?? "-",
      partnerName: mentor.partner?.name ?? "Independent",
      profileStatus: profile.status,
      backgroundCheckStatus: profile.backgroundCheckStatus,
      trainingCompleted: profile.trainingCompleted,
      safeguardingAgreed: profile.safeguardingAgreed,
      currentMentees: profile.currentMentees,
      maxMentees: profile.maxMentees,
      derivedState,
      canBeMatched: eligibility?.canBeMatched ?? derivedState === "MATCHABLE",
      blockers: eligibility?.blockers ?? [],
      createdAt: mentor.createdAt.toISOString(),
      declinedConsentCount,
      latestDeclinedConsentAt: mentor.mentorOnboarding?.latestDeclinedConsentAt?.toISOString() ?? null,
      latestDeclinedConsentTitle: mentor.mentorOnboarding?.latestDeclinedConsentTitle ?? null,
      latestDeclinedConsentReason: mentor.mentorOnboarding?.latestDeclinedConsentReason ?? null,
    });
  }

  return rows;
}

async function loadMenteeRows(actor: PeopleActor, options?: { search?: string; menteeStage?: string }): Promise<MenteeIntakeRow[]> {
  const menteeProfiles = await prisma.menteeProfile.findMany({
    where: buildMenteeWhere(actor, {
      search: options?.search,
      menteeStage: options?.menteeStage,
    }),
    select: {
      id: true,
      status: true,
      educationLevel: true,
      parentGuardianConsent: true,
      intakeStageCached: true,
      requiresConsentCached: true,
      hasConsentCached: true,
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
          dateOfBirth: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return menteeProfiles.map((profile) => {
    const snapshot =
      profile.intakeStageCached && profile.requiresConsentCached !== null && profile.hasConsentCached !== null
        ? {
            intakeStageCached: profile.intakeStageCached,
            requiresConsentCached: profile.requiresConsentCached,
            hasConsentCached: profile.hasConsentCached,
          }
        : resolveMenteeIntakeSnapshot({
            status: profile.status,
            dateOfBirth: profile.user.dateOfBirth,
            parentGuardianConsent: profile.parentGuardianConsent,
          });

    return {
      profileId: profile.id,
      userId: profile.user.id,
      fullName: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
      email: profile.user.email,
      schoolName: profile.school.name,
      educationLevel: profile.educationLevel,
      status: profile.status,
      intakeStage: snapshot.intakeStageCached,
      requiresConsent: snapshot.requiresConsentCached,
      hasConsent: snapshot.hasConsentCached,
      createdAt: profile.createdAt.toISOString(),
    } satisfies MenteeIntakeRow;
  });
}

async function getPeopleOverviewUncached(actor: PeopleActor): Promise<PeopleOverviewResponse> {
  const mentorWhere = buildMentorWhere(actor);
  const newMentorWhere = buildMentorWhere(actor, { newRegistrationsOnly: true });
  const menteeWhere = buildMenteeWhere(actor);
  const [totalMentors, newMentorSignups, mentorsPendingReview, mentorsMatchable, declinedConsentMentors, totalMentees, menteesAwaiting, menteesConsentBlocked] = await Promise.all([
    prisma.user.count({
      where: mentorWhere,
    }),
    prisma.user.count({
      where: newMentorWhere,
    }),
    prisma.user.count({
      where: {
        ...mentorWhere,
        mentorOnboarding: {
          is: {
            readinessState: "PENDING_ADMIN_REVIEW",
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        ...mentorWhere,
        mentorOnboarding: {
          is: {
            readinessState: "MATCHABLE",
          },
        },
      },
    }),
    prisma.user.count({
      where: {
        ...mentorWhere,
        mentorOnboarding: {
          is: {
            unresolvedDeclinedConsentCount: {
              gt: 0,
            },
          },
        },
      },
    }),
    prisma.menteeProfile.count({
      where: menteeWhere,
    }),
    prisma.menteeProfile.count({
      where: {
        AND: [
          menteeWhere,
          {
            intakeStageCached: PrismaMenteeIntakeStage.AWAITING_MATCHING,
          },
        ],
      },
    }),
    prisma.menteeProfile.count({
      where: {
        AND: [
          menteeWhere,
          {
            intakeStageCached: PrismaMenteeIntakeStage.CONSENT_REQUIRED,
          },
        ],
      },
    }),
  ]);

  return {
    summary: {
      totalMentors,
      totalMentees,
      mentorsPendingReview,
      newMentorSignups,
      declinedConsentMentors,
      mentorsMatchable,
      menteesAwaiting,
      menteesConsentBlocked,
    },
  };
}

export async function getPeopleOverview(actor: PeopleActor): Promise<PeopleOverviewResponse> {
  const cached = unstable_cache(
    async () => getPeopleOverviewUncached(actor),
    ["people-overview", actor.role, actor.partnerId ?? "none", actor.schoolId ?? "none"],
    {
      revalidate: 60,
      tags: [PEOPLE_OVERVIEW_TAG],
    },
  );

  return cached();
}

export async function getMentorsIntake(actor: PeopleActor, query: MentorQueryInput): Promise<PeopleMentorsResponse> {
  const rows = await loadMentorRows(actor, {
    search: query.search,
    mentorState: query.mentorState,
    newRegistrationsOnly: query.newRegistrationsOnly,
    declinedConsentsOnly: query.declinedConsentsOnly,
    includeEligibility: true,
  });
  const page = paginate(rows, query);

  return {
    items: page.items,
    pagination: {
      page: page.page,
      pageSize: page.pageSize,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
    },
  };
}

export async function getMenteesIntake(actor: PeopleActor, query: MenteeQueryInput): Promise<PeopleMenteesResponse> {
  const rows = await loadMenteeRows(actor, {
    search: query.search,
    menteeStage: query.menteeStage,
  });
  const page = paginate(rows, query);

  return {
    items: page.items,
    pagination: {
      page: page.page,
      pageSize: page.pageSize,
      totalItems: page.totalItems,
      totalPages: page.totalPages,
    },
  };
}

export function readMentorFilters(searchParams: URLSearchParams) {
  return {
    search: normalizeSearch(searchParams.get("search")),
    mentorState: searchParams.get("mentorState")?.trim() ?? "ALL",
    newRegistrationsOnly: searchParams.get("newRegistrations") === "1",
    declinedConsentsOnly: searchParams.get("declinedConsents") === "1",
    ...parsePagination(searchParams),
  };
}

export function readMenteeFilters(searchParams: URLSearchParams) {
  return {
    search: normalizeSearch(searchParams.get("search")),
    menteeStage: searchParams.get("menteeStage")?.trim() ?? "ALL",
    ...parsePagination(searchParams),
  };
}

export const PEOPLE_NEW_MENTOR_WINDOW_DAYS = NEW_MENTOR_WINDOW_DAYS;

export function invalidatePeopleOverviewCache() {
  revalidateTag(PEOPLE_OVERVIEW_TAG, "max");
}
