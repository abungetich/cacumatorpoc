import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canViewMentor, getActorContext } from "@/lib/actor-context";
import { getMentorDetailView, getMentorSnapshotByUserId } from "@/lib/mentor-engine/service";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { prepareMentorTransition } from "@/lib/mentor-engine/transitions";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, mentorTransitionSchema } from "@/lib/validation";

export async function GET(_: NextRequest, { params }: { params: Promise<{ mentorUserId: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { mentorUserId } = await params;

    const view = await getMentorDetailView(mentorUserId);
    if (!view) {
      return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
    }

    if (!canViewMentor(actor, view.snapshot)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      item: view,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load mentor detail";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ mentorUserId: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = mentorTransitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
    }

    const { mentorUserId } = await params;
    const { action, reason, details } = parsed.data;
    const snapshot = await getMentorSnapshotByUserId(mentorUserId);

    if (!snapshot) {
      return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
    }

    if (!canViewMentor(actor, snapshot)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const decision = prepareMentorTransition({
      snapshot,
      action,
      actorRole: actor.role,
      actorId: actor.id,
      isSelfAction: actor.id === mentorUserId,
      reason,
      details,
    });

    if (!decision.ok) {
      return NextResponse.json({ message: decision.message }, { status: decision.status });
    }

    const requestMeta = getRequestMetadata(request);

    await prisma.$transaction(async (tx) => {
      await tx.mentorProfile.update({
        where: {
          id: snapshot.profileId,
        },
        data: decision.mentorProfileData,
      });

      if (decision.userData) {
        await tx.user.update({
          where: {
            id: snapshot.userId,
          },
          data: decision.userData,
        });
      }

      await syncMentorOnboarding(snapshot.userId, tx);

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: decision.auditAction,
          entityType: "mentor_profiles",
          entityId: snapshot.profileId,
          oldValues: {
            profileStatus: snapshot.profileStatus,
            backgroundCheckStatus: snapshot.backgroundCheckStatus,
            trainingCompleted: snapshot.trainingCompleted,
            safeguardingAgreed: snapshot.safeguardingAgreed,
            derivedState: snapshot.derivedState,
          },
          newValues: {
            action,
            comment: decision.auditData?.comment ?? reason?.trim() ?? null,
            details: decision.auditData?.details ?? details ?? null,
            transitionedAt: new Date().toISOString(),
            actorRole: actor.role,
          },
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        },
      });
    });

    const next = await getMentorDetailView(mentorUserId);
    if (!next) {
      return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
    }

    invalidatePeopleOverviewCache();

    return NextResponse.json({
      ok: true,
      item: next,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update mentor detail";
    return NextResponse.json({ message }, { status: 500 });
  }
}
