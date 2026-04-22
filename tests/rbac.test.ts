import { describe, expect, it } from "vitest";
import { UserRole } from "@prisma/client";
import { canCreateMentee, canManageGrants, canOnboardSchool, canViewMentor, getAuditScopeWhere } from "@/lib/actor-context";

describe("rbac helpers", () => {
  it("allows create mentee for admin roles", () => {
    expect(canCreateMentee(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(canCreateMentee(UserRole.SCHOOL_ADMIN)).toBe(true);
    expect(canCreateMentee(UserRole.PARTNER_ADMIN)).toBe(true);
  });

  it("denies create mentee for non-admin roles", () => {
    expect(canCreateMentee(UserRole.MENTOR)).toBe(false);
    expect(canCreateMentee(UserRole.MENTEE)).toBe(false);
    expect(canCreateMentee(UserRole.GUARDIAN)).toBe(false);
  });

  it("scopes audit by school for school admin", () => {
    const where = getAuditScopeWhere({
      id: "u-1",
      role: UserRole.SCHOOL_ADMIN,
      schoolId: "school-1",
      partnerId: null,
    });

    expect(where).toEqual({
      user: {
        schoolId: "school-1",
      },
    });
  });

  it("allows school admin to view mentor in same school", () => {
    const result = canViewMentor(
      {
        id: "admin-1",
        role: UserRole.SCHOOL_ADMIN,
        schoolId: "school-1",
        partnerId: null,
      },
      {
        userId: "mentor-1",
        schoolId: "school-1",
        partnerId: null,
      },
    );

    expect(result).toBe(true);
  });

  it("blocks guardian from mentor engine access", () => {
    const result = canViewMentor(
      {
        id: "guardian-1",
        role: UserRole.GUARDIAN,
        schoolId: null,
        partnerId: null,
      },
      {
        userId: "mentor-1",
        schoolId: "school-1",
        partnerId: "partner-1",
      },
    );

    expect(result).toBe(false);
  });

  it("allows school onboarding only for platform and partner admin", () => {
    expect(canOnboardSchool(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(canOnboardSchool(UserRole.PARTNER_ADMIN)).toBe(true);
    expect(canOnboardSchool(UserRole.SCHOOL_ADMIN)).toBe(false);
  });

  it("allows grant management only for admin roles", () => {
    expect(canManageGrants(UserRole.PLATFORM_ADMIN)).toBe(true);
    expect(canManageGrants(UserRole.PARTNER_ADMIN)).toBe(true);
    expect(canManageGrants(UserRole.SCHOOL_ADMIN)).toBe(true);
    expect(canManageGrants(UserRole.MENTOR)).toBe(false);
    expect(canManageGrants(UserRole.MENTEE)).toBe(false);
  });
});
