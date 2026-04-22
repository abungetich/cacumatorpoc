import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildValidationError, mentorTrainingModuleSettingSchema } from "@/lib/validation";
import { getRequestMetadata } from "@/lib/request-metadata";

export async function GET() {
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

  const [items, completions, attemptGroups, questionGroups] = await Promise.all([
    prisma.mentorTrainingModuleSetting.findMany({
      include: {
        questions: {
          where: {
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
        _count: {
          select: {
            questions: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    prisma.mentorTrainingCompletion.findMany({
      select: {
        moduleId: true,
        userId: true,
        completedAt: true,
      },
    }),
    prisma.mentorTrainingAttempt.groupBy({
      by: ["moduleId"],
      _count: {
        _all: true,
      },
    }),
    prisma.mentorTrainingQuestion.groupBy({
      by: ["moduleId"],
      where: {
        isActive: true,
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const completionMap = new Map<
    string,
    {
      completionsCount: number;
      participants: Set<string>;
      lastCompletedAt: string | null;
    }
  >();

  for (const completion of completions) {
    const current = completionMap.get(completion.moduleId) ?? {
      completionsCount: 0,
      participants: new Set<string>(),
      lastCompletedAt: null,
    };

    current.completionsCount += 1;
    current.participants.add(completion.userId);
    if (!current.lastCompletedAt || completion.completedAt.toISOString() > current.lastCompletedAt) {
      current.lastCompletedAt = completion.completedAt.toISOString();
    }

    completionMap.set(completion.moduleId, current);
  }

  const attemptMap = new Map(attemptGroups.map((item) => [item.moduleId, item._count._all]));
  const questionMap = new Map(questionGroups.map((item) => [item.moduleId, item._count._all]));

  return NextResponse.json({
    items: items.map((item) => ({
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
      questionCount: questionMap.get(item.id) ?? item._count.questions,
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
      completionsCount: completionMap.get(item.id)?.completionsCount ?? 0,
      participantsCount: completionMap.get(item.id)?.participants.size ?? 0,
      attemptsCount: attemptMap.get(item.id) ?? 0,
      lastCompletedAt: completionMap.get(item.id)?.lastCompletedAt ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
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

  const item = await prisma.mentorTrainingModuleSetting.create({
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
      action: "MENTOR_TRAINING_MODULE_CREATED",
      entityType: "mentor_training_module_settings",
      entityId: item.id,
      oldValues: Prisma.JsonNull,
      newValues: {
        title: item.title,
        version: item.version,
        passingScore: item.passingScore,
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
}
