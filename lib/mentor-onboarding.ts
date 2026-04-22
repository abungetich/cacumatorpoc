import {
  MentorBackgroundCheckStatus,
  MentorOnboardingStage,
  MentorProfileStatus,
  MentorReadinessState,
  MentorshipStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import { resolveMentorState } from "@/lib/mentor-engine/state-machine";
import { getOutstandingConsentDeclinesForMentor } from "@/lib/mentor-consent-declines";
import { parseStringArray } from "@/lib/programs-config";
import { syncMentorStarterPackFlags } from "@/lib/mentor-prerequisites";

type TxClient = Prisma.TransactionClient;

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function calculateProfileCompletion(input: {
  profession: string;
  employer: string;
  jobTitle: string;
  industry: string;
  yearsExperience: number;
  expertiseAreas: Prisma.JsonValue;
  mentoringFormats: Prisma.JsonValue;
  availability: Prisma.JsonValue;
  hoursPerMonth: number;
  motivation: string;
}) {
  let score = 0;

  if (input.profession.trim()) score += 10;
  if (input.employer.trim()) score += 10;
  if (input.jobTitle.trim()) score += 10;
  if (input.industry.trim()) score += 10;
  if (input.yearsExperience > 0) score += 10;
  if (parseStringArray(input.expertiseAreas).length >= 3) score += 15;
  if (parseStringArray(input.mentoringFormats).length > 0) score += 10;
  if (typeof input.availability === "object" && input.availability) score += 10;
  if (input.hoursPerMonth > 0) score += 5;
  if (input.motivation.trim().length >= 40) score += 10;

  return clampPercentage(score);
}

function determineStage(input: {
  emailVerifiedAt: Date | null;
  hasProfile: boolean;
  profileCompletionPercentage: number;
  interestsCount: number;
  trainingCompleted: boolean;
  requiredConsentComplete: boolean;
  safeguardingAgreed: boolean;
  backgroundCheckStatus: MentorBackgroundCheckStatus | null;
  profileStatus: MentorProfileStatus | null;
  approvedApplications: number;
  activeMentorships: number;
}) {
  if (!input.emailVerifiedAt) {
    return MentorOnboardingStage.SIGNUP;
  }

  if (!input.hasProfile) {
    return MentorOnboardingStage.EMAIL_VERIFIED;
  }

  if (input.profileCompletionPercentage < 80) {
    return MentorOnboardingStage.PROFILE_CREATED;
  }

  if (input.interestsCount < 3) {
    return MentorOnboardingStage.INTERESTS_SELECTED;
  }

  if (!input.trainingCompleted) {
    return MentorOnboardingStage.INTERESTS_SELECTED;
  }

  if (!input.requiredConsentComplete) {
    return MentorOnboardingStage.TRAINING_COMPLETED;
  }

  if (!input.safeguardingAgreed) {
    return MentorOnboardingStage.CONSENT_SIGNED;
  }

  if (input.backgroundCheckStatus !== MentorBackgroundCheckStatus.CLEARED) {
    return MentorOnboardingStage.BACKGROUND_CHECK_PENDING;
  }

  if (input.profileStatus !== MentorProfileStatus.APPROVED) {
    return MentorOnboardingStage.CONSENT_SIGNED;
  }

  if (input.activeMentorships > 0) {
    return MentorOnboardingStage.ACTIVE;
  }

  if (input.approvedApplications > 0) {
    return MentorOnboardingStage.MATCHING;
  }

  return MentorOnboardingStage.PROGRAM_ELIGIBLE;
}

export async function syncMentorOnboarding(userId: string, tx: TxClient = prisma) {
  const prerequisiteSummary = await syncMentorStarterPackFlags(userId, tx);

  const user = await tx.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
      emailVerifiedAt: true,
      mentorProfile: {
        select: {
          id: true,
          profession: true,
          employer: true,
          jobTitle: true,
          industry: true,
          yearsExperience: true,
          expertiseAreas: true,
          mentoringFormats: true,
          availability: true,
          hoursPerMonth: true,
          motivation: true,
          trainingCompleted: true,
          trainingCompletedDate: true,
          safeguardingAgreed: true,
          safeguardingAgreedDate: true,
          backgroundCheckStatus: true,
          maxMentees: true,
          currentMentees: true,
          status: true,
          approvedAt: true,
          rejectionReason: true,
        },
      },
    },
  });

  if (!user || user.role !== UserRole.MENTOR) {
    return null;
  }

  const approvedApplications = await tx.mentorProgramApplication.count({
    where: {
      mentorUserId: user.id,
      status: "APPROVED",
    },
  });

  const groupedMentorships = await tx.mentorship.groupBy({
    by: ["status"],
    where: {
      mentorId: user.id,
    },
    _count: {
      _all: true,
    },
  });
  const pendingMentorshipCount = groupedMentorships.find((item) => item.status === MentorshipStatus.PENDING)?._count._all ?? 0;
  const activeMentorshipCount = groupedMentorships.find((item) => item.status === MentorshipStatus.ACTIVE)?._count._all ?? 0;
  const pausedMentorshipCount = groupedMentorships.find((item) => item.status === MentorshipStatus.PAUSED)?._count._all ?? 0;

  const profile = user.mentorProfile;
  const profileCompletionPercentage = profile
    ? calculateProfileCompletion({
        profession: profile.profession,
        employer: profile.employer,
        jobTitle: profile.jobTitle,
        industry: profile.industry,
        yearsExperience: profile.yearsExperience,
        expertiseAreas: profile.expertiseAreas,
        mentoringFormats: profile.mentoringFormats,
        availability: profile.availability,
        hoursPerMonth: profile.hoursPerMonth,
        motivation: profile.motivation,
      })
    : 0;

  const interestsCount = profile ? parseStringArray(profile.expertiseAreas).length : 0;
  const currentStage = determineStage({
    emailVerifiedAt: user.emailVerifiedAt,
    hasProfile: Boolean(profile),
    profileCompletionPercentage,
    interestsCount,
    trainingCompleted: profile?.trainingCompleted ?? false,
    requiredConsentComplete: prerequisiteSummary
      ? prerequisiteSummary.requiredConsentCount === 0 ||
        prerequisiteSummary.completedConsentCount === prerequisiteSummary.requiredConsentCount
      : true,
    safeguardingAgreed: profile?.safeguardingAgreed ?? false,
    backgroundCheckStatus: profile?.backgroundCheckStatus ?? null,
    profileStatus: profile?.status ?? null,
    approvedApplications,
    activeMentorships: activeMentorshipCount,
  });

  const readinessSnapshot =
    profile
      ? {
          userId: user.id,
          profileId: profile.id,
          fullName: "",
          role: UserRole.MENTOR,
          userIsActive: true,
          schoolId: null,
          partnerId: null,
          profileStatus: profile.status,
          backgroundCheckStatus: profile.backgroundCheckStatus,
          trainingCompleted: profile.trainingCompleted,
          safeguardingAgreed: profile.safeguardingAgreed,
          maxMentees: profile.maxMentees,
          currentMentees: profile.currentMentees,
          mentorshipCounts: {
            [MentorshipStatus.PENDING]: pendingMentorshipCount,
            [MentorshipStatus.ACTIVE]: activeMentorshipCount,
            [MentorshipStatus.PAUSED]: pausedMentorshipCount,
            [MentorshipStatus.COMPLETED]: groupedMentorships.find((item) => item.status === MentorshipStatus.COMPLETED)?._count._all ?? 0,
            [MentorshipStatus.TERMINATED]: groupedMentorships.find((item) => item.status === MentorshipStatus.TERMINATED)?._count._all ?? 0,
          },
        }
      : null;

  const readinessState = readinessSnapshot ? (resolveMentorState(readinessSnapshot) as MentorReadinessState) : null;
  const readinessEligibility = readinessSnapshot
    ? evaluateMentorEligibility({
        ...readinessSnapshot,
        derivedState: readinessState!,
      })
    : null;
  const declinedConsents = await getOutstandingConsentDeclinesForMentor(user.id);
  const latestDeclinedConsent = declinedConsents[0] ?? null;

  return tx.mentorOnboarding.upsert({
    where: {
      userId: user.id,
    },
    create: {
      userId: user.id,
      currentStage,
      readinessState,
      canBeApproved: readinessEligibility?.canBeApproved ?? false,
      canBeMatched: readinessEligibility?.canBeMatched ?? false,
      readinessBlockers: readinessEligibility?.blockers ?? [],
      pendingMentorshipCount,
      activeMentorshipCount,
      pausedMentorshipCount,
      unresolvedDeclinedConsentCount: declinedConsents.length,
      latestDeclinedConsentAt: latestDeclinedConsent ? new Date(latestDeclinedConsent.declinedAt) : null,
      latestDeclinedConsentTitle: latestDeclinedConsent?.title ?? null,
      latestDeclinedConsentReason: latestDeclinedConsent?.reason ?? null,
      profileCompletionPercentage,
      emailVerifiedAt: user.emailVerifiedAt,
      profileCompletedAt: profileCompletionPercentage >= 80 ? new Date() : null,
      interestsCompletedAt: interestsCount >= 3 ? new Date() : null,
      trainingCompletedAt: profile?.trainingCompleted ? profile.trainingCompletedDate ?? new Date() : null,
      consentSignedAt:
        prerequisiteSummary && prerequisiteSummary.requiredConsentCount > 0
          ? prerequisiteSummary.completedConsentCount === prerequisiteSummary.requiredConsentCount
            ? new Date()
            : null
          : profile?.safeguardingAgreed
            ? profile.safeguardingAgreedDate ?? new Date()
            : null,
      backgroundScreeningStatus: profile?.backgroundCheckStatus ?? null,
      approvedAt: profile?.approvedAt ?? null,
      rejectedAt: profile?.status === MentorProfileStatus.REJECTED ? new Date() : null,
      rejectionReason: profile?.status === MentorProfileStatus.REJECTED ? profile.rejectionReason ?? null : null,
    },
    update: {
      currentStage,
      readinessState,
      canBeApproved: readinessEligibility?.canBeApproved ?? false,
      canBeMatched: readinessEligibility?.canBeMatched ?? false,
      readinessBlockers: readinessEligibility?.blockers ?? [],
      pendingMentorshipCount,
      activeMentorshipCount,
      pausedMentorshipCount,
      unresolvedDeclinedConsentCount: declinedConsents.length,
      latestDeclinedConsentAt: latestDeclinedConsent ? new Date(latestDeclinedConsent.declinedAt) : null,
      latestDeclinedConsentTitle: latestDeclinedConsent?.title ?? null,
      latestDeclinedConsentReason: latestDeclinedConsent?.reason ?? null,
      profileCompletionPercentage,
      emailVerifiedAt: user.emailVerifiedAt,
      profileCompletedAt: profileCompletionPercentage >= 80 ? new Date() : null,
      interestsCompletedAt: interestsCount >= 3 ? new Date() : null,
      trainingCompletedAt: profile?.trainingCompleted ? profile.trainingCompletedDate ?? new Date() : null,
      consentSignedAt:
        prerequisiteSummary && prerequisiteSummary.requiredConsentCount > 0
          ? prerequisiteSummary.completedConsentCount === prerequisiteSummary.requiredConsentCount
            ? new Date()
            : null
          : profile?.safeguardingAgreed
            ? profile.safeguardingAgreedDate ?? new Date()
            : null,
      backgroundScreeningStatus: profile?.backgroundCheckStatus ?? null,
      approvedAt: profile?.approvedAt ?? null,
      rejectedAt: profile?.status === MentorProfileStatus.REJECTED ? new Date() : null,
      rejectionReason: profile?.status === MentorProfileStatus.REJECTED ? profile.rejectionReason ?? null : null,
    },
  });
}
