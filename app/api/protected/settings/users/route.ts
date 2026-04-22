import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
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
import { buildValidationError, createTenantUserSchema } from "@/lib/validation";

const inviteTtlDays = 7;

function roleLabel(role: UserRole) {
  return role.replaceAll("_", " ");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "tenant-users.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage root tenant users" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: {
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
      phone: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return NextResponse.json({
    items: users.map((item) => ({
      id: item.id,
      firstName: item.firstName,
      lastName: item.lastName,
      email: item.email,
      phone: item.phone,
      role: item.role,
      isActive: item.isActive,
      lastLoginAt: item.lastLoginAt ? item.lastLoginAt.toISOString() : null,
      createdAt: item.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "tenant-users.manage")) {
    return NextResponse.json({ message: "Only platform admins can add root tenant users" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createTenantUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const inviteToken = createInviteToken();
  const inviteTokenHash = hashInviteToken(inviteToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + inviteTtlDays * 24 * 60 * 60 * 1000);

  const origin = new URL(request.url).origin;
  const inviteLink = `${origin}/accept-invite?token=${encodeURIComponent(inviteToken)}`;

  try {
    const temporaryPasswordHash = await hash(randomBytes(24).toString("hex"), 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          dateOfBirth: new Date("1970-01-01"),
          password: temporaryPasswordHash,
          role: parsed.data.role as UserRole,
          schoolId: null,
          partnerId: null,
          isActive: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      const invite = await tx.tenantUserInvite.create({
        data: {
          userId: user.id,
          email: user.email,
          tokenHash: inviteTokenHash,
          invitedById: actor.id,
          expiresAt,
        },
        select: {
          id: true,
        },
      });

      return {
        user,
        invite,
      };
    });

    let emailResult: { sent: boolean; reason: string | null };
    try {
      emailResult = await sendTenantInviteEmail({
        to: created.user.email,
        fullName: `${created.user.firstName} ${created.user.lastName}`.trim(),
        roleLabel: roleLabel(created.user.role),
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
        action: "TENANT_USER_INVITED",
        entityType: "tenant_user_invites",
        entityId: created.invite.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          userId: created.user.id,
          email: created.user.email,
          role: created.user.role,
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
        id: created.user.id,
      },
      invite: {
        sent: emailResult.sent,
        reason: emailResult.reason,
        link: emailResult.sent ? null : inviteLink,
        expiresAt: expiresAt.toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
      return NextResponse.json(
        { message: "Tenant invite table is missing. Run database migrations and retry." },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { message: error instanceof Error ? `Could not create tenant invite: ${error.message}` : "Could not create tenant invite" },
      { status: 500 },
    );
  }
}
