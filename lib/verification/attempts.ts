import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type VerificationAttemptInput = {
  actorUserId: string;
  mentorProfileId: string;
  email: string;
  context: "REGISTRATION" | "PUBLIC_RESEND" | "ADMIN_RESEND";
  result: {
    sent: boolean;
    reason: string | null;
    channel: "ZEPTO" | "SMTP" | "NONE";
    providerStatusCode: number | null;
    providerMessage: string | null;
    providerPayload: string | null;
  };
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
};

export async function logVerificationEmailAttempt(input: VerificationAttemptInput) {
  await prisma.auditLog.create({
    data: {
      userId: input.actorUserId,
      action: input.result.sent ? "MENTOR_VERIFICATION_EMAIL_SENT" : "MENTOR_VERIFICATION_EMAIL_FAILED",
      entityType: "mentor_profiles",
      entityId: input.mentorProfileId,
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
        expiresAt: input.expiresAt.toISOString(),
      },
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
