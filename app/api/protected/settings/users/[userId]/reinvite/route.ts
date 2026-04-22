import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { sendTenantInviteEmail } from "@/lib/invite/email";
import { createInviteToken, hashInviteToken } from "@/lib/invite/token";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";

const inviteTtlDays = 7;

function roleLabel(role: UserRole) {
  return role.replaceAll("_", " ");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "tenant-users.manage")) {
    return NextResponse.json({ message: "Only platform admins can re-send tenant invites" }, { status: 403 });
  }

  const { userId } = await params;

  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      schoolId: null,
      partnerId: null,
      role: {
        in: [UserRole.PLATFORM_ADMIN, UserRole.PARTNER_ADMIN, UserRole.SCHOOL_ADMIN],
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found in root organization" }, { status: 404 });
  }

  if (user.isActive) {
    return NextResponse.json({ message: "User is already active. Re-invite is not required." }, { status: 409 });
  }

  const inviteToken = createInviteToken();
  const inviteTokenHash = hashInviteToken(inviteToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + inviteTtlDays * 24 * 60 * 60 * 1000);
  const origin = new URL(request.url).origin;
  const inviteLink = `${origin}/accept-invite?token=${encodeURIComponent(inviteToken)}`;

  try {
    const invite = await prisma.$transaction(async (tx) => {
      const existing = await tx.tenantUserInvite.findUnique({
        where: {
          userId: user.id,
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return tx.tenantUserInvite.create({
          data: {
            userId: user.id,
            email: user.email,
            tokenHash: inviteTokenHash,
            invitedById: actor.id,
            invitedAt: now,
            expiresAt,
            acceptedAt: null,
          },
          select: {
            id: true,
          },
        });
      }

      return tx.tenantUserInvite.update({
        where: {
          userId: user.id,
        },
        data: {
          email: user.email,
          tokenHash: inviteTokenHash,
          invitedById: actor.id,
          invitedAt: now,
          expiresAt,
          acceptedAt: null,
        },
        select: {
          id: true,
        },
      });
    });

    let emailResult: { sent: boolean; reason: string | null };
    try {
      emailResult = await sendTenantInviteEmail({
        to: user.email,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        roleLabel: roleLabel(user.role),
        inviteUrl: inviteLink,
        expiresAt,
      });
    } catch (error) {
      emailResult = {
        sent: false,
        reason: error instanceof Error ? error.message : "Email dispatch failed",
      };
    }

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "TENANT_USER_REINVITED",
        entityType: "tenant_user_invites",
        entityId: invite.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          userId: user.id,
          email: user.email,
          role: user.role,
          emailSent: emailResult.sent,
          expiresAt: expiresAt.toISOString(),
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return NextResponse.json({
      ok: true,
      item: {
        id: user.id,
      },
      invite: {
        sent: emailResult.sent,
        reason: emailResult.reason,
        link: emailResult.sent ? null : inviteLink,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { message: "Tenant invite table is missing. Run database migrations and retry." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error ? `Could not re-send tenant invite: ${error.message}` : "Could not re-send tenant invite",
      },
      { status: 500 },
    );
  }
}
