import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { getPlatformBranding, invalidatePlatformBrandingCache } from "@/lib/platform-branding";
import { DEFAULT_PLATFORM_BRANDING } from "@/lib/platform-branding-defaults";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updatePlatformBrandingSchema } from "@/lib/validation";

const PLATFORM_BRANDING_AUDIT_ENTITY_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "platform.branding.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage platform branding" }, { status: 403 });
  }

  const branding = await getPlatformBranding();

  return NextResponse.json({ item: branding });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "platform.branding.manage")) {
    return NextResponse.json({ message: "Only platform admins can manage platform branding" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updatePlatformBrandingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  try {
    const current = await prisma.platformBranding.findUnique({
      where: { id: DEFAULT_PLATFORM_BRANDING.id },
      select: {
        platformName: true,
        logoUrl: true,
        ceoName: true,
        ceoTitle: true,
        ceoWelcomeMessage: true,
      },
    });

    const item = await prisma.platformBranding.upsert({
      where: { id: DEFAULT_PLATFORM_BRANDING.id },
      update: {
        platformName: parsed.data.platformName,
        logoUrl: parsed.data.logoUrl?.trim() || null,
        ceoName: parsed.data.ceoName,
        ceoTitle: parsed.data.ceoTitle,
        ceoWelcomeMessage: parsed.data.ceoWelcomeMessage,
      },
      create: {
        id: DEFAULT_PLATFORM_BRANDING.id,
        platformName: parsed.data.platformName,
        logoUrl: parsed.data.logoUrl?.trim() || null,
        ceoName: parsed.data.ceoName,
        ceoTitle: parsed.data.ceoTitle,
        ceoWelcomeMessage: parsed.data.ceoWelcomeMessage,
      },
      select: {
        id: true,
        platformName: true,
        logoUrl: true,
        ceoName: true,
        ceoTitle: true,
        ceoWelcomeMessage: true,
      },
    });

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "PLATFORM_BRANDING_UPDATED",
        entityType: "platform_branding",
        entityId: PLATFORM_BRANDING_AUDIT_ENTITY_ID,
        oldValues: current
          ? {
              platformName: current.platformName,
              logoUrl: current.logoUrl,
              ceoName: current.ceoName,
              ceoTitle: current.ceoTitle,
              ceoWelcomeMessage: current.ceoWelcomeMessage,
            }
          : Prisma.JsonNull,
        newValues: {
          platformName: item.platformName,
          logoUrl: item.logoUrl,
          ceoName: item.ceoName,
          ceoTitle: item.ceoTitle,
          ceoWelcomeMessage: item.ceoWelcomeMessage,
          brandingId: item.id,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    invalidatePlatformBrandingCache();

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Prisma.PrismaClientKnownRequestError || error instanceof Error
            ? error.message
            : "Could not update platform branding",
      },
      { status: 500 },
    );
  }
}
