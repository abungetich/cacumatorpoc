import { MentorshipStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getOutstandingConsentDeclinesForMentors } from "@/lib/mentor-consent-declines";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import { resolveMentorState } from "@/lib/mentor-engine/state-machine";
import { prisma } from "@/lib/prisma";

function isUnder18(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = today.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age < 18;
}

function mapMenteeStage({
  status,
  requiresConsent,
  hasConsent,
}: {
  status: "ACTIVE" | "WAITING" | "MATCHED" | "INACTIVE";
  requiresConsent: boolean;
  hasConsent: boolean;
}) {
  if (status === "INACTIVE") {
    return "INACTIVE" as const;
  }

  if (status === "ACTIVE") {
    return "ACTIVE" as const;
  }

  if (status === "MATCHED") {
    return "MATCHED" as const;
  }

  if (requiresConsent && !hasConsent) {
    return "CONSENT_REQUIRED" as const;
  }

  return "AWAITING_MATCHING" as const;
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

  if (!can(actor, "participants.read")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.PARTNER_ADMIN && !actor.partnerId) {
    return NextResponse.json({ message: "Partner admin account is missing partner scope" }, { status: 403 });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && !actor.schoolId) {
    return NextResponse.json({ message: "School admin account is missing school scope" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";
  const mentorStateFilter = url.searchParams.get("mentorState")?.trim() ?? "ALL";
  const menteeStageFilter = url.searchParams.get("menteeStage")?.trim() ?? "ALL";
  const declinedConsentsOnly = url.searchParams.get("declinedConsents") === "1";

  const mentorUsers = await prisma.user.findMany({
    where: {
      role: UserRole.MENTOR,
      mentorProfile: {
        isNot: null,
      },
      ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { partnerId: actor.partnerId } : {}),
      ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { schoolId: actor.schoolId } : {}),
    },
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
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const mentorIds = mentorUsers.map((mentor) => mentor.id);
  const mentorshipGroups = mentorIds.length
    ? await prisma.mentorship.groupBy({
        by: ["mentorId", "status"],
        where: {
          mentorId: {
            in: mentorIds,
          },
        },
        _count: {
          _all: true,
        },
      })
    : [];
  const outstandingConsentDeclines = await getOutstandingConsentDeclinesForMentors(mentorIds);

  const mentorshipMap = new Map<
    string,
    Record<MentorshipStatus, number>
  >();

  for (const row of mentorshipGroups) {
    if (!mentorshipMap.has(row.mentorId)) {
      mentorshipMap.set(row.mentorId, {
        [MentorshipStatus.PENDING]: 0,
        [MentorshipStatus.ACTIVE]: 0,
        [MentorshipStatus.PAUSED]: 0,
        [MentorshipStatus.COMPLETED]: 0,
        [MentorshipStatus.TERMINATED]: 0,
      });
    }

    const current = mentorshipMap.get(row.mentorId)!;
    current[row.status] = row._count._all;
  }

  const mentors = mentorUsers
    .map((mentor) => {
      const profile = mentor.mentorProfile;
      if (!profile) {
        return null;
      }

      const mentorshipCounts =
        mentorshipMap.get(mentor.id) ?? {
          [MentorshipStatus.PENDING]: 0,
          [MentorshipStatus.ACTIVE]: 0,
          [MentorshipStatus.PAUSED]: 0,
          [MentorshipStatus.COMPLETED]: 0,
          [MentorshipStatus.TERMINATED]: 0,
        };

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
        mentorshipCounts,
      };

      const derivedState = resolveMentorState(snapshot);
      const eligibility = evaluateMentorEligibility({
        ...snapshot,
        derivedState,
      });

      return {
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
        canBeMatched: eligibility.canBeMatched,
        blockers: eligibility.blockers,
        createdAt: mentor.createdAt.toISOString(),
        declinedConsentCount: (outstandingConsentDeclines.get(mentor.id) ?? []).length,
        latestDeclinedConsentAt: (outstandingConsentDeclines.get(mentor.id) ?? [])[0]?.declinedAt ?? null,
        latestDeclinedConsentTitle: (outstandingConsentDeclines.get(mentor.id) ?? [])[0]?.title ?? null,
        latestDeclinedConsentReason: (outstandingConsentDeclines.get(mentor.id) ?? [])[0]?.reason ?? null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => {
      if (declinedConsentsOnly && item.declinedConsentCount === 0) {
        return false;
      }

      if (mentorStateFilter !== "ALL" && item.derivedState !== mentorStateFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = `${item.fullName} ${item.email} ${item.schoolName} ${item.partnerName} ${item.derivedState}`.toLowerCase();
      return haystack.includes(search);
    });

  const menteeProfiles = await prisma.menteeProfile.findMany({
    where: {
      ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId
        ? {
            school: {
              partnerId: actor.partnerId,
            },
          }
        : {}),
      ...(actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId ? { schoolId: actor.schoolId } : {}),
    },
    select: {
      id: true,
      status: true,
      educationLevel: true,
      parentGuardianConsent: true,
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

  const mentees = menteeProfiles
    .map((profile) => {
      const requiresConsent = isUnder18(profile.user.dateOfBirth);
      const hasConsent = profile.parentGuardianConsent === true;
      const intakeStage = mapMenteeStage({
        status: profile.status,
        requiresConsent,
        hasConsent,
      });

      return {
        profileId: profile.id,
        userId: profile.user.id,
        fullName: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        email: profile.user.email,
        schoolName: profile.school.name,
        educationLevel: profile.educationLevel,
        status: profile.status,
        intakeStage,
        requiresConsent,
        hasConsent,
        createdAt: profile.createdAt.toISOString(),
      };
    })
    .filter((item) => {
      if (menteeStageFilter !== "ALL" && item.intakeStage !== menteeStageFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = `${item.fullName} ${item.email} ${item.schoolName} ${item.educationLevel} ${item.intakeStage}`.toLowerCase();
      return haystack.includes(search);
    });

  return NextResponse.json({
    mentors,
    mentees,
  });
}
