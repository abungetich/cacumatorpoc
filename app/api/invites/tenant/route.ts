import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashInviteToken } from "@/lib/invite/token";
import { buildValidationError, tenantInviteTokenSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  const parsed = tenantInviteTokenSchema.safeParse({ token });
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const tokenHash = hashInviteToken(parsed.data.token);
  const now = new Date();

  const invite = await prisma.tenantUserInvite.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    select: {
      id: true,
      email: true,
      expiresAt: true,
      user: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  if (!invite) {
    return NextResponse.json({ message: "Invite is invalid or expired" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      email: invite.email,
      firstName: invite.user.firstName,
      lastName: invite.user.lastName,
      role: invite.user.role,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}
