import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { buildValidationError, passwordResetSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = passwordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!resetToken) {
    return NextResponse.json({ message: "Reset link is invalid" }, { status: 404 });
  }

  if (resetToken.usedAt) {
    return NextResponse.json({ message: "Reset link has already been used" }, { status: 409 });
  }

  if (resetToken.expiresAt < now) {
    return NextResponse.json({ message: "Reset link has expired" }, { status: 410 });
  }

  const passwordHash = await hash(parsed.data.password, 12);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: resetToken.userId },
      data: {
        password: passwordHash,
      },
    });

    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: resetToken.userId,
        usedAt: null,
        id: { not: resetToken.id },
      },
      data: { usedAt: now },
    });
  });

  return NextResponse.json({
    ok: true,
    message: "Password updated. You can now sign in with your new password.",
  });
}
