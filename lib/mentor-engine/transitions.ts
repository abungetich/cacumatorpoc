import { MentorBackgroundCheckStatus, MentorProfileStatus, UserRole } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { evaluateMentorEligibility } from "@/lib/mentor-engine/eligibility";
import type { MentorEngineAction, MentorSnapshot, MentorTransitionDetails } from "@/lib/mentor-engine/types";

type TransitionInput = {
  snapshot: MentorSnapshot;
  action: MentorEngineAction;
  actorRole: UserRole;
  actorId: string;
  isSelfAction: boolean;
  reason?: string;
  details?: MentorTransitionDetails;
};

export type TransitionDecision =
  | {
      ok: true;
      auditAction: string;
      mentorProfileData: Prisma.MentorProfileUpdateInput;
      userData?: Prisma.UserUpdateInput;
      auditData?: Record<string, unknown>;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

const selfServiceActions: MentorEngineAction[] = ["COMPLETE_TRAINING", "AGREE_SAFEGUARDING", "SUBMIT_FOR_REVIEW"];

function isActorAllowed(input: TransitionInput) {
  if (input.actorRole === UserRole.PLATFORM_ADMIN) {
    return true;
  }

  if (input.actorRole === UserRole.MENTOR && input.isSelfAction && selfServiceActions.includes(input.action)) {
    return true;
  }

  return false;
}

function parseReason(reason: string | undefined) {
  const normalized = reason?.trim();
  return normalized && normalized.length >= 5 ? normalized : null;
}

function parseComment(reason: string | undefined) {
  const normalized = reason?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function parseDateInput(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseUrl(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function parseText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function prepareMentorTransition(input: TransitionInput): TransitionDecision {
  if (!isActorAllowed(input)) {
    return {
      ok: false,
      status: 403,
      message: "You are not allowed to perform this mentor transition",
    };
  }

  const eligibility = evaluateMentorEligibility(input.snapshot);

  switch (input.action) {
    case "BACKGROUND_CLEAR": {
      if (input.snapshot.backgroundCheckStatus === MentorBackgroundCheckStatus.CLEARED) {
        return { ok: false, status: 409, message: "Background check is already cleared" };
      }

      const checkedAt = parseDateInput(input.details?.effectiveAt) ?? new Date();
      const expiryDate = parseDateInput(input.details?.expiryDate);
      const evidenceUrl = parseUrl(input.details?.evidenceUrl);

      return {
        ok: true,
        auditAction: "MENTOR_BACKGROUND_CHECK_CLEARED",
        mentorProfileData: {
          backgroundCheckStatus: MentorBackgroundCheckStatus.CLEARED,
          backgroundCheckDate: checkedAt,
          backgroundCheckExpiry: expiryDate,
          ...(evidenceUrl ? { backgroundCheckDocument: evidenceUrl } : {}),
        },
        auditData: {
          comment: parseComment(input.reason),
          details: {
            effectiveAt: checkedAt.toISOString(),
            expiryDate: expiryDate?.toISOString() ?? null,
            evidenceUrl,
          },
        },
      };
    }

    case "BACKGROUND_FAIL": {
      const reason = parseReason(input.reason);
      if (!reason) {
        return {
          ok: false,
          status: 400,
          message: "Background check notes must be at least 5 characters",
        };
      }

      return {
        ok: true,
        auditAction: "MENTOR_BACKGROUND_CHECK_FAILED",
        mentorProfileData: {
          backgroundCheckStatus: MentorBackgroundCheckStatus.FAILED,
          status: MentorProfileStatus.REJECTED,
          rejectionReason: reason,
          approver: {
            disconnect: true,
          },
          approvedAt: null,
        },
        auditData: {
          comment: reason,
        },
      };
    }

    case "COMPLETE_TRAINING": {
      if (input.snapshot.trainingCompleted) {
        return { ok: false, status: 409, message: "Training is already completed" };
      }

      const completedAt = parseDateInput(input.details?.effectiveAt) ?? new Date();
      const evidenceUrl = parseUrl(input.details?.evidenceUrl);
      const trainingName = parseText(input.details?.trainingName);

      return {
        ok: true,
        auditAction: "MENTOR_TRAINING_COMPLETED",
        mentorProfileData: {
          trainingCompleted: true,
          trainingCompletedDate: completedAt,
        },
        auditData: {
          comment: parseComment(input.reason),
          details: {
            effectiveAt: completedAt.toISOString(),
            evidenceUrl,
            trainingName,
          },
        },
      };
    }

    case "AGREE_SAFEGUARDING": {
      if (input.snapshot.safeguardingAgreed) {
        return { ok: false, status: 409, message: "Safeguarding agreement is already recorded" };
      }

      const agreedAt = parseDateInput(input.details?.effectiveAt) ?? new Date();
      const evidenceUrl = parseUrl(input.details?.evidenceUrl);
      const agreementVersion = parseText(input.details?.agreementVersion);

      return {
        ok: true,
        auditAction: "MENTOR_SAFEGUARDING_AGREED",
        mentorProfileData: {
          safeguardingAgreed: true,
          safeguardingAgreedDate: agreedAt,
        },
        auditData: {
          comment: parseComment(input.reason),
          details: {
            effectiveAt: agreedAt.toISOString(),
            evidenceUrl,
            agreementVersion,
          },
        },
      };
    }

    case "SUBMIT_FOR_REVIEW": {
      if (input.snapshot.profileStatus === MentorProfileStatus.APPROVED) {
        return {
          ok: false,
          status: 409,
          message: "Approved mentors cannot be submitted for review",
        };
      }

      if (!eligibility.canBeApproved) {
        return {
          ok: false,
          status: 409,
          message: "Mentor is not ready for admin review",
        };
      }

      return {
        ok: true,
        auditAction: "MENTOR_SUBMITTED_FOR_REVIEW",
        mentorProfileData: {
          status: MentorProfileStatus.PENDING,
          rejectionReason: null,
          approver: {
            disconnect: true,
          },
          approvedAt: null,
        },
        auditData: {
          comment: parseComment(input.reason),
        },
      };
    }

    case "APPROVE": {
      if (input.snapshot.profileStatus !== MentorProfileStatus.PENDING) {
        return {
          ok: false,
          status: 409,
          message: "Only pending mentor profiles can be approved",
        };
      }

      if (!eligibility.canBeApproved) {
        return {
          ok: false,
          status: 409,
          message: "Mentor does not satisfy approval gates",
        };
      }

      const approvalComment = parseReason(input.reason);
      if (!approvalComment) {
        return {
          ok: false,
          status: 400,
          message: "Approval notes must be at least 5 characters",
        };
      }

      return {
        ok: true,
        auditAction: "MENTOR_APPROVED",
        mentorProfileData: {
          status: MentorProfileStatus.APPROVED,
          approver: {
            connect: {
              id: input.actorId,
            },
          },
          approvedAt: new Date(),
          rejectionReason: null,
        },
        auditData: {
          comment: approvalComment,
        },
      };
    }

    case "REJECT": {
      if (input.snapshot.profileStatus !== MentorProfileStatus.PENDING) {
        return {
          ok: false,
          status: 409,
          message: "Only pending mentor profiles can be rejected",
        };
      }

      const reason = parseReason(input.reason);
      if (!reason) {
        return {
          ok: false,
          status: 400,
          message: "Rejection reason must be at least 5 characters",
        };
      }

      return {
        ok: true,
        auditAction: "MENTOR_REJECTED",
        mentorProfileData: {
          status: MentorProfileStatus.REJECTED,
          rejectionReason: reason,
          approver: {
            disconnect: true,
          },
          approvedAt: null,
        },
        auditData: {
          comment: reason,
        },
      };
    }

    case "DEACTIVATE": {
      if (input.snapshot.profileStatus === MentorProfileStatus.INACTIVE) {
        return {
          ok: false,
          status: 409,
          message: "Mentor profile is already inactive",
        };
      }

      return {
        ok: true,
        auditAction: "MENTOR_DEACTIVATED",
        mentorProfileData: {
          status: MentorProfileStatus.INACTIVE,
        },
        auditData: {
          comment: parseComment(input.reason),
        },
      };
    }

    case "REACTIVATE": {
      if (input.snapshot.profileStatus !== MentorProfileStatus.INACTIVE) {
        return {
          ok: false,
          status: 409,
          message: "Mentor profile is not inactive",
        };
      }

      return {
        ok: true,
        auditAction: "MENTOR_REACTIVATED",
        mentorProfileData: {
          status: eligibility.canBeApproved ? MentorProfileStatus.APPROVED : MentorProfileStatus.PENDING,
        },
        userData: {
          isActive: true,
        },
        auditData: {
          comment: parseComment(input.reason),
        },
      };
    }

    default: {
      return {
        ok: false,
        status: 400,
        message: "Unsupported mentor transition action",
      };
    }
  }
}
