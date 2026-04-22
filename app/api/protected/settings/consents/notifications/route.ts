import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { getConsentNotificationSettings, updateConsentNotificationSettings } from "@/lib/consent-notification-settings";
import { can } from "@/lib/permissions";
import { getRequestMetadata } from "@/lib/request-metadata";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  notifyPlatformAdminsOnDecline: z.boolean(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "consents.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage consent notifications" }, { status: 403 });
  }

  const item = await getConsentNotificationSettings();
  return NextResponse.json({ item });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !can(actor, "consents.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage consent notifications" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid notification settings payload" }, { status: 400 });
  }

  const item = await updateConsentNotificationSettings(parsed.data);
  const meta = getRequestMetadata(request);

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "CONSENT_DECLINE_NOTIFICATION_SETTINGS_UPDATED",
      entityType: "consent_notification_settings",
      entityId: "00000000-0000-0000-0000-000000000002",
      oldValues: Prisma.JsonNull,
      newValues: {
        notifyPlatformAdminsOnDecline: item.notifyPlatformAdminsOnDecline,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  return NextResponse.json({ ok: true, item });
}
