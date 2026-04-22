import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { getConsentNotificationSettings } from "@/lib/consent-notification-settings";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildValidationError, mentorConsentSettingSchema } from "@/lib/validation";
import { getRequestMetadata } from "@/lib/request-metadata";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "consents.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage mentor consent packs" }, { status: 403 });
  }

  const [items, notifications] = await Promise.all([
    prisma.mentorConsentSetting.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    }),
    getConsentNotificationSettings(),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    notifications: {
      notifyPlatformAdminsOnDecline: notifications.notifyPlatformAdminsOnDecline,
    },
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

  if (!can(actor, "consents.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage mentor consent packs" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = mentorConsentSettingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const item = await prisma.mentorConsentSetting.create({
    data: {
      title: parsed.data.title.trim(),
      consentType: parsed.data.consentType,
      version: parsed.data.version.trim(),
      summary: parsed.data.summary.trim(),
      documentBody: parsed.data.documentBody.trim(),
      documentUrl: parsed.data.documentUrl.trim(),
      required: parsed.data.required,
      sortOrder: parsed.data.sortOrder,
      isActive: parsed.data.isActive,
    },
  });

  const meta = getRequestMetadata(request);
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "MENTOR_CONSENT_SETTING_CREATED",
      entityType: "mentor_consent_settings",
      entityId: item.id,
      oldValues: Prisma.JsonNull,
      newValues: {
        title: item.title,
        version: item.version,
        consentType: item.consentType,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  });

  return NextResponse.json({
    ok: true,
    item: {
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    },
  });
}
