import { MentoringFormat, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  computeCapacityScore,
  computeFormatScore,
  computeInterestsScore,
  computeTotalScore,
  isFormatCompatible,
} from "@/lib/matching-engine/scoring";
import { canManageMatching, isUserInActorScope } from "@/lib/actor-context";

describe("matching scoring", () => {
  it("scores higher interest overlap when tags intersect", () => {
    const score = computeInterestsScore(["STEM", "Robotics", "Math"], ["math", "design", "robotics"]);
    expect(score).toBeGreaterThan(60);
  });

  it("accepts hybrid mentors for any mentee format", () => {
    expect(isFormatCompatible(MentoringFormat.ONLINE, ["HYBRID"])).toBe(true);
    expect(isFormatCompatible(MentoringFormat.IN_PERSON, ["HYBRID"])).toBe(true);
  });

  it("returns zero for incompatible format", () => {
    expect(computeFormatScore(MentoringFormat.ONLINE, ["IN_PERSON"])).toBe(0);
  });

  it("reduces capacity score as mentor fills up", () => {
    const open = computeCapacityScore(5, 1);
    const full = computeCapacityScore(5, 5);
    expect(open).toBeGreaterThan(full);
    expect(full).toBe(0);
  });

  it("calculates weighted score in 0-100 range", () => {
    const total = computeTotalScore({
      interests: 80,
      format: 90,
      availability: 75,
      capacity: 60,
      context: 100,
    });
    expect(total).toBeGreaterThanOrEqual(0);
    expect(total).toBeLessThanOrEqual(100);
  });
});

describe("matching scope rules", () => {
  it("allows matching for admin roles only", () => {
    expect(canManageMatching(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(canManageMatching(UserRole.SCHOOL_ADMIN)).toBe(true);
    expect(canManageMatching(UserRole.MENTOR)).toBe(false);
  });

  it("scopes school admin to same school", () => {
    expect(
      isUserInActorScope(
        {
          id: "admin-1",
          role: UserRole.SCHOOL_ADMIN,
          schoolId: "school-1",
          partnerId: null,
        },
        {
          id: "target-1",
          schoolId: "school-1",
          partnerId: "partner-1",
        },
      ),
    ).toBe(true);

    expect(
      isUserInActorScope(
        {
          id: "admin-1",
          role: UserRole.SCHOOL_ADMIN,
          schoolId: "school-1",
          partnerId: null,
        },
        {
          id: "target-2",
          schoolId: "school-2",
          partnerId: "partner-1",
        },
      ),
    ).toBe(false);
  });
});
