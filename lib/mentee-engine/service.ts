import { MenteeProfileStatus, MentorshipStatus } from "@prisma/client";

import { getMatchingSettings } from "@/lib/matching-settings";
import { prisma } from "@/lib/prisma";
import type { MenteeDetailAction, MenteeDetailResponse } from "@/lib/api-types";

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
}

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function readAuditObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function summarizeActor(firstName: string | null | undefined, lastName: string | null | undefined) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || "System";
}

function mapAvailableActions(status: MenteeProfileStatus): MenteeDetailAction[] {
  switch (status) {
    case MenteeProfileStatus.WAITING:
      return ["MARK_MATCHED"];
    case MenteeProfileStatus.MATCHED:
      return ["ACTIVATE"];
    case MenteeProfileStatus.ACTIVE:
      return ["DEACTIVATE"];
    case MenteeProfileStatus.INACTIVE:
      return ["REOPEN_WAITING"];
    default:
      return [];
  }
}

export async function getMenteeDetailView(profileId: string): Promise<MenteeDetailResponse["item"] | null> {
  const matchingSettings = await getMatchingSettings();
  const profile = await prisma.menteeProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      userId: true,
      schoolId: true,
      educationLevel: true,
      enrollmentStatus: true,
      preferredFormat: true,
      interests: true,
      goals: true,
      specificChallenges: true,
      parentGuardianName: true,
      parentGuardianContact: true,
      parentGuardianEmail: true,
      parentGuardianConsent: true,
      parentGuardianConsentDate: true,
      guardianUserId: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      specialRequirements: true,
      status: true,
      intakeStageCached: true,
      requiresConsentCached: true,
      hasConsentCached: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          phone: true,
          dateOfBirth: true,
          createdAt: true,
          consents: {
            orderBy: { agreedAt: "desc" },
            take: 8,
            select: {
              id: true,
              consentType: true,
              version: true,
              agreedAt: true,
              documentUrl: true,
              revokedAt: true,
            },
          },
          mentorshipsAsMentee: {
            where: {
              status: {
                in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
              },
            },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              status: true,
              startedAt: true,
              nextScheduledSession: true,
              lastSessionDate: true,
              mentor: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              program: {
                select: {
                  name: true,
                },
              },
              sessions: {
                orderBy: {
                  scheduledDate: "desc",
                },
                take: 5,
                select: {
                  id: true,
                  scheduledDate: true,
                  actualDate: true,
                  attendanceStatus: true,
                  format: true,
                  durationMinutes: true,
                  topicsCovered: true,
                },
              },
              goals: {
                orderBy: {
                  targetDate: "asc",
                },
                select: {
                  id: true,
                  title: true,
                  status: true,
                  progressPercentage: true,
                  targetDate: true,
                  notes: true,
                },
              },
            },
          },
        },
      },
      school: {
        select: {
          id: true,
          name: true,
          type: true,
          address: true,
          phone: true,
          email: true,
          principalName: true,
          principalEmail: true,
          partner: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      guardianUser: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  if (!profile) {
    return null;
  }

  const activeMentorship = profile.user.mentorshipsAsMentee[0] ?? null;
  const openMentorshipCount = await prisma.mentorship.count({
    where: {
      menteeId: profile.userId,
      status: {
        in: [MentorshipStatus.PENDING, MentorshipStatus.ACTIVE, MentorshipStatus.PAUSED],
      },
    },
  });
  const blockers: string[] = [];

  if (profile.requiresConsentCached && !profile.hasConsentCached) {
    blockers.push("Guardian consent is still missing");
  }
  if (!profile.emergencyContactName.trim() || !profile.emergencyContactPhone.trim()) {
    blockers.push("Emergency contact details are incomplete");
  }
  if (profile.status === MenteeProfileStatus.INACTIVE) {
    blockers.push("Mentee is currently inactive");
  }
  if (!parseStringArray(profile.interests).length) {
    blockers.push("Interests have not been recorded");
  }
  if (openMentorshipCount >= matchingSettings.maxOpenMentorshipsPerMentee) {
    blockers.push(
      `Learner has ${openMentorshipCount} open mentorship${openMentorshipCount === 1 ? "" : "s"} and has reached the matching limit (${matchingSettings.maxOpenMentorshipsPerMentee})`,
    );
  }

  const audit = await prisma.auditLog.findMany({
    where: {
      entityType: "mentee_profiles",
      entityId: profile.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 40,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  const fullName = [profile.user.firstName, profile.user.middleName, profile.user.lastName].filter(Boolean).join(" ");

  return {
    snapshot: {
      profileId: profile.id,
      userId: profile.userId,
      fullName,
      email: profile.user.email,
      phone: profile.user.phone,
      dateOfBirth: iso(profile.user.dateOfBirth),
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      status: profile.status,
      intakeStage: profile.intakeStageCached,
      educationLevel: profile.educationLevel,
      enrollmentStatus: profile.enrollmentStatus,
      preferredFormat: profile.preferredFormat,
      schoolId: profile.schoolId,
      partnerId: profile.school.partner?.id ?? null,
      guardianUserId: profile.guardianUserId,
      schoolName: profile.school.name,
      partnerName: profile.school.partner?.name ?? null,
      requiresConsent: profile.requiresConsentCached,
      hasConsent: profile.hasConsentCached,
    },
    learnerSupport: {
      interests: parseStringArray(profile.interests),
      declaredGoals: parseStringArray(profile.goals),
      specificChallenges: profile.specificChallenges,
      specialRequirements: profile.specialRequirements,
      emergencyContactName: profile.emergencyContactName,
      emergencyContactPhone: profile.emergencyContactPhone,
    },
    schoolContext: {
      name: profile.school.name,
      type: profile.school.type,
      address: profile.school.address,
      phone: profile.school.phone,
      email: profile.school.email,
      principalName: profile.school.principalName,
      principalEmail: profile.school.principalEmail,
      partnerName: profile.school.partner?.name ?? null,
    },
    guardian: {
      parentGuardianName: profile.parentGuardianName,
      parentGuardianContact: profile.parentGuardianContact,
      parentGuardianEmail: profile.parentGuardianEmail,
      parentGuardianConsent: profile.parentGuardianConsent,
      parentGuardianConsentDate: iso(profile.parentGuardianConsentDate),
      guardianAccountName: profile.guardianUser ? `${profile.guardianUser.firstName} ${profile.guardianUser.lastName}`.trim() : null,
      guardianAccountEmail: profile.guardianUser?.email ?? null,
      activeConsents: profile.user.consents
        .filter((entry) => !entry.revokedAt)
        .map((entry) => ({
          id: entry.id,
          consentType: entry.consentType,
          version: entry.version,
          agreedAt: entry.agreedAt.toISOString(),
          documentUrl: entry.documentUrl,
        })),
    },
    goals: {
      active: activeMentorship
        ? activeMentorship.goals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            status: goal.status,
            progressPercentage: goal.progressPercentage,
            targetDate: goal.targetDate.toISOString(),
            notes: goal.notes,
          }))
        : [],
    },
    matching: {
      blockers,
      availableActions: mapAvailableActions(profile.status).filter((action) => !(profile.requiresConsentCached && !profile.hasConsentCached && action !== "DEACTIVATE")),
      activeMentorship: activeMentorship
        ? {
            id: activeMentorship.id,
            status: activeMentorship.status,
            mentorName: `${activeMentorship.mentor.firstName} ${activeMentorship.mentor.lastName}`.trim(),
            programName: activeMentorship.program.name,
            startedAt: iso(activeMentorship.startedAt),
            nextScheduledSession: iso(activeMentorship.nextScheduledSession),
            lastSessionDate: iso(activeMentorship.lastSessionDate),
          }
        : null,
      recentSessions: activeMentorship
        ? activeMentorship.sessions.map((session) => ({
            id: session.id,
            scheduledDate: session.scheduledDate.toISOString(),
            actualDate: iso(session.actualDate),
            attendanceStatus: session.attendanceStatus,
            format: session.format,
            durationMinutes: session.durationMinutes,
            topics: parseStringArray(session.topicsCovered),
          }))
        : [],
    },
    audit: audit.map((entry) => {
      const newValues = readAuditObject(entry.newValues);
      return {
        id: entry.id,
        action: entry.action,
        actor: summarizeActor(entry.user?.firstName, entry.user?.lastName),
        timestamp: entry.createdAt.toISOString(),
        comment: typeof newValues?.reason === "string" && newValues.reason.trim() ? newValues.reason.trim() : null,
        details: newValues,
      };
    }),
  };
}
