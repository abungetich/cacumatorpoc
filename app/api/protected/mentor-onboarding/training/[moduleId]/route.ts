import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { buildValidationError, mentorTrainingCompletionSchema } from "@/lib/validation";
import { getRequestMetadata } from "@/lib/request-metadata";
import { safeSendMentorOnboardingProgressEmail } from "@/lib/mentor-onboarding/email";
import { getMentorOnboardingWorkspace } from "@/lib/mentor-onboarding-workspace";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";

export async function POST(request: NextRequest, { params }: { params: Promise<{ moduleId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "MENTOR") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = mentorTrainingCompletionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { moduleId } = await params;
  const trainingModule = await prisma.mentorTrainingModuleSetting.findUnique({
    where: { id: moduleId },
    include: {
      questions: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!trainingModule || !trainingModule.isActive) {
    return NextResponse.json({ message: "Training module not found" }, { status: 404 });
  }

  const existingAttemptCount = await prisma.mentorTrainingAttempt.count({
    where: {
      userId: session.user.id,
      moduleId: trainingModule.id,
    },
  });

  if (trainingModule.maxAttempts && existingAttemptCount >= trainingModule.maxAttempts) {
    return NextResponse.json(
      { message: `You have reached the maximum number of attempts for this module (${trainingModule.maxAttempts}).` },
      { status: 400 },
    );
  }

  if (trainingModule.questions.length === 0) {
    return NextResponse.json({ message: "This training module has no assessment questions configured yet" }, { status: 400 });
  }

  const answersByQuestionId = new Map(parsed.data.answers.map((answer) => [answer.questionId, answer.selectedOptions.map((selectedOption) => selectedOption.trim())]));
  const missingQuestion = trainingModule.questions.find((question) => !answersByQuestionId.has(question.id));
  if (missingQuestion) {
    return NextResponse.json({ message: "Answer every quiz question before submitting" }, { status: 400 });
  }

  const invalidAnswer = parsed.data.answers.find((answer) => {
    const question = trainingModule.questions.find((item) => item.id === answer.questionId);
    if (!question) {
      return true;
    }
    const normalizedAnswers = [...new Set(answer.selectedOptions.map((selectedOption) => selectedOption.trim()).filter(Boolean))];
    if (question.questionType === "SINGLE_CHOICE" && normalizedAnswers.length !== 1) {
      return true;
    }
    if (question.questionType === "MULTI_CHOICE" && normalizedAnswers.length < 1) {
      return true;
    }
    const options = Array.isArray(question.options) ? question.options.map(String) : [];
    return normalizedAnswers.some((selectedOption) => !options.includes(selectedOption));
  });
  if (invalidAnswer) {
    return NextResponse.json({ message: "One or more selected answers are invalid for this module" }, { status: 400 });
  }

  const correctCount = trainingModule.questions.filter((question) => {
    const answer = parsed.data.answers.find((entry) => entry.questionId === question.id);
    if (!answer) return false;
    const selectedOptions = [...new Set(answer.selectedOptions.map((selectedOption) => selectedOption.trim()).filter(Boolean))].sort();
    const correctAnswers =
      Array.isArray(question.correctAnswers) && question.correctAnswers.length > 0
        ? question.correctAnswers.map(String).sort()
        : [question.correctAnswer].filter(Boolean).map(String).sort();
    return selectedOptions.join("||") === correctAnswers.join("||");
  }).length;
  const score = Math.round((correctCount / trainingModule.questions.length) * 100);
  const passed = score >= trainingModule.passingScore;

  const meta = getRequestMetadata(request);

  await prisma.$transaction(async (tx) => {
    await tx.mentorTrainingAttempt.create({
      data: {
        userId: session.user.id,
        moduleId: trainingModule.id,
        score,
        passed,
        acknowledgedName: parsed.data.acknowledgedName.trim(),
        answers: parsed.data.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOption: answer.selectedOptions[0]?.trim() ?? null,
          selectedOptions: [...new Set(answer.selectedOptions.map((selectedOption) => selectedOption.trim()).filter(Boolean))],
        })),
        submittedAt: new Date(),
      },
    });

    if (passed) {
      await tx.mentorTrainingCompletion.upsert({
        where: {
          userId_moduleId: {
            userId: session.user.id,
            moduleId: trainingModule.id,
          },
        },
        update: {
          acknowledgedName: parsed.data.acknowledgedName.trim(),
          completedAt: new Date(),
          notes: parsed.data.notes?.trim() || null,
        },
        create: {
          userId: session.user.id,
          moduleId: trainingModule.id,
          acknowledgedName: parsed.data.acknowledgedName.trim(),
          completedAt: new Date(),
          notes: parsed.data.notes?.trim() || null,
        },
      });
    }

    await syncMentorOnboarding(session.user.id, tx);

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: "MENTOR_TRAINING_SELF_COMPLETED",
        entityType: "mentor_training_module_settings",
        entityId: trainingModule.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          title: trainingModule.title,
          version: trainingModule.version,
          acknowledgedName: parsed.data.acknowledgedName.trim(),
          confirmed: parsed.data.confirmed,
          reachedEnd: parsed.data.reachedEnd,
          notes: parsed.data.notes?.trim() || null,
          score,
          passingScore: trainingModule.passingScore,
          passed,
          questionCount: trainingModule.questions.length,
        },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  });

  if (passed) {
    void safeSendMentorOnboardingProgressEmail({
      userId: session.user.id,
      achievedStep: "Training module completed",
      detail: `${trainingModule.title} (${score}%)`,
    });
  }

  invalidatePeopleOverviewCache();

  const item = await getMentorOnboardingWorkspace(session.user.id);
  return NextResponse.json({ ok: true, passed, score, passingScore: trainingModule.passingScore, item });
}
