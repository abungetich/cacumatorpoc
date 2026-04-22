import { MentorBackgroundCheckStatus, MentorProfileStatus } from "@prisma/client";
import type { MentorEligibility, MentorEligibilityReason, MentorSnapshot } from "@/lib/mentor-engine/types";

export function evaluateMentorEligibility(snapshot: MentorSnapshot): MentorEligibility {
  const checks = {
    userActive: snapshot.userIsActive,
    profileApproved: snapshot.profileStatus === MentorProfileStatus.APPROVED,
    backgroundCleared: snapshot.backgroundCheckStatus === MentorBackgroundCheckStatus.CLEARED,
    trainingCompleted: snapshot.trainingCompleted,
    safeguardingAgreed: snapshot.safeguardingAgreed,
    hasCapacity: snapshot.currentMentees < snapshot.maxMentees,
  };

  const blockers: MentorEligibilityReason[] = [];

  if (!checks.userActive) {
    blockers.push("USER_INACTIVE");
  }
  if (!checks.profileApproved) {
    blockers.push("PROFILE_NOT_APPROVED");
  }
  if (!checks.backgroundCleared) {
    blockers.push("BACKGROUND_NOT_CLEARED");
  }
  if (!checks.trainingCompleted) {
    blockers.push("TRAINING_INCOMPLETE");
  }
  if (!checks.safeguardingAgreed) {
    blockers.push("SAFEGUARDING_NOT_AGREED");
  }
  if (!checks.hasCapacity) {
    blockers.push("CAPACITY_REACHED");
  }

  const canBeApproved =
    checks.userActive && checks.backgroundCleared && checks.trainingCompleted && checks.safeguardingAgreed;

  const canBeMatched = canBeApproved && checks.profileApproved && checks.hasCapacity;

  return {
    canBeApproved,
    canBeMatched,
    blockers,
    checks,
  };
}
