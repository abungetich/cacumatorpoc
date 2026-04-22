import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PasswordResetAttemptInput = {
  actorUserId: string;
  targetUserId: string;
  email: string;
  context: "FORGOT_PASSWORD";
  result: {
    sent: boolean;
    reason: string | null;
    channel: "ZEPTO" | "SMTP" | "NONE";
    providerStatusCode: number | null;
    providerMessage: string | null;
    providerPayload: string | null;
  };
  expiresAt: Date | null;
  ipAddress: string;
  userAgent: string;
};

export async function logPasswordResetEmailAttempt(input: PasswordResetAttemptInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.actorUserId,
      action: input.result.sent ? "PASSWORD_RESET_EMAIL_SENT" : "PASSWORD_RESET_EMAIL_FAILED",
      entityType: "users",
      entityId: input.targetUserId,
      oldValues: Prisma.JsonNull,
      newValues: {
        email: input.email,
        context: input.context,
        channel: input.result.channel,
        status: input.result.sent ? "SENT" : "FAILED",
        responseCode: input.result.providerStatusCode,
        providerMessage: input.result.providerMessage,
        providerPayload: input.result.providerPayload,
        reason: input.result.reason,
        expiresAt: input.expiresAt?.toISOString() ?? null,
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
