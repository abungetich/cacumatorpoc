import { ConsentType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { getMentorPrerequisiteSummary } from "@/lib/mentor-prerequisites";

export async function getMentorOnboardingWorkspace(userId: string) {
  await syncMentorOnboarding(userId);

  const [user, trainingModules, consentSettings, trainingCompletions, trainingAttempts, consents, consentDeclines, prerequisiteSummary] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        emailVerifiedAt: true,
        phone: true,
        dateOfBirth: true,
        mentorProfile: {
          select: {
            backgroundCheckStatus: true,
            backgroundCheckDocument: true,
            backgroundCheckDate: true,
            backgroundCheckExpiry: true,
            trainingCompleted: true,
            safeguardingAgreed: true,
          },
        },
        mentorOnboarding: {
          select: {
            currentStage: true,
            profileCompletionPercentage: true,
          },
        },
      },
    }),
    prisma.mentorTrainingModuleSetting.findMany({
      where: {
        isActive: true,
      },
      include: {
        questions: {
          where: {
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: {
            attempts: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.mentorConsentSetting.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.mentorTrainingCompletion.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        moduleId: true,
        completedAt: true,
      },
    }),
    prisma.mentorTrainingAttempt.findMany({
      where: {
        userId,
      },
      select: {
        moduleId: true,
        score: true,
        passed: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: "desc",
      },
    }),
    prisma.consent.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        id: true,
        consentType: true,
        version: true,
        agreedAt: true,
        evidenceUrl: true,
      },
      orderBy: {
        agreedAt: "desc",
      },
    }),
    prisma.auditLog.findMany({
      where: {
        userId,
        action: "MENTOR_CONSENT_DECLINED",
        entityType: "mentor_consent_settings",
      },
      select: {
        createdAt: true,
        newValues: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    getMentorPrerequisiteSummary(userId),
  ]);

  if (!user || user.role !== UserRole.MENTOR || !user.mentorProfile) {
    return null;
  }

  const trainingCompletionMap = new Map(trainingCompletions.map((item) => [item.moduleId, item]));
  const trainingAttemptMap = new Map(
    trainingAttempts.map((item) => [
      item.moduleId,
      {
        score: item.score,
        passed: item.passed,
        submittedAt: item.submittedAt,
      },
    ]),
  );
  const consentMap = new Map(consents.map((item) => [`${item.consentType}:${item.version}`, item]));
  const declinedConsentMap = new Map<string, { declinedAt: Date; reason: string | null }>();
  for (const entry of consentDeclines) {
    const payload = (entry.newValues ?? {}) as Record<string, unknown>;
    const consentType = typeof payload.consentType === "string" ? payload.consentType : null;
    const version = typeof payload.version === "string" ? payload.version : null;
    if (!consentType || !version) continue;
    const key = `${consentType}:${version}`;
    if (!declinedConsentMap.has(key)) {
      declinedConsentMap.set(key, {
        declinedAt: entry.createdAt,
        reason: typeof payload.reason === "string" && payload.reason.trim() ? payload.reason.trim() : null,
      });
    }
  }

  const completedCount = [
    Boolean(user.emailVerifiedAt),
    (user.mentorOnboarding?.profileCompletionPercentage ?? 0) >= 80,
    prerequisiteSummary.requiredTrainingCount === 0 || prerequisiteSummary.completedTrainingCount === prerequisiteSummary.requiredTrainingCount,
    prerequisiteSummary.requiredConsentCount === 0 || prerequisiteSummary.completedConsentCount === prerequisiteSummary.requiredConsentCount,
    user.mentorProfile.safeguardingAgreed,
    user.mentorProfile.backgroundCheckStatus === "CLEARED",
  ].filter(Boolean).length;

  const focus = [];
  if ((user.mentorOnboarding?.profileCompletionPercentage ?? 0) < 80) {
    focus.push({
      id: "profile",
      title: "Complete your profile",
      description: "Finish your professional profile so the platform can evaluate your readiness.",
    });
  }
  if (
    prerequisiteSummary.requiredTrainingCount > 0 &&
    prerequisiteSummary.completedTrainingCount !== prerequisiteSummary.requiredTrainingCount
  ) {
    focus.push({
      id: "training",
      title: "Finish your training pack",
      description: "Complete the required mentor modules before review can start.",
    });
  }
  if (
    prerequisiteSummary.requiredConsentCount > 0 &&
    prerequisiteSummary.completedConsentCount !== prerequisiteSummary.requiredConsentCount
  ) {
    focus.push({
      id: "consents",
      title: "Assent to the current terms",
      description: "Read and accept the active mentor documents and safeguarding terms.",
    });
  }
  if (user.mentorProfile.backgroundCheckStatus !== "CLEARED") {
    focus.push({
      id: "background",
      title: user.mentorProfile.backgroundCheckDocument ? "Background check under review" : "Submit your background check",
      description: user.mentorProfile.backgroundCheckDocument
        ? "Your document is on file. The platform team will review and clear it."
        : "Upload the document so the review team can verify it.",
    });
  }

  return {
    currentStage: user.mentorOnboarding?.currentStage ?? null,
    profileCompletionPercentage: user.mentorOnboarding?.profileCompletionPercentage ?? 0,
    completedCount,
    totalCount: 6,
    progressPercentage: Math.round((completedCount / 6) * 100),
    checklist: [
      {
        id: "email" as const,
        label: "Email confirmed",
        description: user.emailVerifiedAt
          ? "Your email has been confirmed and your account can continue through onboarding."
          : "Confirm your email before any onboarding steps can be reviewed.",
        complete: Boolean(user.emailVerifiedAt),
      },
      {
        id: "profile" as const,
        label: "Profile completed",
        description: `Current completion: ${user.mentorOnboarding?.profileCompletionPercentage ?? 0}%`,
        complete: (user.mentorOnboarding?.profileCompletionPercentage ?? 0) >= 80,
      },
      {
        id: "training" as const,
        label: "Training starter pack",
        description:
          trainingModules.length > 0
            ? `${prerequisiteSummary.completedTrainingCount}/${prerequisiteSummary.requiredTrainingCount || trainingModules.length} required modules completed`
            : "No required training modules have been configured yet.",
        complete:
          prerequisiteSummary.requiredTrainingCount === 0 ||
          prerequisiteSummary.completedTrainingCount === prerequisiteSummary.requiredTrainingCount,
      },
      {
        id: "consents" as const,
        label: "Terms and consent pack",
        description:
          consentSettings.length > 0
            ? `${prerequisiteSummary.completedConsentCount}/${prerequisiteSummary.requiredConsentCount || consentSettings.length} required assents completed`
            : "No required mentor consent pack has been configured yet.",
        complete:
          prerequisiteSummary.requiredConsentCount === 0 ||
          prerequisiteSummary.completedConsentCount === prerequisiteSummary.requiredConsentCount,
      },
      {
        id: "safeguarding" as const,
        label: "Safeguarding assent",
        description:
          user.mentorProfile.safeguardingAgreed || !consentSettings.some((item) => item.required && item.consentType === ConsentType.SAFEGUARDING)
            ? "Safeguarding assent is already captured."
            : "Complete the safeguarding consent item before review can begin.",
        complete:
          !consentSettings.some((item) => item.required && item.consentType === ConsentType.SAFEGUARDING) ||
          user.mentorProfile.safeguardingAgreed,
      },
      {
        id: "background" as const,
        label: "Background check",
        description:
          user.mentorProfile.backgroundCheckStatus === "CLEARED"
            ? "Background check has been cleared."
            : "This remains an admin-reviewed step after you complete the starter pack.",
        complete: user.mentorProfile.backgroundCheckStatus === "CLEARED",
      },
    ],
    focus,
    trainingModules: trainingModules.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      moduleBody: item.moduleBody,
      version: item.version,
      required: item.required,
      passingScore: item.passingScore,
      maxAttempts: item.maxAttempts,
      estimatedMinutes: item.estimatedMinutes,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      questionCount: item.questions.length,
      attemptsCount: item._count.attempts,
      completionsCount: 0,
      participantsCount: 0,
      lastCompletedAt: trainingCompletionMap.get(item.id)?.completedAt.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      completionRecordId: trainingCompletionMap.get(item.id)?.id ?? null,
      questions: item.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        explanation: question.explanation,
        questionType: question.questionType,
        options: Array.isArray(question.options) ? question.options.map(String) : [],
        correctAnswers:
          Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
            ? question.correctAnswers.map(String)
            : [question.correctAnswer].filter(Boolean),
        imageUrl: question.imageUrl,
        sortOrder: question.sortOrder,
        isActive: question.isActive,
      })),
      completed: trainingCompletionMap.has(item.id),
      completedAt: trainingCompletionMap.get(item.id)?.completedAt.toISOString() ?? null,
      latestAttempt: trainingAttemptMap.get(item.id)
        ? {
            score: trainingAttemptMap.get(item.id)!.score,
            passed: trainingAttemptMap.get(item.id)!.passed,
            submittedAt: trainingAttemptMap.get(item.id)!.submittedAt.toISOString(),
          }
        : null,
    })),
    consentItems: consentSettings.map((item) => ({
      id: item.id,
      title: item.title,
      consentType: item.consentType,
      version: item.version,
      summary: item.summary,
      documentBody: item.documentBody,
      documentUrl: item.documentUrl,
      required: item.required,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      completed: consentMap.has(`${item.consentType}:${item.version}`),
      consentRecordId: consentMap.get(`${item.consentType}:${item.version}`)?.id ?? null,
      agreedAt: consentMap.get(`${item.consentType}:${item.version}`)?.agreedAt.toISOString() ?? null,
      declinedAt: !consentMap.has(`${item.consentType}:${item.version}`) ? declinedConsentMap.get(`${item.consentType}:${item.version}`)?.declinedAt.toISOString() ?? null : null,
      declineReason: !consentMap.has(`${item.consentType}:${item.version}`) ? declinedConsentMap.get(`${item.consentType}:${item.version}`)?.reason ?? null : null,
      evidenceUrl: consentMap.get(`${item.consentType}:${item.version}`)?.evidenceUrl ?? null,
    })),
    backgroundCheck: {
      status: user.mentorProfile.backgroundCheckStatus,
      documentUrl: user.mentorProfile.backgroundCheckDocument ?? null,
      checkedOn: user.mentorProfile.backgroundCheckDate?.toISOString() ?? null,
      expiresAt: user.mentorProfile.backgroundCheckExpiry?.toISOString() ?? null,
      submitted: Boolean(user.mentorProfile.backgroundCheckDocument),
    },
  };
}
