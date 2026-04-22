import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildValidationError, mentorTrainingModuleSettingSchema } from "@/lib/validation";
import { getRequestMetadata } from "@/lib/request-metadata";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "training.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage mentor training packs" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = mentorTrainingModuleSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { moduleId } = await params;

  try {
    const item = await prisma.mentorTrainingModuleSetting.update({
      where: { id: moduleId },
      data: {
        title: parsed.data.title.trim(),
        description: parsed.data.description.trim(),
        moduleBody: parsed.data.moduleBody.trim(),
        version: parsed.data.version.trim(),
        required: parsed.data.required,
        passingScore: parsed.data.passingScore,
        maxAttempts: parsed.data.maxAttempts ?? null,
        estimatedMinutes: parsed.data.estimatedMinutes ?? null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
        questions: {
          deleteMany: {},
          create: parsed.data.questions.map((question, index) => ({
            prompt: question.prompt.trim(),
            explanation: question.explanation?.trim() || null,
            questionType: question.questionType,
            options: question.options.map((option) => option.trim()),
            correctAnswer: question.correctAnswers[0]?.trim() ?? "",
            correctAnswers: question.correctAnswers.map((answer) => answer.trim()),
            imageUrl: question.imageUrl?.trim() || null,
            sortOrder: question.sortOrder ?? index,
            isActive: question.isActive,
          })),
        },
      },
    });

    const meta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "MENTOR_TRAINING_MODULE_UPDATED",
        entityType: "mentor_training_module_settings",
        entityId: item.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          title: item.title,
          version: item.version,
          passingScore: item.passingScore,
          maxAttempts: item.maxAttempts,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        ...item,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ message: "Training module not found" }, { status: 404 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "training.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage mentor training packs" }, { status: 403 });
  }

  const { moduleId } = await params;
  const organizationId = request.nextUrl.searchParams.get("organizationId")?.trim() || null;
  const schoolId = request.nextUrl.searchParams.get("schoolId")?.trim() || null;
  const dateFrom = request.nextUrl.searchParams.get("dateFrom")?.trim() || null;
  const dateTo = request.nextUrl.searchParams.get("dateTo")?.trim() || null;

  const item = await prisma.mentorTrainingModuleSetting.findUnique({
    where: { id: moduleId },
    include: {
      questions: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
      attempts: {
        orderBy: {
          submittedAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              email: true,
              schoolId: true,
              school: {
                select: {
                  id: true,
                  name: true,
                },
              },
              organizationMemberships: {
                where: {
                  status: "ACTIVE",
                },
                include: {
                  organization: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      completions: {
        orderBy: {
          completedAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              middleName: true,
              lastName: true,
              email: true,
              schoolId: true,
              school: {
                select: {
                  id: true,
                  name: true,
                },
              },
              organizationMemberships: {
                where: {
                  status: "ACTIVE",
                },
                include: {
                  organization: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ message: "Training module not found" }, { status: 404 });
  }

  const matchesDateRange = (value: Date) => {
    const time = value.getTime();
    if (dateFrom) {
      const fromTime = new Date(`${dateFrom}T00:00:00.000Z`).getTime();
      if (!Number.isNaN(fromTime) && time < fromTime) return false;
    }
    if (dateTo) {
      const toTime = new Date(`${dateTo}T23:59:59.999Z`).getTime();
      if (!Number.isNaN(toTime) && time > toTime) return false;
    }
    return true;
  };

  const matchesCohort = (user: (typeof item.attempts)[number]["user"]) => {
    if (schoolId && user.schoolId !== schoolId) return false;
    if (organizationId && !user.organizationMemberships.some((membership) => membership.organization.id === organizationId)) {
      return false;
    }
    return true;
  };

  const filteredAttempts = item.attempts.filter((attempt) => matchesCohort(attempt.user) && matchesDateRange(attempt.submittedAt));
  const filteredCompletions = item.completions.filter((completion) => matchesCohort(completion.user) && matchesDateRange(completion.completedAt));

  const organizationFilterMap = new Map<string, { id: string; name: string; count: number }>();
  const schoolFilterMap = new Map<string, { id: string; name: string; count: number }>();
  const ingestFilterUser = (user: (typeof item.attempts)[number]["user"]) => {
    if (user.school?.id) {
      const current = schoolFilterMap.get(user.school.id) ?? {
        id: user.school.id,
        name: user.school.name,
        count: 0,
      };
      current.count += 1;
      schoolFilterMap.set(user.school.id, current);
    }
    for (const membership of user.organizationMemberships) {
      const current = organizationFilterMap.get(membership.organization.id) ?? {
        id: membership.organization.id,
        name: membership.organization.name,
        count: 0,
      };
      current.count += 1;
      organizationFilterMap.set(membership.organization.id, current);
    }
  };

  for (const attempt of item.attempts) {
    ingestFilterUser(attempt.user);
  }

  for (const completion of item.completions) {
    ingestFilterUser(completion.user);
  }

  const participantRows = filteredCompletions.map((completion) => ({
    userId: completion.user.id,
    name: [completion.user.firstName, completion.user.middleName, completion.user.lastName].filter(Boolean).join(" ").trim(),
    email: completion.user.email,
    completedAt: completion.completedAt.toISOString(),
    acknowledgedName: completion.acknowledgedName,
    notes: completion.notes,
  }));

  const buckets = new Map<string, number>();
  const participantIds = new Set<string>();
  for (const completion of filteredCompletions) {
    const label = completion.completedAt.toISOString().slice(0, 7);
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
    participantIds.add(completion.user.id);
  }

  const attemptBuckets = new Map<string, number>();
  let passCount = 0;
  let scoreTotal = 0;
  const firstAttempts = new Map<string, { passed: boolean; submittedAt: Date }>();
  const attemptsByUser = new Map<string, Array<{ passed: boolean; submittedAt: Date }>>();
  for (const attempt of filteredAttempts) {
    const label = attempt.submittedAt.toISOString().slice(0, 7);
    attemptBuckets.set(label, (attemptBuckets.get(label) ?? 0) + 1);
    if (attempt.passed) {
      passCount += 1;
    }
    scoreTotal += attempt.score;
    const existingFirstAttempt = firstAttempts.get(attempt.user.id);
    if (!existingFirstAttempt || attempt.submittedAt < existingFirstAttempt.submittedAt) {
      firstAttempts.set(attempt.user.id, { passed: attempt.passed, submittedAt: attempt.submittedAt });
    }
    const rows = attemptsByUser.get(attempt.user.id) ?? [];
    rows.push({ passed: attempt.passed, submittedAt: attempt.submittedAt });
    attemptsByUser.set(attempt.user.id, rows);
  }

  const firstAttemptPassRate =
    firstAttempts.size > 0
      ? Math.round((Array.from(firstAttempts.values()).filter((entry) => entry.passed).length / firstAttempts.size) * 100)
      : null;

  const attemptsToPass = Array.from(attemptsByUser.values())
    .map((rows) => rows.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime()).findIndex((entry) => entry.passed))
    .filter((index) => index >= 0)
    .map((index) => index + 1)
    .sort((a, b) => a - b);

  const medianAttemptsToPass =
    attemptsToPass.length > 0 ? attemptsToPass[Math.floor((attemptsToPass.length - 1) / 2)] : null;

  const maxAttemptExhaustedCount =
    item.maxAttempts
      ? Array.from(attemptsByUser.values()).filter((rows) => {
          const ordered = rows.sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
          return ordered.length >= item.maxAttempts! && !ordered.some((entry) => entry.passed);
        }).length
      : 0;

  const questionAnalytics = item.questions.map((question) => {
    const normalizedOptions = Array.isArray(question.options) ? question.options.map(String) : [];
    const optionCounts = new Map<string, number>(normalizedOptions.map((option) => [option, 0]));
    let responseCount = 0;
    let correctCount = 0;
    let skippedCount = 0;
    const correctAnswers =
      Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
        ? question.correctAnswers.map(String).sort()
        : [question.correctAnswer].filter(Boolean).map(String).sort();

    for (const attempt of filteredAttempts) {
      const answers = Array.isArray(attempt.answers) ? attempt.answers : [];
      const answer = answers.find((entry) => {
        if (!entry || typeof entry !== "object") return false;
        return "questionId" in entry && entry.questionId === question.id;
      }) as { questionId?: string; selectedOption?: string; selectedOptions?: string[] } | undefined;

      const selectedOptions = Array.isArray(answer?.selectedOptions)
        ? answer.selectedOptions.map(String)
        : answer?.selectedOption
          ? [String(answer.selectedOption)]
          : [];
      if (selectedOptions.length === 0) {
        skippedCount += 1;
        continue;
      }
      responseCount += 1;
      for (const selectedOption of selectedOptions) {
        optionCounts.set(selectedOption, (optionCounts.get(selectedOption) ?? 0) + 1);
      }
      if (selectedOptions.slice().sort().join("||") === correctAnswers.join("||")) {
        correctCount += 1;
      }
    }

    return {
      questionId: question.id,
      prompt: question.prompt,
      questionType: question.questionType,
      correctAnswers: correctAnswers,
      responseCount,
      correctCount,
      correctRate: responseCount > 0 ? Math.round((correctCount / responseCount) * 100) : null,
      skippedCount,
      topWrongAnswer: Array.from(optionCounts.entries())
        .filter(([option]) => !correctAnswers.includes(option))
        .sort((left, right) => right[1] - left[1])[0]?.[0] ?? null,
      difficultyLabel:
        responseCount === 0
          ? "Not enough data"
          : correctCount / responseCount >= 0.85
            ? "Easy"
            : correctCount / responseCount >= 0.6
              ? "Balanced"
              : "Hard",
      optionBreakdown: Array.from(optionCounts.entries()).map(([option, count]) => ({ option, count })),
    };
  });

  return NextResponse.json({
    item: {
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
      completionsCount: filteredCompletions.length,
      participantsCount: participantIds.size,
      attemptsCount: filteredAttempts.length,
      lastCompletedAt: filteredCompletions[0]?.completedAt.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      filters: {
        applied: {
          organizationId,
          schoolId,
          dateFrom,
          dateTo,
        },
        organizations: Array.from(organizationFilterMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
        schools: Array.from(schoolFilterMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      },
      analytics: {
        completionRate: filteredAttempts.length > 0 ? Math.round((filteredCompletions.length / filteredAttempts.length) * 100) : 0,
        passRate: filteredAttempts.length > 0 ? Math.round((passCount / filteredAttempts.length) * 100) : null,
        firstAttemptPassRate,
        averageScore: filteredAttempts.length > 0 ? Math.round(scoreTotal / filteredAttempts.length) : null,
        medianAttemptsToPass,
        maxAttemptExhaustedCount,
        totalAttempts: filteredAttempts.length,
        averageEstimatedMinutes: item.estimatedMinutes ?? null,
        recentAttempts: Array.from(attemptBuckets.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([label, count]) => ({ label, count })),
        recentCompletions: Array.from(buckets.entries())
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-6)
          .map(([label, count]) => ({ label, count })),
      },
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
      questionAnalytics,
      attempts: filteredAttempts.map((attempt) => ({
        id: attempt.id,
        userId: attempt.user.id,
        name: [attempt.user.firstName, attempt.user.middleName, attempt.user.lastName].filter(Boolean).join(" ").trim(),
        email: attempt.user.email,
        score: attempt.score,
        passed: attempt.passed,
        submittedAt: attempt.submittedAt.toISOString(),
        acknowledgedName: attempt.acknowledgedName,
      })),
      participation: participantRows,
      activityNote:
        `This module tracks scored attempts, recorded completions, and participant acknowledgements. Completion is only awarded when the configured passing score is met${item.maxAttempts ? `, with a maximum of ${item.maxAttempts} attempts per mentor.` : "."}`,
    },
  });
}
