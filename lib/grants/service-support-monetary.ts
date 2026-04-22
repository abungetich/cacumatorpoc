import { GrantTaskReviewStatus, GrantTaskStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type GrantScoringWeights = {
  timelineWeight: number;
  amountWeight: number;
  areaWeight: number;
  eligibilityWeight: number;
  readinessWeight: number;
};

const defaultGrantScoringWeights: GrantScoringWeights = {
  timelineWeight: 20,
  amountWeight: 20,
  areaWeight: 30,
  eligibilityWeight: 20,
  readinessWeight: 10,
};

export function toDateString(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function normalizeCurrencyCode(value: string) {
  return value.trim().toUpperCase();
}

export function parseMinorAmount(value: string) {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    throw new Error("Amount must be an integer in minor units");
  }
  return BigInt(normalized);
}

export function isGrantTaskCompletedForProgress(task: {
  status: GrantTaskStatus;
  reviewStatus: GrantTaskReviewStatus | null;
}) {
  if (task.status !== GrantTaskStatus.DONE) {
    return false;
  }
  return task.reviewStatus === GrantTaskReviewStatus.APPROVED || task.reviewStatus === null;
}

export function calculateWeightedFitScore(
  input: {
    timelineScore: number;
    amountScore: number;
    areaScore: number;
    eligibilityScore: number;
    readinessScore: number;
  },
  weights: GrantScoringWeights = defaultGrantScoringWeights,
) {
  const weightTotal =
    weights.timelineWeight +
    weights.amountWeight +
    weights.areaWeight +
    weights.eligibilityWeight +
    weights.readinessWeight;

  if (weightTotal <= 0) {
    return 0;
  }

  const weightedTotal =
    input.timelineScore * weights.timelineWeight +
    input.amountScore * weights.amountWeight +
    input.areaScore * weights.areaWeight +
    input.eligibilityScore * weights.eligibilityWeight +
    input.readinessScore * weights.readinessWeight;

  return Math.round((weightedTotal * 100) / (5 * weightTotal));
}

export async function getActiveGrantScoringWeights() {
  const profile = await prisma.grantScoringProfile.findFirst({
    where: {
      isActive: true,
    },
    select: {
      timelineWeight: true,
      amountWeight: true,
      areaWeight: true,
      eligibilityWeight: true,
      readinessWeight: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!profile) {
    return defaultGrantScoringWeights;
  }

  return {
    timelineWeight: profile.timelineWeight,
    amountWeight: profile.amountWeight,
    areaWeight: profile.areaWeight,
    eligibilityWeight: profile.eligibilityWeight,
    readinessWeight: profile.readinessWeight,
  } satisfies GrantScoringWeights;
}

export function parseFitMatrix(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const timelineScore = Number(record.timelineScore);
  const amountScore = Number(record.amountScore);
  const areaScore = Number(record.areaScore);
  const eligibilityScore = Number(record.eligibilityScore);
  const readinessScore = Number(record.readinessScore);
  const weightedScore = Number(record.weightedScore);
  const notes = typeof record.notes === "string" ? record.notes : null;

  if (
    [timelineScore, amountScore, areaScore, eligibilityScore, readinessScore, weightedScore].some((item) =>
      Number.isNaN(item),
    )
  ) {
    return null;
  }

  return {
    timelineScore,
    amountScore,
    areaScore,
    eligibilityScore,
    readinessScore,
    weightedScore,
    notes,
  };
}

export function extractPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${fallback} (${error.code})`;
  }
  if (error instanceof Error) {
    return `${fallback}: ${error.message}`;
  }
  return fallback;
}
