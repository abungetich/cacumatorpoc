import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { issuePasswordResetToken } from "@/lib/password-reset";
import { logPasswordResetEmailAttempt } from "@/lib/password-reset-attempts";
import { sendPasswordResetEmail } from "@/lib/verification/email";
import { buildValidationError, forgotPasswordRequestSchema } from "@/lib/validation";

const GENERIC_MESSAGE = "If an account exists for that email, a password reset link has been sent.";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = forgotPasswordRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  if (!user || user.role === UserRole.GUARDIAN) {
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  try {
    const { resetUrl, expiresAt } = await issuePasswordResetToken({
      tx: prisma,
      userId: user.id,
      email: user.email,
      origin: new URL(request.url).origin,
    });

    const result = await sendPasswordResetEmail({
      to: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      resetUrl,
      expiresAt,
    });

    await logPasswordResetEmailAttempt({
      actorUserId: user.id,
      targetUserId: user.id,
      email: user.email,
      context: "FORGOT_PASSWORD",
      result,
      expiresAt,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
  } catch (error) {
    await logPasswordResetEmailAttempt({
      actorUserId: user.id,
      targetUserId: user.id,
      email: user.email,
      context: "FORGOT_PASSWORD",
      result: {
        sent: false,
        reason: error instanceof Error ? error.message : "Could not send password reset email",
        channel: "NONE",
        providerStatusCode: null,
        providerMessage: null,
        providerPayload: null,
      },
      expiresAt: null,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
    return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  }

  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
