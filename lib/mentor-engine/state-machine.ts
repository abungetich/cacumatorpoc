import { MentorBackgroundCheckStatus, MentorProfileStatus, MentorshipStatus } from "@prisma/client";
import type { MentorEngineState, MentorSnapshot } from "@/lib/mentor-engine/types";

export function resolveMentorState(snapshot: Omit<MentorSnapshot, "derivedState">): MentorEngineState {
  if (!snapshot.userIsActive || snapshot.profileStatus === MentorProfileStatus.INACTIVE) {
    return "INACTIVE";
  }

  if (snapshot.backgroundCheckStatus !== MentorBackgroundCheckStatus.CLEARED) {
    return "PENDING_BACKGROUND_CHECK";
  }

  if (!snapshot.trainingCompleted || !snapshot.safeguardingAgreed) {
    return "PENDING_TRAINING";
  }

  if (snapshot.profileStatus !== MentorProfileStatus.APPROVED) {
    return "PENDING_ADMIN_REVIEW";
  }

  if (snapshot.mentorshipCounts[MentorshipStatus.ACTIVE] > 0) {
    return "ACTIVE";
  }

  if (snapshot.mentorshipCounts[MentorshipStatus.PAUSED] > 0) {
    return "PAUSED";
  }

  if (snapshot.mentorshipCounts[MentorshipStatus.PENDING] > 0) {
    return "ASSIGNED";
  }

  return "MATCHABLE";
}
