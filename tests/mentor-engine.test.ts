import {
  MentorBackgroundCheckStatus,
  MentorProfileStatus,
  MentorshipStatus,
  UserRole,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import { resolveMentorState } from "@/lib/mentor-engine/state-machine";
import { prepareMentorTransition } from "@/lib/mentor-engine/transitions";
import type { MentorSnapshot } from "@/lib/mentor-engine/types";

function baseSnapshot(overrides: Partial<MentorSnapshot> = {}): MentorSnapshot {
  return {
    userId: "mentor-1",
    profileId: "profile-1",
    fullName: "John Mentor",
    role: UserRole.MENTOR,
    userIsActive: true,
    schoolId: "school-1",
    partnerId: "partner-1",
    profileStatus: MentorProfileStatus.PENDING,
    backgroundCheckStatus: MentorBackgroundCheckStatus.PENDING,
    trainingCompleted: false,
    safeguardingAgreed: false,
    maxMentees: 3,
    currentMentees: 0,
    mentorshipCounts: {
      [MentorshipStatus.PENDING]: 0,
      [MentorshipStatus.ACTIVE]: 0,
      [MentorshipStatus.PAUSED]: 0,
      [MentorshipStatus.COMPLETED]: 0,
      [MentorshipStatus.TERMINATED]: 0,
    },
    derivedState: "PENDING_BACKGROUND_CHECK",
    ...overrides,
  };
}

describe("mentor engine state machine", () => {
  it("resolves pending background check when not cleared", () => {
    const snapshot = baseSnapshot();

    expect(resolveMentorState(snapshot)).toBe("PENDING_BACKGROUND_CHECK");
  });

  it("resolves pending training after background is cleared", () => {
    const snapshot = baseSnapshot({
      backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
    });

    expect(resolveMentorState(snapshot)).toBe("PENDING_TRAINING");
  });

  it("resolves pending admin review when all gates are complete but approval pending", () => {
    const snapshot = baseSnapshot({
      backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
      trainingCompleted: true,
      safeguardingAgreed: true,
    });

    expect(resolveMentorState(snapshot)).toBe("PENDING_ADMIN_REVIEW");
  });

  it("resolves active when mentor has active mentorships", () => {
    const snapshot = baseSnapshot({
      profileStatus: MentorProfileStatus.APPROVED,
      backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
      trainingCompleted: true,
      safeguardingAgreed: true,
      mentorshipCounts: {
        [MentorshipStatus.PENDING]: 0,
        [MentorshipStatus.ACTIVE]: 1,
        [MentorshipStatus.PAUSED]: 0,
        [MentorshipStatus.COMPLETED]: 0,
        [MentorshipStatus.TERMINATED]: 0,
      },
    });

    expect(resolveMentorState(snapshot)).toBe("ACTIVE");
  });
});

describe("mentor engine eligibility", () => {
  it("marks mentor as matchable when all checks pass", () => {
    const snapshot = baseSnapshot({
      profileStatus: MentorProfileStatus.APPROVED,
      backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
      trainingCompleted: true,
      safeguardingAgreed: true,
    });
    const eligibility = evaluateMentorEligibility(snapshot);

    expect(eligibility.canBeApproved).toBe(true);
    expect(eligibility.canBeMatched).toBe(true);
    expect(eligibility.blockers).toEqual([]);
  });

  it("returns blockers for incomplete mentor profile", () => {
    const snapshot = baseSnapshot();
    const eligibility = evaluateMentorEligibility(snapshot);

    expect(eligibility.canBeMatched).toBe(false);
    expect(eligibility.blockers).toContain("PROFILE_NOT_APPROVED");
    expect(eligibility.blockers).toContain("BACKGROUND_NOT_CLEARED");
    expect(eligibility.blockers).toContain("TRAINING_INCOMPLETE");
    expect(eligibility.blockers).toContain("SAFEGUARDING_NOT_AGREED");
  });
});

describe("mentor engine transitions", () => {
  it("prevents approve when gates are incomplete", () => {
    const decision = prepareMentorTransition({
      snapshot: baseSnapshot(),
      action: "APPROVE",
      actorRole: UserRole.PLATFORM_ADMIN,
      actorId: "admin-1",
      isSelfAction: false,
    });

    expect(decision.ok).toBe(false);
  });

  it("allows platform admin to approve when gates pass", () => {
    const decision = prepareMentorTransition({
      snapshot: baseSnapshot({
        profileStatus: MentorProfileStatus.PENDING,
        backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
        trainingCompleted: true,
        safeguardingAgreed: true,
      }),
      action: "APPROVE",
      actorRole: UserRole.PLATFORM_ADMIN,
      actorId: "admin-1",
      isSelfAction: false,
    });

    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.auditAction).toBe("MENTOR_APPROVED");
    }
  });

  it("blocks approve for non-pending mentor profile", () => {
    const decision = prepareMentorTransition({
      snapshot: baseSnapshot({
        profileStatus: MentorProfileStatus.APPROVED,
        backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
        trainingCompleted: true,
        safeguardingAgreed: true,
      }),
      action: "APPROVE",
      actorRole: UserRole.PLATFORM_ADMIN,
      actorId: "admin-1",
      isSelfAction: false,
    });

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.status).toBe(409);
    }
  });

  it("allows mentor self-service training completion", () => {
    const decision = prepareMentorTransition({
      snapshot: baseSnapshot({
        backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
      }),
      action: "COMPLETE_TRAINING",
      actorRole: UserRole.MENTOR,
      actorId: "mentor-1",
      isSelfAction: true,
    });

    expect(decision.ok).toBe(true);
  });

  it("blocks mentor from admin-only approval action", () => {
    const decision = prepareMentorTransition({
      snapshot: baseSnapshot({
        backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
        trainingCompleted: true,
        safeguardingAgreed: true,
      }),
      action: "APPROVE",
      actorRole: UserRole.MENTOR,
      actorId: "mentor-1",
      isSelfAction: true,
    });

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.status).toBe(403);
    }
  });
});
