import { hash } from "bcryptjs";
import { Prisma, SchoolType, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canOnboardSchool, getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, schoolOnboardingSchema } from "@/lib/validation";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor || !canOnboardSchool(actor.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = schoolOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const payload = parsed.data;
  const requestMeta = getRequestMetadata(request);

  const resolvedPartnerId =
    actor.role === UserRole.PARTNER_ADMIN ? actor.partnerId : payload.partnerId || null;

  if (!can(actor, "schools.onboard")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (actor.role === UserRole.PARTNER_ADMIN && !resolvedPartnerId) {
    return NextResponse.json({ message: "Partner admin account is missing partner scope" }, { status: 403 });
  }

  if (resolvedPartnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: resolvedPartnerId },
      select: { id: true },
    });
    if (!partner) {
      return NextResponse.json({ message: "Selected partner was not found" }, { status: 400 });
    }
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          partnerId: resolvedPartnerId,
          name: payload.name,
          type: payload.type as SchoolType,
          address: payload.address,
          phone: payload.phone,
          email: payload.email,
          principalName: payload.principalName,
          principalEmail: payload.principalEmail,
          studentPopulation: payload.studentPopulation,
          accreditationStatus: payload.accreditationStatus || null,
        },
        select: {
          id: true,
          name: true,
          type: true,
          partnerId: true,
        },
      });

      let adminAccount:
        | {
            id: string;
            email: string;
          }
        | undefined;

      if (payload.schoolAdmin.create) {
        const passwordHash = await hash(payload.schoolAdmin.password!, 12);
        const admin = await tx.user.create({
          data: {
            email: payload.schoolAdmin.email!,
            password: passwordHash,
            firstName: payload.schoolAdmin.firstName!,
            lastName: payload.schoolAdmin.lastName!,
            phone: payload.schoolAdmin.phone!,
            dateOfBirth: new Date(payload.schoolAdmin.dateOfBirth!),
            role: UserRole.SCHOOL_ADMIN,
            schoolId: school.id,
            partnerId: resolvedPartnerId,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
          },
        });
        adminAccount = admin;
      }

      await tx.auditLog.create({
        data: {
          userId: actor.id,
          action: "SCHOOL_ONBOARDED",
          entityType: "schools",
          entityId: school.id,
          oldValues: Prisma.JsonNull,
          newValues: {
            name: school.name,
            type: school.type,
            partnerId: school.partnerId,
            adminProvisioned: Boolean(adminAccount),
            adminEmail: adminAccount?.email ?? null,
          },
          ipAddress: requestMeta.ipAddress,
          userAgent: requestMeta.userAgent,
        },
      });

      return { school, adminAccount };
    });

    return NextResponse.json({
      ok: true,
      school: result.school,
      adminAccount: result.adminAccount,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Duplicate email or school unique constraint conflict" },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: "Could not onboard school" }, { status: 500 });
  }
}
