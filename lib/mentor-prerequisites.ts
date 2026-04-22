import { ConsentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type TxClient = Prisma.TransactionClient;

export async function getMentorPrerequisiteSummary(userId: string, tx: TxClient = prisma) {
  const [requiredTrainingModules, trainingCompletions, requiredConsentSettings, activeConsents] = await Promise.all([
    tx.mentorTrainingModuleSetting.findMany({
      where: {
        isActive: true,
        required: true,
      },
      select: {
        id: true,
        version: true,
      },
    }),
    tx.mentorTrainingCompletion.findMany({
      where: {
        userId,
      },
      select: {
        moduleId: true,
        completedAt: true,
      },
    }),
    tx.mentorConsentSetting.findMany({
      where: {
        isActive: true,
        required: true,
      },
      select: {
        id: true,
        consentType: true,
        version: true,
      },
    }),
    tx.consent.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        consentType: true,
        version: true,
        agreedAt: true,
      },
      orderBy: {
        agreedAt: "desc",
      },
    }),
  ]);

  const completionMap = new Map(trainingCompletions.map((item) => [item.moduleId, item.completedAt]));
  const requiredTrainingCompleted = requiredTrainingModules.filter((item) => completionMap.has(item.id));
  const requiredTrainingCompletedAt =
    requiredTrainingCompleted.length === requiredTrainingModules.length && requiredTrainingCompleted.length > 0
      ? requiredTrainingCompleted
          .map((item) => completionMap.get(item.id) ?? null)
          .filter((item): item is Date => item instanceof Date)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
      : null;

  const consentKey = (type: ConsentType, version: string) => `${type}:${version}`;
  const activeConsentKeys = new Map(activeConsents.map((item) => [consentKey(item.consentType, item.version), item.agreedAt]));
  const requiredConsentCompleted = requiredConsentSettings.filter((item) => activeConsentKeys.has(consentKey(item.consentType, item.version)));
  const requiredSafeguarding = requiredConsentSettings.filter((item) => item.consentType === ConsentType.SAFEGUARDING);
  const completedSafeguarding = requiredSafeguarding.filter((item) => activeConsentKeys.has(consentKey(item.consentType, item.version)));
  const safeguardingCompletedAt =
    completedSafeguarding.length === requiredSafeguarding.length && completedSafeguarding.length > 0
      ? completedSafeguarding
          .map((item) => activeConsentKeys.get(consentKey(item.consentType, item.version)) ?? null)
          .filter((item): item is Date => item instanceof Date)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null
      : null;

  return {
    requiredTrainingCount: requiredTrainingModules.length,
    completedTrainingCount: requiredTrainingCompleted.length,
    requiredTrainingCompletedAt,
    requiredConsentCount: requiredConsentSettings.length,
    completedConsentCount: requiredConsentCompleted.length,
    requiredSafeguardingCount: requiredSafeguarding.length,
    completedSafeguardingCount: completedSafeguarding.length,
    safeguardingCompletedAt,
  };
}

export async function syncMentorStarterPackFlags(userId: string, tx: TxClient = prisma) {
  const mentorProfile = await tx.mentorProfile.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      trainingCompleted: true,
      trainingCompletedDate: true,
      safeguardingAgreed: true,
      safeguardingAgreedDate: true,
    },
  });

  if (!mentorProfile) {
    return null;
  }

  const summary = await getMentorPrerequisiteSummary(userId, tx);
  const nextTrainingCompleted =
    summary.requiredTrainingCount > 0 ? summary.completedTrainingCount === summary.requiredTrainingCount : mentorProfile.trainingCompleted;
  const nextSafeguardingAgreed =
    summary.requiredSafeguardingCount > 0
      ? summary.completedSafeguardingCount === summary.requiredSafeguardingCount
      : mentorProfile.safeguardingAgreed;

  const needsUpdate =
    mentorProfile.trainingCompleted !== nextTrainingCompleted ||
    mentorProfile.safeguardingAgreed !== nextSafeguardingAgreed ||
    (nextTrainingCompleted
      ? mentorProfile.trainingCompletedDate?.toISOString() !== summary.requiredTrainingCompletedAt?.toISOString()
      : mentorProfile.trainingCompletedDate !== null) ||
    (nextSafeguardingAgreed
      ? mentorProfile.safeguardingAgreedDate?.toISOString() !== summary.safeguardingCompletedAt?.toISOString()
      : mentorProfile.safeguardingAgreedDate !== null);

  if (needsUpdate) {
    await tx.mentorProfile.update({
      where: {
        userId,
      },
      data: {
        trainingCompleted: nextTrainingCompleted,
        trainingCompletedDate: nextTrainingCompleted ? summary.requiredTrainingCompletedAt ?? new Date() : null,
        safeguardingAgreed: nextSafeguardingAgreed,
        safeguardingAgreedDate: nextSafeguardingAgreed ? summary.safeguardingCompletedAt ?? new Date() : null,
      },
    });
  }

  return summary;
}
