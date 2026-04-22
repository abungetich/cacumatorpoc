import { MentorshipStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOutstandingConsentDeclinesForMentor } from "@/lib/mentor-consent-declines";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import { resolveMentorState } from "@/lib/mentor-engine/state-machine";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { parseStringArray } from "@/lib/programs-config";
import { getVerificationEmailConfigStatus } from "@/lib/verification/email";
import { getVerificationSettings } from "@/lib/verification/settings";
import type { MentorMentorshipCounts, MentorSnapshot } from "@/lib/mentor-engine/types";

function createEmptyCounts(): MentorMentorshipCounts {
  return {
    [MentorshipStatus.PENDING]: 0,
    [MentorshipStatus.ACTIVE]: 0,
    [MentorshipStatus.PAUSED]: 0,
    [MentorshipStatus.COMPLETED]: 0,
    [MentorshipStatus.TERMINATED]: 0,
  };
}

function mapMentorshipCounts(
  rows: Array<{
    status: MentorshipStatus;
    _count?:
      | true
      | {
          _all?: number;
        };
  }>,
): MentorMentorshipCounts {
  const counts = createEmptyCounts();

  for (const row of rows) {
    counts[row.status] = row._count && typeof row._count === "object" ? row._count._all ?? 0 : 0;
  }

  return counts;
}

export async function getMentorSnapshotByUserId(userId: string): Promise<MentorSnapshot | null> {
  const [mentorUser, groupedMentorships] = await prisma.$transaction([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        firstName: true,
        lastName: true,
        schoolId: true,
        partnerId: true,
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
    }),
    prisma.mentorship.groupBy({
      by: ["status"],
      where: {
        mentorId: userId,
      },
      orderBy: {
        status: "asc",
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  if (!mentorUser || mentorUser.role !== UserRole.MENTOR || !mentorUser.mentorProfile) {
    return null;
  }

  const mentorshipCounts = mapMentorshipCounts(groupedMentorships);

  const baseSnapshot = {
    userId: mentorUser.id,
    profileId: mentorUser.mentorProfile.id,
    fullName: `${mentorUser.firstName} ${mentorUser.lastName}`.trim(),
    role: mentorUser.role,
    userIsActive: mentorUser.isActive,
    schoolId: mentorUser.schoolId,
    partnerId: mentorUser.partnerId,
    profileStatus: mentorUser.mentorProfile.status,
    backgroundCheckStatus: mentorUser.mentorProfile.backgroundCheckStatus,
    trainingCompleted: mentorUser.mentorProfile.trainingCompleted,
    safeguardingAgreed: mentorUser.mentorProfile.safeguardingAgreed,
    maxMentees: mentorUser.mentorProfile.maxMentees,
    currentMentees: mentorUser.mentorProfile.currentMentees,
    mentorshipCounts,
  };

  return {
    ...baseSnapshot,
    derivedState: resolveMentorState(baseSnapshot),
  };
}

export async function getMentorEngineView(userId: string) {
  const snapshot = await getMentorSnapshotByUserId(userId);

  if (!snapshot) {
    return null;
  }

  return {
    snapshot,
    eligibility: evaluateMentorEligibility(snapshot),
  };
}

function summarizeAvailability(value: unknown): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, entry]) => {
      if (Array.isArray(entry)) {
        const values = entry.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
        return values.length ? [`${key}: ${values.join(", ")}`] : [];
      }

      if (typeof entry === "string" && entry.trim()) {
        return [`${key}: ${entry.trim()}`];
      }

      return [];
    })
    .filter((item) => item.trim().length > 0);
}

function readAuditObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function getMentorDetailView(userId: string) {
  await syncMentorOnboarding(userId);

  const snapshot = await getMentorSnapshotByUserId(userId);
  if (!snapshot) {
    return null;
  }

  const [mentor, verificationSettings, declinedConsents] = await Promise.all([
    prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      phone: true,
      dateOfBirth: true,
      createdAt: true,
      emailVerifiedAt: true,
      lastLoginAt: true,
      profilePhoto: true,
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
          backgroundCheckDocument: true,
          backgroundCheckDate: true,
          backgroundCheckExpiry: true,
          trainingCompletedDate: true,
          safeguardingAgreedDate: true,
          approvedAt: true,
          rejectionReason: true,
        },
      },
      mentorOnboarding: {
        select: {
          currentStage: true,
          profileCompletionPercentage: true,
          emailVerifiedAt: true,
          profileCompletedAt: true,
          interestsCompletedAt: true,
          trainingCompletedAt: true,
          consentSignedAt: true,
          backgroundScreeningStatus: true,
          approvedAt: true,
          rejectedAt: true,
          rejectionReason: true,
        },
      },
      emailVerificationTokens: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          expiresAt: true,
          verifiedAt: true,
        },
      },
    },
  }),
    getVerificationSettings(),
    getOutstandingConsentDeclinesForMentor(userId),
  ]);

  if (!mentor?.mentorProfile) {
    return null;
  }

  const [profileAuditLogs, consentAuditLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        entityType: "mentor_profiles",
        entityId: snapshot.profileId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 40,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        userId,
        action: {
          in: ["MENTOR_CONSENT_DECLINED", "MENTOR_CONSENT_SELF_ASSENTED"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);
  const auditLogs = [...profileAuditLogs, ...consentAuditLogs]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 60);

  return {
    snapshot,
    eligibility: evaluateMentorEligibility(snapshot),
    user: {
      email: mentor.email,
      phone: mentor.phone,
      dateOfBirth: mentor.dateOfBirth?.toISOString() ?? null,
      createdAt: mentor.createdAt.toISOString(),
      emailVerifiedAt: mentor.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: mentor.lastLoginAt?.toISOString() ?? null,
      profilePhoto: mentor.profilePhoto,
      schoolName: mentor.school?.name ?? null,
      partnerName: mentor.partner?.name ?? null,
    },
    profile: {
      profession: mentor.mentorProfile.profession,
      employer: mentor.mentorProfile.employer,
      jobTitle: mentor.mentorProfile.jobTitle,
      industry: mentor.mentorProfile.industry,
      yearsExperience: mentor.mentorProfile.yearsExperience,
      expertiseAreas: parseStringArray(mentor.mentorProfile.expertiseAreas),
      mentoringFormats: parseStringArray(mentor.mentorProfile.mentoringFormats),
      availabilitySummary: summarizeAvailability(mentor.mentorProfile.availability),
      hoursPerMonth: mentor.mentorProfile.hoursPerMonth,
      motivation: mentor.mentorProfile.motivation,
      backgroundCheckDocument: mentor.mentorProfile.backgroundCheckDocument,
      backgroundCheckDate: mentor.mentorProfile.backgroundCheckDate?.toISOString() ?? null,
      backgroundCheckExpiry: mentor.mentorProfile.backgroundCheckExpiry?.toISOString() ?? null,
      trainingCompletedDate: mentor.mentorProfile.trainingCompletedDate?.toISOString() ?? null,
      safeguardingAgreedDate: mentor.mentorProfile.safeguardingAgreedDate?.toISOString() ?? null,
      approvedAt: mentor.mentorProfile.approvedAt?.toISOString() ?? null,
      rejectionReason: mentor.mentorProfile.rejectionReason,
    },
    onboarding: mentor.mentorOnboarding
      ? {
          currentStage: mentor.mentorOnboarding.currentStage,
          profileCompletionPercentage: mentor.mentorOnboarding.profileCompletionPercentage,
          emailVerifiedAt: mentor.mentorOnboarding.emailVerifiedAt?.toISOString() ?? null,
          profileCompletedAt: mentor.mentorOnboarding.profileCompletedAt?.toISOString() ?? null,
          interestsCompletedAt: mentor.mentorOnboarding.interestsCompletedAt?.toISOString() ?? null,
          trainingCompletedAt: mentor.mentorOnboarding.trainingCompletedAt?.toISOString() ?? null,
          consentSignedAt: mentor.mentorOnboarding.consentSignedAt?.toISOString() ?? null,
          backgroundScreeningStatus: mentor.mentorOnboarding.backgroundScreeningStatus,
          approvedAt: mentor.mentorOnboarding.approvedAt?.toISOString() ?? null,
          rejectedAt: mentor.mentorOnboarding.rejectedAt?.toISOString() ?? null,
          rejectionReason: mentor.mentorOnboarding.rejectionReason,
          declinedConsents: declinedConsents.map((item) => ({
            id: item.id,
            title: item.title,
            consentType:
              item.consentType === "DATA_PROCESSING" ||
              item.consentType === "PHOTO_RELEASE" ||
              item.consentType === "MENTORSHIP_AGREEMENT" ||
              item.consentType === "SAFEGUARDING"
                ? item.consentType
                : null,
            version: item.version,
            declinedAt: item.declinedAt,
            reason: item.reason,
          })),
        }
      : {
          currentStage: null,
          profileCompletionPercentage: null,
          emailVerifiedAt: null,
          profileCompletedAt: null,
          interestsCompletedAt: null,
          trainingCompletedAt: null,
          consentSignedAt: null,
          backgroundScreeningStatus: null,
          approvedAt: null,
          rejectedAt: null,
          rejectionReason: null,
          declinedConsents: declinedConsents.map((item) => ({
            id: item.id,
            title: item.title,
            consentType:
              item.consentType === "DATA_PROCESSING" ||
              item.consentType === "PHOTO_RELEASE" ||
              item.consentType === "MENTORSHIP_AGREEMENT" ||
              item.consentType === "SAFEGUARDING"
                ? item.consentType
                : null,
            version: item.version,
            declinedAt: item.declinedAt,
            reason: item.reason,
          })),
        },
    verification: {
      email: mentor.email,
      emailVerifiedAt: mentor.emailVerifiedAt?.toISOString() ?? null,
      userIsActive: snapshot.userIsActive,
      pendingTokenCount: mentor.emailVerificationTokens.filter((item) => !item.verifiedAt && item.expiresAt > new Date()).length,
      latestTokenCreatedAt: mentor.emailVerificationTokens[0]?.createdAt.toISOString() ?? null,
      latestTokenExpiresAt: mentor.emailVerificationTokens[0]?.expiresAt.toISOString() ?? null,
      latestTokenVerifiedAt: mentor.emailVerificationTokens[0]?.verifiedAt?.toISOString() ?? null,
      reminderPolicy: {
        autoReminderEnabled: verificationSettings.autoReminderEnabled,
        resendIntervalHours: verificationSettings.resendIntervalHours,
        maxReminders: verificationSettings.maxReminders,
      },
      delivery: getVerificationEmailConfigStatus(),
      attempts: auditLogs
        .filter((item) => item.action === "MENTOR_VERIFICATION_EMAIL_SENT" || item.action === "MENTOR_VERIFICATION_EMAIL_FAILED")
        .map((item) => {
          const payload = readAuditObject(item.newValues);
          const context = typeof payload?.context === "string" ? payload.context : "UNKNOWN";
          const channel = typeof payload?.channel === "string" ? payload.channel : "NONE";
          const status = typeof payload?.status === "string" ? payload.status : item.action === "MENTOR_VERIFICATION_EMAIL_SENT" ? "SENT" : "FAILED";
          const responseCode = typeof payload?.responseCode === "number" ? payload.responseCode : null;
          return {
            id: item.id,
            timestamp: item.createdAt.toISOString(),
            actor: `${item.user.firstName} ${item.user.lastName}`.trim(),
            context:
              context === "REGISTRATION" || context === "PUBLIC_RESEND" || context === "ADMIN_RESEND"
                ? context
                : "UNKNOWN",
            status: status === "SENT" ? "SENT" : "FAILED",
            channel: channel === "ZEPTO" || channel === "SMTP" || channel === "NONE" ? channel : "NONE",
            responseCode,
            providerMessage: typeof payload?.providerMessage === "string" ? payload.providerMessage : null,
            providerPayload: typeof payload?.providerPayload === "string" ? payload.providerPayload : null,
            reason: typeof payload?.reason === "string" ? payload.reason : null,
          };
        }),
    },
    audit: auditLogs.map((item) => {
      const payload = readAuditObject(item.newValues);
      const details = readAuditObject(payload?.details);
      return {
        id: item.id,
        action: item.action,
        actor: `${item.user.firstName} ${item.user.lastName}`.trim(),
        timestamp: item.createdAt.toISOString(),
        comment:
          typeof payload?.comment === "string"
            ? payload.comment
            : typeof payload?.reason === "string"
              ? payload.reason
              : null,
        details,
      };
    }),
  };
}
