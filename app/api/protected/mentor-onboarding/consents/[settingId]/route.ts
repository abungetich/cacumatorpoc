import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { buildValidationError, mentorConsentAssentSchema } from "@/lib/validation";
import { getRequestMetadata } from "@/lib/request-metadata";
import { safeSendMentorOnboardingProgressEmail } from "@/lib/mentor-onboarding/email";
import { safeNotifyAdminsOfRequiredConsentDecline } from "@/lib/mentor-consent-decline-notifications";
import { getMentorOnboardingWorkspace } from "@/lib/mentor-onboarding-workspace";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";

export async function POST(request: NextRequest, { params }: { params: Promise<{ settingId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "MENTOR") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = mentorConsentAssentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const { settingId } = await params;
  const setting = await prisma.mentorConsentSetting.findUnique({
    where: { id: settingId },
    select: {
      id: true,
      title: true,
      consentType: true,
      version: true,
      documentBody: true,
      documentUrl: true,
      required: true,
      isActive: true,
    },
  });

  if (!setting || !setting.isActive) {
    return NextResponse.json({ message: "Consent item not found" }, { status: 404 });
  }

  const meta = getRequestMetadata(request);

  await prisma.$transaction(async (tx) => {
    if (parsed.data.action === "ASSENT") {
      const existing = await tx.consent.findFirst({
        where: {
          userId: session.user.id,
          consentType: setting.consentType,
          version: setting.version,
          revokedAt: null,
        },
        select: { id: true },
      });

      if (!existing) {
        await tx.consent.create({
          data: {
            userId: session.user.id,
            consentType: setting.consentType,
            version: setting.version,
            agreedAt: new Date(),
            agreedByIp: meta.ipAddress,
            documentUrl: setting.documentUrl,
            evidenceUrl: parsed.data.evidenceUrl?.trim() || null,
          },
        });
      } else if (parsed.data.evidenceUrl?.trim()) {
        await tx.consent.update({
          where: {
            id: existing.id,
          },
          data: {
            evidenceUrl: parsed.data.evidenceUrl.trim(),
          },
        });
      }
    }

    const auditPayload = JSON.parse(
      JSON.stringify({
        title: setting.title,
        consentType: setting.consentType,
        version: setting.version,
        acknowledgedName: parsed.data.acknowledgedName.trim(),
        action: parsed.data.action,
        confirmed: parsed.data.confirmed,
        reachedEnd: parsed.data.reachedEnd,
        documentUrl: setting.documentUrl,
        evidenceUrl: parsed.data.action === "ASSENT" ? parsed.data.evidenceUrl?.trim() || null : null,
        reason: parsed.data.action === "DECLINE" ? parsed.data.reason?.trim() || null : null,
      }),
    ) as Prisma.InputJsonValue;

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: parsed.data.action === "ASSENT" ? "MENTOR_CONSENT_SELF_ASSENTED" : "MENTOR_CONSENT_DECLINED",
        entityType: "mentor_consent_settings",
        entityId: setting.id,
        oldValues: Prisma.JsonNull,
        newValues: auditPayload,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    await syncMentorOnboarding(session.user.id, tx);
  });

  if (parsed.data.action === "ASSENT") {
    void safeSendMentorOnboardingProgressEmail({
      userId: session.user.id,
      achievedStep: setting.consentType === "SAFEGUARDING" ? "Safeguarding assent completed" : "Consent document completed",
      detail: setting.title,
    });
  } else if (setting.required) {
    void safeNotifyAdminsOfRequiredConsentDecline({
      mentorUserId: session.user.id,
      title: setting.title,
      version: setting.version,
      consentType: setting.consentType,
      acknowledgedName: parsed.data.acknowledgedName.trim(),
      reason: parsed.data.reason?.trim() || null,
    });
  }

  invalidatePeopleOverviewCache();

  const item = await getMentorOnboardingWorkspace(session.user.id);
  return NextResponse.json({ ok: true, item });
}
