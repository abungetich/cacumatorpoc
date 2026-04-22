import { MenteeProfileStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canManageMentee, getActorContext } from "@/lib/actor-context";
import { resolveMenteeIntakeSnapshot } from "@/lib/mentee-intake";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, menteeIntakeTransitionSchema } from "@/lib/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ menteeProfileId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.PARTNER_ADMIN && !actor.partnerId) {
    return NextResponse.json({ message: "Partner admin account is missing partner scope" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = menteeIntakeTransitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { menteeProfileId } = await params;

  const profile = await prisma.menteeProfile.findUnique({
    where: { id: menteeProfileId },
    select: {
      id: true,
      schoolId: true,
      status: true,
      parentGuardianConsent: true,
      user: {
        select: {
          id: true,
          dateOfBirth: true,
        },
      },
      school: {
        select: {
          partnerId: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ message: "Mentee not found" }, { status: 404 });
  }

  if (
    !canManageMentee(actor, {
      userId: profile.user.id,
      schoolId: profile.schoolId,
      partnerId: profile.school.partnerId,
      guardianUserId: null,
    })
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.PARTNER_ADMIN && actor.partnerId !== profile.school.partnerId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.SCHOOL_ADMIN && actor.schoolId !== profile.schoolId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const requiresConsent = resolveMenteeIntakeSnapshot({
    status: profile.status,
    dateOfBirth: profile.user.dateOfBirth,
    parentGuardianConsent: profile.parentGuardianConsent,
  }).requiresConsentCached;
  const hasConsent = profile.parentGuardianConsent === true;

  const { action, reason } = parsed.data;

  let nextStatus: MenteeProfileStatus;
  let auditAction: string;

  switch (action) {
    case "APPROVE_FOR_MATCHING": {
      if (requiresConsent && !hasConsent) {
        return NextResponse.json({ message: "Consent is required before approval" }, { status: 409 });
      }
      nextStatus = MenteeProfileStatus.WAITING;
      auditAction = "MENTEE_INTAKE_APPROVED";
      break;
    }

    case "MARK_MATCHED": {
      if (profile.status !== MenteeProfileStatus.WAITING) {
        return NextResponse.json({ message: "Only waiting mentees can be marked matched" }, { status: 409 });
      }
      if (requiresConsent && !hasConsent) {
        return NextResponse.json({ message: "Consent is required before matching" }, { status: 409 });
      }
      nextStatus = MenteeProfileStatus.MATCHED;
      auditAction = "MENTEE_MARKED_MATCHED";
      break;
    }

    case "ACTIVATE": {
      if (profile.status !== MenteeProfileStatus.MATCHED) {
        return NextResponse.json({ message: "Only matched mentees can be activated" }, { status: 409 });
      }
      if (requiresConsent && !hasConsent) {
        return NextResponse.json({ message: "Consent is required before activation" }, { status: 409 });
      }
      nextStatus = MenteeProfileStatus.ACTIVE;
      auditAction = "MENTEE_ACTIVATED";
      break;
    }

    case "DEACTIVATE": {
      if (profile.status === MenteeProfileStatus.INACTIVE) {
        return NextResponse.json({ message: "Mentee is already inactive" }, { status: 409 });
      }
      nextStatus = MenteeProfileStatus.INACTIVE;
      auditAction = "MENTEE_DEACTIVATED";
      break;
    }

    case "REOPEN_WAITING": {
      if (profile.status !== MenteeProfileStatus.INACTIVE) {
        return NextResponse.json({ message: "Only inactive mentees can be reopened" }, { status: 409 });
      }
      if (requiresConsent && !hasConsent) {
        return NextResponse.json({ message: "Consent is required before reopening" }, { status: 409 });
      }
      nextStatus = MenteeProfileStatus.WAITING;
      auditAction = "MENTEE_REOPENED_WAITING";
      break;
    }

    default: {
      return NextResponse.json({ message: "Unsupported action" }, { status: 400 });
    }
  }

  if (nextStatus === profile.status) {
    return NextResponse.json({ ok: true, item: { id: profile.id, status: profile.status } });
  }

  const requestMeta = getRequestMetadata(request);
  const intakeSnapshot = resolveMenteeIntakeSnapshot({
    status: nextStatus,
    dateOfBirth: profile.user.dateOfBirth,
    parentGuardianConsent: profile.parentGuardianConsent,
  });
  const updated = await prisma.$transaction(async (tx) => {
    const item = await tx.menteeProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        status: nextStatus,
        ...intakeSnapshot,
      },
      select: {
        id: true,
        status: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: auditAction,
        entityType: "mentee_profiles",
        entityId: profile.id,
        oldValues: {
          status: profile.status,
        },
        newValues: {
          status: nextStatus,
          reason: reason?.trim() || null,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return item;
  });

  invalidatePeopleOverviewCache();

  return NextResponse.json({
    ok: true,
    item: updated,
  });
}
