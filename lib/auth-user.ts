import type { Prisma } from "@prisma/client";
import { MentorBackgroundCheckStatus, MentorProfileStatus, MenteeProfileStatus, UserRole } from "@prisma/client";
import type { AppUser, AppUserStatus } from "@/lib/auth-types";
import { deriveOrganizationAdminStatus } from "@/lib/organization-onboarding";

export type DbUserForAuth = Prisma.UserGetPayload<{
  include: {
    school: {
      select: {
        name: true;
      };
    };
    mentorProfile: {
      select: {
        status: true;
        backgroundCheckStatus: true;
        trainingCompleted: true;
        safeguardingAgreed: true;
      };
    };
    mentorOnboarding: {
      select: {
        consentSignedAt: true;
      };
    };
    organizationMemberships: {
      select: {
        role: true;
        status: true;
        organization: {
          select: {
            status: true;
            mentorParticipation: true;
            financialSupport: true;
            inKindSupport: true;
            primaryContactName: true;
            contactEmail: true;
            country: true;
            agreements: {
              select: {
                code: true;
                version: true;
              };
            };
          };
        };
      };
      where: {
        role: "ADMIN";
        status: {
          in: ["ACTIVE", "PENDING"];
        };
      };
      take: 1;
    };
    menteeProfile: {
      select: {
        status: true;
      };
    };
  };
}>;

export function deriveAccountStatus(user: DbUserForAuth): AppUserStatus {
  if (user.role === UserRole.MENTOR) {
    if (!user.emailVerifiedAt) {
      return "pending";
    }

    const needsProfileCompletion =
      user.phone === "PENDING_PROFILE" ||
      user.dateOfBirth.toISOString().startsWith("1970-01-01");

    if (needsProfileCompletion) {
      return "onboarding";
    }

    if (!user.mentorProfile) {
      return "onboarding";
    }

    const readyForReview =
      user.mentorProfile.backgroundCheckStatus === MentorBackgroundCheckStatus.CLEARED &&
      user.mentorProfile.trainingCompleted &&
      Boolean(user.mentorOnboarding?.consentSignedAt) &&
      user.mentorProfile.safeguardingAgreed;

    if (!readyForReview) {
      return "onboarding";
    }

    if (!user.isActive) {
      return "pending";
    }

    const approved = user.mentorProfile.status === MentorProfileStatus.APPROVED;
    return approved ? "active" : "pending";
  }

  if (user.role === UserRole.ORGANIZATION_ADMIN) {
    const membership = user.organizationMemberships[0];
    if (!membership) {
      return "pending";
    }

    return deriveOrganizationAdminStatus({
      user,
      organization: membership.organization,
    });
  }

  if (!user.isActive) {
    return "pending";
  }

  if (user.role === UserRole.MENTEE) {
    if (!user.menteeProfile) {
      return "pending";
    }
    return user.menteeProfile.status === MenteeProfileStatus.INACTIVE ? "pending" : "active";
  }

  return "active";
}

export function toSessionUser(user: DbUserForAuth): AppUser {
  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
  return {
    id: user.id,
    name: fullName,
    email: user.email,
    role: user.role,
    status: deriveAccountStatus(user),
    school: user.school?.name,
  };
}

export function splitFullName(name: string) {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return { firstName: "", lastName: "" };
  }

  const [firstName, ...rest] = normalized.split(" ");
  return {
    firstName,
    lastName: rest.join(" ") || "-",
  };
}
