import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { getMatchingSettings, saveMatchingSettings } from "@/lib/matching-settings";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, matchingSettingsSchema } from "@/lib/validation";

const MATCHING_SETTINGS_AUDIT_ENTITY_ID = "00000000-0000-0000-0000-000000000003";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const actor = await getActorContext(session.user.id);
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!can(actor, "matching.policy.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage matching settings" }, { status: 403 });
  }

  const item = await getMatchingSettings();
  return NextResponse.json({ item });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const actor = await getActorContext(session.user.id);
  if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!can(actor, "matching.policy.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage matching settings" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = matchingSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const current = await getMatchingSettings();
  const item = await saveMatchingSettings(parsed.data);
  const requestMeta = getRequestMetadata(request);

  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "MATCHING_SETTINGS_UPDATED",
      entityType: "matching_settings",
      entityId: MATCHING_SETTINGS_AUDIT_ENTITY_ID,
      oldValues: current as unknown as Prisma.InputJsonValue,
      newValues: item as unknown as Prisma.InputJsonValue,
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return NextResponse.json({ item });
}
