import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createPartnerSchema, partnerTypeSchema } from "@/lib/validation";

function deriveAgreementStatus(agreement: Prisma.JsonValue | null): "SIGNED" | "MISSING" {
  return agreement ? "SIGNED" : "MISSING";
}

function deriveLifecycleStatus({
  agreementStatus,
  schoolCount,
}: {
  agreementStatus: "SIGNED" | "MISSING";
  schoolCount: number;
}): "ACTIVE" | "SETUP_REQUIRED" {
  return agreementStatus === "SIGNED" && schoolCount > 0 ? "ACTIVE" : "SETUP_REQUIRED";
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (
    actor.role !== UserRole.PLATFORM_ADMIN &&
    actor.role !== UserRole.PARTNER_ADMIN &&
    actor.role !== UserRole.SCHOOL_ADMIN
  ) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.trim() ?? "";
  const typeParam = url.searchParams.get("type")?.trim() ?? "";
  const typeParsed = typeParam ? partnerTypeSchema.safeParse(typeParam) : null;

  if (typeParam && !typeParsed?.success) {
    return NextResponse.json({ message: "Invalid partner type filter" }, { status: 400 });
  }

  const where: Prisma.PartnerWhereInput = {
    ...(actor.role === UserRole.PARTNER_ADMIN && actor.partnerId ? { id: actor.partnerId } : {}),
    ...(actor.role === UserRole.SCHOOL_ADMIN && actor.partnerId ? { id: actor.partnerId } : {}),
    ...(search
      ? {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(typeParsed?.success
      ? {
          type: typeParsed.data,
        }
      : {}),
  };

  const items = await prisma.partner.findMany({
    where,
    select: {
      id: true,
      name: true,
      type: true,
      contactPerson: true,
      contactEmail: true,
      contactPhone: true,
      website: true,
      logoUrl: true,
      partnershipAgreement: true,
      createdAt: true,
      _count: {
        select: {
          schools: true,
          users: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return NextResponse.json({
    items: items.map((item) => {
      const agreementStatus = deriveAgreementStatus(item.partnershipAgreement);
      return {
        id: item.id,
        name: item.name,
        type: item.type,
        contactPerson: item.contactPerson,
        contactEmail: item.contactEmail,
        contactPhone: item.contactPhone,
        website: item.website,
        logoUrl: item.logoUrl,
        agreementStatus,
        lifecycleStatus: deriveLifecycleStatus({
          agreementStatus,
          schoolCount: item._count.schools,
        }),
        createdAt: item.createdAt.toISOString(),
        counts: {
          schools: item._count.schools,
          users: item._count.users,
        },
      };
    }),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || actor.role !== UserRole.PLATFORM_ADMIN) {
    return NextResponse.json({ message: "Only platform admins can create partners" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createPartnerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;

  const existing = await prisma.partner.findFirst({
    where: {
      OR: [{ name: { equals: payload.name, mode: "insensitive" } }, { contactEmail: payload.contactEmail }],
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ message: "Partner with this name or contact email already exists" }, { status: 409 });
  }

  const requestMeta = getRequestMetadata(request);
  const created = await prisma.$transaction(async (tx) => {
    const partner = await tx.partner.create({
      data: {
        name: payload.name,
        type: payload.type,
        contactPerson: payload.contactPerson,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone || null,
        website: payload.website || null,
        logoUrl: payload.logoUrl || null,
        partnershipAgreement: payload.agreementSigned
          ? {
              status: "signed",
              signedAt: new Date().toISOString(),
              signedBy: actor.id,
            }
          : Prisma.JsonNull,
      },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "PARTNER_CREATED",
        entityType: "partners",
        entityId: partner.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          name: partner.name,
          type: partner.type,
          agreementSigned: payload.agreementSigned,
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return partner;
  });

  return NextResponse.json({
    ok: true,
    item: created,
  });
}
