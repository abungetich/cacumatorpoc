import {
  FeedbackType,
  MentorshipOutcome,
  MentorshipStatus,
  Prisma,
  SessionAttendanceStatus,
  SessionFormat,
  UserRole,
} from "@prisma/client";
import type { ActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";

type ServiceResult<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      status: number;
      message: string;
      details?: unknown;
    };

type RequestMetadata = {
  ipAddress: string;
  userAgent: string;
};

type ScopeResolution = ServiceResult<{ where: Prisma.MentorshipWhereInput }>;

const adminRoles = new Set<UserRole>([UserRole.PLATFORM_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SCHOOL_ADMIN]);

export type RelationshipRiskFilter = "ALL" | "AT_RISK" | "ON_TRACK" | "REVIEW_DUE";

export type RelationshipOverviewItem = {
  mentorshipId: string;
  status: MentorshipStatus;
  mentor: {
    userId: string;
    name: string;
    email: string;
  };
  mentee: {
    userId: string;
    name: string;
    email: string;
  };
  program: {
    id: string;
    name: string;
    schoolId: string;
    schoolName: string;
  };
  checkInFrequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  startedAt: string | null;
  scheduledEndDate: string;
  actualEndDate: string | null;
  lastSessionDate: string | null;
  nextScheduledSession: string | null;
  sessionsLogged: number;
  feedbackCount: number;
  lastFeedbackAt: string | null;
  atRisk: boolean;
  reviewDue: boolean;
  daysSinceLastSession: number | null;
  permissions: {
    canLogSession: boolean;
    canPause: boolean;
    canResume: boolean;
    canComplete: boolean;
    canTerminate: boolean;
    canSubmitReview: boolean;
  };
};

export type RelationshipsOverviewView = {
  items: RelationshipOverviewItem[];
};

export type LogRelationshipSessionInput = {
  actor: ActorContext;
  mentorshipId: string;
  scheduledDate: string;
  actualDate?: string;
  durationMinutes: number;
  format: SessionFormat;
  location?: string;
  meetingLink?: string;
  topicsCovered: string[];
  sessionNotes: string;
  attendanceStatus: SessionAttendanceStatus;
  nextScheduledSession?: string;
  requestMeta: RequestMetadata;
};

export type RelationshipTransitionAction = "PAUSE" | "RESUME" | "COMPLETE" | "TERMINATE";

export type TransitionRelationshipStatusInput = {
  actor: ActorContext;
  mentorshipId: string;
  action: RelationshipTransitionAction;
  reason?: string;
  outcome?: MentorshipOutcome;
  requestMeta: RequestMetadata;
};

export type SubmitRelationshipReviewInput = {
  actor: ActorContext;
  mentorshipId: string;
  type: FeedbackType;
  rating: number;
  strengths?: string;
  areasForImprovement?: string;
  comments?: string;
  isAnonymous?: boolean;
  requestMeta: RequestMetadata;
};

export type RelationshipMutationResult = {
  mentorshipId: string;
  status: MentorshipStatus;
};

function extractPrismaMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return `${fallback} (${error.code})`;
  }

  if (error instanceof Error) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}

function toDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return date;
}

function isoDate(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function isMentorshipAtRisk(status: MentorshipStatus, lastSessionDate: Date | null) {
  if (status !== MentorshipStatus.ACTIVE && status !== MentorshipStatus.PAUSED) {
    return false;
  }

  if (!lastSessionDate) {
    return true;
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 21);
  return lastSessionDate < cutoff;
}

function daysSince(date: Date | null) {
  if (!date) {
    return null;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function isReviewDue(status: MentorshipStatus, startedAt: Date | null, lastFeedbackAt: Date | null) {
  if (status !== MentorshipStatus.ACTIVE && status !== MentorshipStatus.PAUSED) {
    return false;
  }

  if (!startedAt) {
    return false;
  }

  const now = new Date();
  const baseline = lastFeedbackAt ?? startedAt;
  const diffDays = Math.floor((now.getTime() - baseline.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 42;
}

function resolveScopeWhere(actor: ActorContext): ScopeResolution {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return { ok: true, data: { where: {} } };
  }

  if (actor.role === UserRole.PARTNER_ADMIN) {
    if (!actor.partnerId) {
      return {
        ok: false,
        status: 403,
        message: "Partner admin account is missing partner scope",
      };
    }

    return {
      ok: true,
      data: {
        where: {
          program: {
            school: {
              partnerId: actor.partnerId,
            },
          },
        },
      },
    };
  }

  if (actor.role === UserRole.SCHOOL_ADMIN) {
    if (!actor.schoolId) {
      return {
        ok: false,
        status: 403,
        message: "School admin account is missing school scope",
      };
    }

    return {
      ok: true,
      data: {
        where: {
          program: {
            schoolId: actor.schoolId,
          },
        },
      },
    };
  }

  if (actor.role === UserRole.MENTOR) {
    return {
      ok: true,
      data: {
        where: {
          mentorId: actor.id,
        },
      },
    };
  }

  if (actor.role === UserRole.MENTEE) {
    return {
      ok: true,
      data: {
        where: {
          menteeId: actor.id,
        },
      },
    };
  }

  return {
    ok: true,
    data: {
      where: {
        mentee: {
          menteeProfile: {
            guardianUserId: actor.id,
          },
        },
      },
    },
  };
}

type MentorshipScopeSnapshot = {
  mentorId: string;
  menteeId: string;
  program: {
    schoolId: string | null;
    school: {
      partnerId: string | null;
    } | null;
  };
  mentee: {
    menteeProfile: {
      guardianUserId: string | null;
    } | null;
  };
};

function isInScope(actor: ActorContext, mentorship: MentorshipScopeSnapshot) {
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    return true;
  }

  if (actor.role === UserRole.PARTNER_ADMIN) {
    return Boolean(actor.partnerId && mentorship.program.school?.partnerId === actor.partnerId);
  }

  if (actor.role === UserRole.SCHOOL_ADMIN) {
    return Boolean(actor.schoolId && mentorship.program.schoolId === actor.schoolId);
  }

  if (actor.role === UserRole.MENTOR) {
    return mentorship.mentorId === actor.id;
  }

  if (actor.role === UserRole.MENTEE) {
    return mentorship.menteeId === actor.id;
  }

  return mentorship.mentee.menteeProfile?.guardianUserId === actor.id;
}

function getPermissions(actor: ActorContext, mentorship: { mentorId: string; menteeId: string; status: MentorshipStatus }) {
  const isAdmin = adminRoles.has(actor.role);
  const isMentor = actor.id === mentorship.mentorId;
  const isMentee = actor.id === mentorship.menteeId;

  return {
    canLogSession: isAdmin || isMentor,
    canPause: (isAdmin || isMentor) && mentorship.status === MentorshipStatus.ACTIVE,
    canResume: (isAdmin || isMentor) && mentorship.status === MentorshipStatus.PAUSED,
    canComplete:
      (isAdmin || isMentor) &&
      (mentorship.status === MentorshipStatus.ACTIVE || mentorship.status === MentorshipStatus.PAUSED),
    canTerminate:
      isAdmin &&
      (mentorship.status === MentorshipStatus.PENDING ||
        mentorship.status === MentorshipStatus.ACTIVE ||
        mentorship.status === MentorshipStatus.PAUSED),
    canSubmitReview: isMentor || isMentee,
  };
}

export async function listRelationshipsOverview(
  actor: ActorContext,
  params?: {
    search?: string;
    status?: MentorshipStatus | "ALL";
    risk?: RelationshipRiskFilter;
  },
): Promise<ServiceResult<RelationshipsOverviewView>> {
  const scope = resolveScopeWhere(actor);
  if (!scope.ok) {
    return scope;
  }

  const rows = await prisma.mentorship.findMany({
    where: {
      ...scope.data.where,
      ...(params?.status && params.status !== "ALL" ? { status: params.status } : {}),
    },
    select: {
      id: true,
      status: true,
      mentorId: true,
      menteeId: true,
      checkInFrequency: true,
      startedAt: true,
      scheduledEndDate: true,
      actualEndDate: true,
      lastSessionDate: true,
      nextScheduledSession: true,
      mentor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      mentee: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          schoolId: true,
          school: {
            select: {
              name: true,
            },
          },
        },
      },
      feedbacks: {
        select: {
          submittedAt: true,
        },
        orderBy: {
          submittedAt: "desc",
        },
        take: 1,
      },
      _count: {
        select: {
          sessions: true,
          feedbacks: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });

  const search = params?.search?.trim().toLowerCase() ?? "";
  const risk = params?.risk ?? "ALL";

  const items = rows
    .map((item) => {
      const lastFeedbackAt = item.feedbacks[0]?.submittedAt ?? null;
      const atRisk = isMentorshipAtRisk(item.status, item.lastSessionDate);
      const reviewDue = isReviewDue(item.status, item.startedAt, lastFeedbackAt);
      const permissions = getPermissions(actor, {
        mentorId: item.mentorId,
        menteeId: item.menteeId,
        status: item.status,
      });

      return {
        mentorshipId: item.id,
        status: item.status,
        mentor: {
          userId: item.mentor.id,
          name: `${item.mentor.firstName} ${item.mentor.lastName}`.trim(),
          email: item.mentor.email,
        },
        mentee: {
          userId: item.mentee.id,
          name: `${item.mentee.firstName} ${item.mentee.lastName}`.trim(),
          email: item.mentee.email,
        },
        program: {
          id: item.program.id,
          name: item.program.name,
          schoolId: item.program.schoolId ?? "",
          schoolName: item.program.school?.name ?? "Open program",
        },
        checkInFrequency: item.checkInFrequency,
        startedAt: isoDate(item.startedAt),
        scheduledEndDate: isoDate(item.scheduledEndDate) ?? "",
        actualEndDate: isoDate(item.actualEndDate),
        lastSessionDate: isoDate(item.lastSessionDate),
        nextScheduledSession: isoDate(item.nextScheduledSession),
        sessionsLogged: item._count.sessions,
        feedbackCount: item._count.feedbacks,
        lastFeedbackAt: isoDate(lastFeedbackAt),
        atRisk,
        reviewDue,
        daysSinceLastSession: daysSince(item.lastSessionDate),
        permissions,
      } satisfies RelationshipOverviewItem;
    })
    .filter((item) => {
      if (risk === "AT_RISK" && !item.atRisk) {
        return false;
      }

      if (risk === "ON_TRACK" && item.atRisk) {
        return false;
      }

      if (risk === "REVIEW_DUE" && !item.reviewDue) {
        return false;
      }

      if (!search) {
        return true;
      }

      const haystack = [
        item.mentor.name,
        item.mentee.name,
        item.program.name,
        item.program.schoolName,
        item.status,
        item.checkInFrequency,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });

  return {
    ok: true,
    data: {
      items,
    },
  };
}

export async function logRelationshipSession(
  input: LogRelationshipSessionInput,
): Promise<ServiceResult<RelationshipMutationResult>> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM mentorships WHERE id = ${input.mentorshipId} FOR UPDATE`;

        const mentorship = await tx.mentorship.findUnique({
          where: {
            id: input.mentorshipId,
          },
          select: {
            id: true,
            mentorId: true,
            menteeId: true,
            status: true,
            program: {
              select: {
                schoolId: true,
                school: {
                  select: {
                    partnerId: true,
                  },
                },
              },
            },
            mentee: {
              select: {
                menteeProfile: {
                  select: {
                    guardianUserId: true,
                  },
                },
              },
            },
          },
        });

        if (!mentorship) {
          return {
            ok: false as const,
            status: 404,
            message: "Mentorship not found",
          };
        }

        if (!isInScope(input.actor, mentorship)) {
          return {
            ok: false as const,
            status: 403,
            message: "You cannot manage mentorships outside your scope",
          };
        }

        const permissions = getPermissions(input.actor, mentorship);
        if (!permissions.canLogSession) {
          return {
            ok: false as const,
            status: 403,
            message: "You are not allowed to log sessions for this mentorship",
          };
        }

        if (mentorship.status !== MentorshipStatus.ACTIVE && mentorship.status !== MentorshipStatus.PAUSED) {
          return {
            ok: false as const,
            status: 409,
            message: "Only active or paused mentorships can receive session logs",
          };
        }

        const scheduledDate = toDate(input.scheduledDate);
        const actualDate = input.actualDate
          ? toDate(input.actualDate)
          : input.attendanceStatus === SessionAttendanceStatus.COMPLETED
            ? scheduledDate
            : null;

        const nextScheduledSession = input.nextScheduledSession ? toDate(input.nextScheduledSession) : null;

        await tx.session.create({
          data: {
            mentorshipId: mentorship.id,
            scheduledDate,
            actualDate,
            durationMinutes: input.durationMinutes,
            format: input.format,
            location: input.location?.trim() || null,
            meetingLink: input.meetingLink?.trim() || null,
            topicsCovered: input.topicsCovered,
            sessionNotes: input.sessionNotes,
            attendanceStatus: input.attendanceStatus,
            createdBy: input.actor.id,
          },
        });

        const nextLastSessionDate =
          input.attendanceStatus === SessionAttendanceStatus.COMPLETED
            ? actualDate ?? scheduledDate
            : mentorship.status === MentorshipStatus.ACTIVE
              ? undefined
              : null;

        await tx.mentorship.update({
          where: {
            id: mentorship.id,
          },
          data: {
            ...(nextLastSessionDate ? { lastSessionDate: nextLastSessionDate } : {}),
            ...(nextScheduledSession ? { nextScheduledSession } : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "RELATIONSHIP_SESSION_LOGGED",
            entityType: "mentorships",
            entityId: mentorship.id,
            oldValues: {
              status: mentorship.status,
            },
            newValues: {
              status: mentorship.status,
              attendanceStatus: input.attendanceStatus,
              scheduledDate: input.scheduledDate,
              actualDate: actualDate ? isoDate(actualDate) : null,
              durationMinutes: input.durationMinutes,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            mentorshipId: mentorship.id,
            status: mentorship.status,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not log relationship session"),
    };
  }
}

export async function transitionRelationshipStatus(
  input: TransitionRelationshipStatusInput,
): Promise<ServiceResult<RelationshipMutationResult>> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM mentorships WHERE id = ${input.mentorshipId} FOR UPDATE`;

        const mentorship = await tx.mentorship.findUnique({
          where: {
            id: input.mentorshipId,
          },
          select: {
            id: true,
            mentorId: true,
            menteeId: true,
            status: true,
            program: {
              select: {
                schoolId: true,
                school: {
                  select: {
                    partnerId: true,
                  },
                },
              },
            },
            mentee: {
              select: {
                menteeProfile: {
                  select: {
                    guardianUserId: true,
                  },
                },
              },
            },
          },
        });

        if (!mentorship) {
          return {
            ok: false as const,
            status: 404,
            message: "Mentorship not found",
          };
        }

        if (!isInScope(input.actor, mentorship)) {
          return {
            ok: false as const,
            status: 403,
            message: "You cannot manage mentorships outside your scope",
          };
        }

        const permissions = getPermissions(input.actor, mentorship);

        let nextStatus: MentorshipStatus | null = null;
        let actionName = "RELATIONSHIP_STATUS_UPDATED";

        if (input.action === "PAUSE") {
          if (!permissions.canPause) {
            return {
              ok: false as const,
              status: 403,
              message: "You are not allowed to pause this mentorship",
            };
          }
          nextStatus = MentorshipStatus.PAUSED;
          actionName = "RELATIONSHIP_PAUSED";
        }

        if (input.action === "RESUME") {
          if (!permissions.canResume) {
            return {
              ok: false as const,
              status: 403,
              message: "You are not allowed to resume this mentorship",
            };
          }
          nextStatus = MentorshipStatus.ACTIVE;
          actionName = "RELATIONSHIP_RESUMED";
        }

        if (input.action === "COMPLETE") {
          if (!permissions.canComplete) {
            return {
              ok: false as const,
              status: 403,
              message: "You are not allowed to complete this mentorship",
            };
          }

          if (!input.outcome) {
            return {
              ok: false as const,
              status: 400,
              message: "Outcome is required when completing a mentorship",
            };
          }

          nextStatus = MentorshipStatus.COMPLETED;
          actionName = "RELATIONSHIP_COMPLETED";
        }

        if (input.action === "TERMINATE") {
          if (!permissions.canTerminate) {
            return {
              ok: false as const,
              status: 403,
              message: "You are not allowed to terminate this mentorship",
            };
          }

          nextStatus = MentorshipStatus.TERMINATED;
          actionName = "RELATIONSHIP_TERMINATED";
        }

        if (!nextStatus) {
          return {
            ok: false as const,
            status: 400,
            message: "Unsupported transition action",
          };
        }

        const reason = input.reason?.trim() || null;

        const updated = await tx.mentorship.update({
          where: {
            id: mentorship.id,
          },
          data:
            input.action === "PAUSE"
              ? {
                  status: nextStatus,
                  pauseReason: reason,
                }
              : input.action === "RESUME"
                ? {
                    status: nextStatus,
                    pauseReason: null,
                  }
                : input.action === "COMPLETE"
                  ? {
                      status: nextStatus,
                      actualEndDate: new Date(),
                      outcome: input.outcome,
                      outcomeNotes: reason,
                      terminationReason: null,
                      terminationNotes: null,
                      pauseReason: null,
                    }
                  : {
                      status: nextStatus,
                      actualEndDate: new Date(),
                      terminationReason: "MANUAL_TERMINATION",
                      terminationNotes: reason,
                    },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: actionName,
            entityType: "mentorships",
            entityId: mentorship.id,
            oldValues: {
              status: mentorship.status,
            },
            newValues: {
              status: updated.status,
              reason,
              outcome: input.outcome ?? null,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            mentorshipId: mentorship.id,
            status: updated.status,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not transition relationship status"),
    };
  }
}

export async function submitRelationshipReview(
  input: SubmitRelationshipReviewInput,
): Promise<ServiceResult<RelationshipMutationResult>> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM mentorships WHERE id = ${input.mentorshipId} FOR UPDATE`;

        const mentorship = await tx.mentorship.findUnique({
          where: {
            id: input.mentorshipId,
          },
          select: {
            id: true,
            mentorId: true,
            menteeId: true,
            status: true,
            program: {
              select: {
                schoolId: true,
                school: {
                  select: {
                    partnerId: true,
                  },
                },
              },
            },
            mentee: {
              select: {
                menteeProfile: {
                  select: {
                    guardianUserId: true,
                  },
                },
              },
            },
          },
        });

        if (!mentorship) {
          return {
            ok: false as const,
            status: 404,
            message: "Mentorship not found",
          };
        }

        if (!isInScope(input.actor, mentorship)) {
          return {
            ok: false as const,
            status: 403,
            message: "You cannot review mentorships outside your scope",
          };
        }

        const permissions = getPermissions(input.actor, mentorship);
        if (!permissions.canSubmitReview) {
          return {
            ok: false as const,
            status: 403,
            message: "Only mentor or mentee can submit relationship review",
          };
        }

        const toUserId = input.actor.id === mentorship.mentorId ? mentorship.menteeId : mentorship.mentorId;

        await tx.feedback.create({
          data: {
            mentorshipId: mentorship.id,
            fromUserId: input.actor.id,
            toUserId,
            type: input.type,
            rating: input.rating,
            strengths: input.strengths?.trim() || null,
            areasForImprovement: input.areasForImprovement?.trim() || null,
            comments: input.comments?.trim() || null,
            submittedAt: new Date(),
            isAnonymous: input.isAnonymous ?? false,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: input.actor.id,
            action: "RELATIONSHIP_REVIEW_SUBMITTED",
            entityType: "mentorships",
            entityId: mentorship.id,
            oldValues: {
              status: mentorship.status,
            },
            newValues: {
              status: mentorship.status,
              type: input.type,
              rating: input.rating,
              toUserId,
            },
            ipAddress: input.requestMeta.ipAddress,
            userAgent: input.requestMeta.userAgent,
          },
        });

        return {
          ok: true as const,
          data: {
            mentorshipId: mentorship.id,
            status: mentorship.status,
          },
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      data: result.data,
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: extractPrismaMessage(error, "Could not submit relationship review"),
    };
  }
}
