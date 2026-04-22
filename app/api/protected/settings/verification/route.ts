import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { verificationSettingsSchema, verificationTestEmailSchema } from "@/lib/validation";
import { getVerificationEmailConfigStatus, sendVerificationTestEmail } from "@/lib/verification/email";
import { getVerificationSettings, saveVerificationSettings } from "@/lib/verification/settings";

const VERIFICATION_SETTINGS_AUDIT_ENTITY_ID = "00000000-0000-0000-0000-000000000002";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "verification.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage verification settings" }, { status: 403 });
  }

  const item = await getVerificationSettings();
  return NextResponse.json({
    item: {
      id: item.id,
      autoReminderEnabled: item.autoReminderEnabled,
      resendIntervalHours: item.resendIntervalHours,
      maxReminders: item.maxReminders,
      delivery: getVerificationEmailConfigStatus(),
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!can(actor, "verification.manage")) {
      return NextResponse.json({ message: "Only platform admins can manage verification settings" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = verificationSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid verification settings" }, { status: 400 });
    }

    const current = await getVerificationSettings();
    const item = await saveVerificationSettings(parsed.data);

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "VERIFICATION_SETTINGS_UPDATED",
        entityType: "verification_settings",
        entityId: VERIFICATION_SETTINGS_AUDIT_ENTITY_ID,
        oldValues: {
          autoReminderEnabled: current.autoReminderEnabled,
          resendIntervalHours: current.resendIntervalHours,
          maxReminders: current.maxReminders,
        },
        newValues: {
          autoReminderEnabled: item.autoReminderEnabled,
          resendIntervalHours: item.resendIntervalHours,
          maxReminders: item.maxReminders,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return NextResponse.json({
      item: {
        id: item.id,
        autoReminderEnabled: item.autoReminderEnabled,
        resendIntervalHours: item.resendIntervalHours,
        maxReminders: item.maxReminders,
        delivery: getVerificationEmailConfigStatus(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update verification settings";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const actor = await getActorContext(session.user.id);
    if (!actor) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!can(actor, "verification.manage")) {
      return NextResponse.json({ message: "Only platform admins can manage verification settings" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }

    const parsed = verificationTestEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Invalid email address" }, { status: 400 });
    }

    const result = await sendVerificationTestEmail({
      to: parsed.data.email,
      fullName: "Platform Admin",
    });

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: result.sent ? "VERIFICATION_TEST_EMAIL_SENT" : "VERIFICATION_TEST_EMAIL_FAILED",
        entityType: "verification_settings",
        entityId: VERIFICATION_SETTINGS_AUDIT_ENTITY_ID,
        oldValues: Prisma.JsonNull,
        newValues: {
          email: parsed.data.email,
          channel: result.channel,
          responseCode: result.providerStatusCode,
          providerMessage: result.providerMessage,
          providerPayload: result.providerPayload,
          reason: result.reason,
          status: result.sent ? "SENT" : "FAILED",
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    if (!result.sent) {
      return NextResponse.json(
        {
          message: result.reason ?? "Could not send test email",
          result,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Test email sent",
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send test email";
    return NextResponse.json({ message }, { status: 500 });
  }
}
