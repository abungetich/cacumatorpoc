import { prisma } from "@/lib/prisma";

export type MatchingSettingsView = {
  id: string;
  interestsWeight: number;
  contextWeight: number;
  availabilityWeight: number;
  formatWeight: number;
  capacityWeight: number;
  penalizeNearCapacity: boolean;
  nearCapacityPenalty: number;
  penalizeLowAvailability: boolean;
  lowAvailabilityPenalty: number;
  penalizeWeakContext: boolean;
  weakContextPenalty: number;
  penalizePriorDecline: boolean;
  priorDeclinePenalty: number;
  excludePriorDeclinedPair: boolean;
  maxOpenMentorshipsPerMentee: number;
  availabilityDeclinePenalty: number;
  formatDeclinePenalty: number;
  fitDeclinePenalty: number;
  contextDeclinePenalty: number;
  otherDeclinePenalty: number;
};

export const DEFAULT_MATCHING_SETTINGS: MatchingSettingsView = {
  id: "default",
  interestsWeight: 30,
  contextWeight: 20,
  availabilityWeight: 20,
  formatWeight: 15,
  capacityWeight: 15,
  penalizeNearCapacity: true,
  nearCapacityPenalty: 8,
  penalizeLowAvailability: true,
  lowAvailabilityPenalty: 6,
  penalizeWeakContext: true,
  weakContextPenalty: 4,
  penalizePriorDecline: true,
  priorDeclinePenalty: 12,
  excludePriorDeclinedPair: false,
  maxOpenMentorshipsPerMentee: 3,
  availabilityDeclinePenalty: 10,
  formatDeclinePenalty: 9,
  fitDeclinePenalty: 8,
  contextDeclinePenalty: 7,
  otherDeclinePenalty: 6,
};

export async function getMatchingSettings(): Promise<MatchingSettingsView> {
  try {
    const item = await prisma.matchingSettings.findUnique({
      where: { id: DEFAULT_MATCHING_SETTINGS.id },
      select: {
        id: true,
        interestsWeight: true,
        contextWeight: true,
        availabilityWeight: true,
        formatWeight: true,
        capacityWeight: true,
        penalizeNearCapacity: true,
        nearCapacityPenalty: true,
        penalizeLowAvailability: true,
        lowAvailabilityPenalty: true,
        penalizeWeakContext: true,
        weakContextPenalty: true,
        penalizePriorDecline: true,
        priorDeclinePenalty: true,
        excludePriorDeclinedPair: true,
        maxOpenMentorshipsPerMentee: true,
        availabilityDeclinePenalty: true,
        formatDeclinePenalty: true,
        fitDeclinePenalty: true,
        contextDeclinePenalty: true,
        otherDeclinePenalty: true,
      },
    });

    return item ?? { ...DEFAULT_MATCHING_SETTINGS };
  } catch {
    return { ...DEFAULT_MATCHING_SETTINGS };
  }
}

export async function saveMatchingSettings(input: Omit<MatchingSettingsView, "id">): Promise<MatchingSettingsView> {
  return prisma.matchingSettings.upsert({
    where: { id: DEFAULT_MATCHING_SETTINGS.id },
    update: input,
    create: {
      id: DEFAULT_MATCHING_SETTINGS.id,
      ...input,
    },
    select: {
      id: true,
      interestsWeight: true,
      contextWeight: true,
      availabilityWeight: true,
      formatWeight: true,
      capacityWeight: true,
      penalizeNearCapacity: true,
      nearCapacityPenalty: true,
      penalizeLowAvailability: true,
      lowAvailabilityPenalty: true,
      penalizeWeakContext: true,
      weakContextPenalty: true,
      penalizePriorDecline: true,
      priorDeclinePenalty: true,
      excludePriorDeclinedPair: true,
      maxOpenMentorshipsPerMentee: true,
      availabilityDeclinePenalty: true,
      formatDeclinePenalty: true,
      fitDeclinePenalty: true,
      contextDeclinePenalty: true,
      otherDeclinePenalty: true,
    },
  });
}
