import { MentorshipStatus, MentorBackgroundCheckStatus, MentorProfileStatus, MenteeProfileStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

function isoDate(value: Date | null) {
  if (!value) {
    return "-";
  }
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function mondayStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      schoolId: true,
      partnerId: true,
    },
  });

  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 21);

  const weekStart = mondayStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const mentorshipScopeWhere =
    actor.role === UserRole.PLATFORM_ADMIN
      ? {}
      : actor.role === UserRole.PARTNER_ADMIN
        ? { program: { school: { partnerId: actor.partnerId ?? "" } } }
        : actor.role === UserRole.SCHOOL_ADMIN
          ? { program: { schoolId: actor.schoolId ?? "" } }
          : actor.role === UserRole.MENTOR
            ? { mentorId: actor.id }
            : actor.role === UserRole.MENTEE
              ? { menteeId: actor.id }
              : { mentee: { menteeProfile: { guardianUserId: actor.id } } };

  const sessionScopeWhere =
    actor.role === UserRole.PLATFORM_ADMIN
      ? {}
      : actor.role === UserRole.PARTNER_ADMIN
        ? { mentorship: { program: { school: { partnerId: actor.partnerId ?? "" } } } }
        : actor.role === UserRole.SCHOOL_ADMIN
          ? { mentorship: { program: { schoolId: actor.schoolId ?? "" } } }
          : actor.role === UserRole.MENTOR
            ? { mentorship: { mentorId: actor.id } }
            : actor.role === UserRole.MENTEE
              ? { mentorship: { menteeId: actor.id } }
              : { mentorship: { mentee: { menteeProfile: { guardianUserId: actor.id } } } };

  const activeMentorships = await prisma.mentorship.count({
    where: {
      ...mentorshipScopeWhere,
      status: MentorshipStatus.ACTIVE,
    },
  });

  let pendingApprovals = 0;
  if (actor.role === UserRole.PLATFORM_ADMIN) {
    pendingApprovals = await prisma.mentorProfile.count({
      where: {
        OR: [
          { status: MentorProfileStatus.PENDING },
          { backgroundCheckStatus: { not: MentorBackgroundCheckStatus.CLEARED } },
        ],
      },
    });
  } else if (actor.role === UserRole.SCHOOL_ADMIN || actor.role === UserRole.PARTNER_ADMIN) {
    pendingApprovals = await prisma.menteeProfile.count({
      where:
        actor.role === UserRole.SCHOOL_ADMIN
          ? { schoolId: actor.schoolId ?? "", status: MenteeProfileStatus.WAITING }
          : { school: { partnerId: actor.partnerId ?? "" }, status: MenteeProfileStatus.WAITING },
    });
  } else {
    pendingApprovals = await prisma.mentorship.count({
      where: {
        ...mentorshipScopeWhere,
        status: MentorshipStatus.PENDING,
      },
    });
  }

  const safeguardingAlerts = await prisma.mentorship.count({
    where: {
      ...mentorshipScopeWhere,
      status: MentorshipStatus.ACTIVE,
      OR: [{ lastSessionDate: null }, { lastSessionDate: { lt: cutoff } }],
    },
  });

  const sessionsThisWeek = await prisma.session.count({
    where: {
      ...sessionScopeWhere,
      scheduledDate: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
  });

  const recentAuditLogs = await prisma.auditLog.findMany({
    where:
      actor.role === UserRole.PLATFORM_ADMIN
        ? undefined
        : {
            userId: actor.id,
          },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  return NextResponse.json({
    stats: {
      activeMentorships,
      pendingApprovals,
      safeguardingAlerts,
      sessionsThisWeek,
    },
    recentActivity: recentAuditLogs.map((log) => ({
      id: log.id.slice(0, 8).toUpperCase(),
      action: log.action.replaceAll("_", " "),
      actor: `${log.user.firstName} ${log.user.lastName}`.trim(),
      entity: `${log.entityType}:${log.entityId.slice(0, 8)}`,
      timestamp: isoDate(log.createdAt),
    })),
  });
}
