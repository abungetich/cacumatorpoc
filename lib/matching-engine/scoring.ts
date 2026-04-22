import { MentoringFormat } from "@prisma/client";

export type MatchScoreBreakdown = {
  interests: number;
  format: number;
  availability: number;
  capacity: number;
  context: number;
};

export type MatchRiskPenalty = {
  code: string;
  label: string;
  penalty: number;
};

export type MatchScoreWeights = {
  interests: number;
  context: number;
  availability: number;
  format: number;
  capacity: number;
};

export function normalizeTagList(values: string[]) {
  const normalized = values
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  return Array.from(new Set(normalized));
}

export function computeInterestsScore(menteeInterests: string[], mentorExpertise: string[]) {
  const mentee = normalizeTagList(menteeInterests);
  const mentor = new Set(normalizeTagList(mentorExpertise));

  if (mentee.length === 0) {
    return 50;
  }

  let matches = 0;
  for (const interest of mentee) {
    if (mentor.has(interest)) {
      matches += 1;
    }
  }

  return Math.round((matches / mentee.length) * 100);
}

export function isFormatCompatible(menteeFormat: MentoringFormat, mentorFormats: string[]) {
  const normalized = normalizeTagList(mentorFormats).map((value) => value.replace("-", "_").toUpperCase());
  if (normalized.includes("HYBRID")) {
    return true;
  }

  return normalized.includes(menteeFormat);
}

export function computeFormatScore(menteeFormat: MentoringFormat, mentorFormats: string[]) {
  const normalized = normalizeTagList(mentorFormats).map((value) => value.replace("-", "_").toUpperCase());
  if (normalized.includes("HYBRID") && normalized.includes(menteeFormat)) {
    return 100;
  }
  if (normalized.includes(menteeFormat)) {
    return 95;
  }
  if (normalized.includes("HYBRID")) {
    return 88;
  }
  return 0;
}

export function computeAvailabilityScore(slotCount: number) {
  if (slotCount >= 3) {
    return 100;
  }
  if (slotCount === 2) {
    return 80;
  }
  if (slotCount === 1) {
    return 60;
  }
  return 35;
}

export function computeCapacityScore(maxMentees: number, currentMentees: number) {
  if (maxMentees <= 0) {
    return 0;
  }

  const free = Math.max(0, maxMentees - currentMentees);
  return Math.round((free / maxMentees) * 100);
}

export function computeBaseScore(
  breakdown: MatchScoreBreakdown,
  weights: MatchScoreWeights = {
    interests: 30,
    context: 20,
    availability: 20,
    format: 15,
    capacity: 15,
  },
) {
  const totalWeight = weights.interests + weights.context + weights.availability + weights.format + weights.capacity || 100;
  const weighted =
    breakdown.interests * weights.interests +
    breakdown.context * weights.context +
    breakdown.availability * weights.availability +
    breakdown.format * weights.format +
    breakdown.capacity * weights.capacity;
  return Math.round(weighted / totalWeight);
}

export function computeRiskAdjustedScore(baseScore: number, penalties: MatchRiskPenalty[]) {
  const totalPenalty = penalties.reduce((sum, item) => sum + item.penalty, 0);
  return Math.max(0, Math.min(100, baseScore - totalPenalty));
}

export function computeTotalScore(breakdown: MatchScoreBreakdown) {
  return computeBaseScore(breakdown);
}

export function resolveFitLabel(score: number) {
  if (score >= 85) return "Excellent fit";
  if (score >= 70) return "Strong fit";
  if (score >= 55) return "Moderate fit";
  return "Watchlist fit";
}
