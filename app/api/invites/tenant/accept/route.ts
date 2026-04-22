import { hash } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { acceptTenantInviteSchema, buildValidationError } from "@/lib/validation";
import { hashInviteToken } from "@/lib/invite/token";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = acceptTenantInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const tokenHash = hashInviteToken(parsed.data.token);
  const now = new Date();

  try {
    const nextPasswordHash = await hash(parsed.data.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.tenantUserInvite.findFirst({
        where: {
          tokenHash,
          acceptedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        select: {
          id: true,
          userId: true,
          email: true,
        },
      });

      if (!invite) {
        return {
          ok: false as const,
          status: 404,
          message: "Invite is invalid or expired",
        };
      }

      await tx.user.update({
        where: {
          id: invite.userId,
        },
        data: {
          password: nextPasswordHash,
          dateOfBirth: new Date(parsed.data.dateOfBirth),
          isActive: true,
          emailVerifiedAt: now,
        },
      });

      await tx.tenantUserInvite.update({
        where: {
          id: invite.id,
        },
        data: {
          acceptedAt: now,
        },
      });

      const requestMeta = getRequestMetadata(request);
      await tx.auditLog.create({
        data: {
          userId: invite.userId,
          action: "TENANT_INVITE_ACCEPTED",
          entityType: "tenant_user_invites",
          entityId: invite.id,
          oldValues: Prisma.JsonNull,
          newValues: {
            email: invite.email,
            acceptedAt: now.toISOString(),
          },
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        },
      });

      return {
        ok: true as const,
        data: {
          email: invite.email,
        },
      };
    });

    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({ ok: true, item: result.data });
  } catch {
    return NextResponse.json({ message: "Could not complete registration" }, { status: 500 });
  }
}
