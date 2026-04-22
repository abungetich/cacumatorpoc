import { MenteeIntakeStage, MenteeProfileStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function isMenteeUnder18(dateOfBirth: Date) {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDelta = today.getMonth() - dateOfBirth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }

  return age < 18;
}

export function resolveMenteeIntakeSnapshot(input: {
  status: MenteeProfileStatus;
  dateOfBirth: Date;
  parentGuardianConsent: boolean | null;
}) {
  const requiresConsent = isMenteeUnder18(input.dateOfBirth);
  const hasConsent = input.parentGuardianConsent === true;

  let intakeStage: MenteeIntakeStage;
  if (input.status === MenteeProfileStatus.INACTIVE) {
    intakeStage = MenteeIntakeStage.INACTIVE;
  } else if (input.status === MenteeProfileStatus.ACTIVE) {
    intakeStage = MenteeIntakeStage.ACTIVE;
  } else if (input.status === MenteeProfileStatus.MATCHED) {
    intakeStage = MenteeIntakeStage.MATCHED;
  } else if (requiresConsent && !hasConsent) {
    intakeStage = MenteeIntakeStage.CONSENT_REQUIRED;
  } else {
    intakeStage = MenteeIntakeStage.AWAITING_MATCHING;
  }

  return {
    intakeStageCached: intakeStage,
    requiresConsentCached: requiresConsent,
    hasConsentCached: hasConsent,
  };
}

export async function syncMenteeIntakeSnapshot(menteeProfileId: string) {
  const profile = await prisma.menteeProfile.findUnique({
    where: { id: menteeProfileId },
    select: {
      id: true,
      status: true,
      parentGuardianConsent: true,
      user: {
        select: {
          dateOfBirth: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const snapshot = resolveMenteeIntakeSnapshot({
    status: profile.status,
    dateOfBirth: profile.user.dateOfBirth,
    parentGuardianConsent: profile.parentGuardianConsent,
  });

  return prisma.menteeProfile.update({
    where: { id: profile.id },
    data: snapshot,
    select: {
      id: true,
      intakeStageCached: true,
      requiresConsentCached: true,
      hasConsentCached: true,
    },
  });
}
