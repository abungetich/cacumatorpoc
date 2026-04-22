import { hash } from "bcryptjs";
import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createSchoolAdminSchema } from "@/lib/validation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "schools.onboard")) {
    return NextResponse.json({ message: "Only platform or partner admins can add school admins" }, { status: 403 });
  }

  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { id: true, partnerId: true },
  });
  if (!school) {
    return NextResponse.json({ message: "School not found" }, { status: 404 });
  }

  if (!isSchoolInActorScope(actor, school)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createSchoolAdminSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  try {
    const passwordHash = await hash(parsed.data.password, 12);

    const admin = await prisma.user.create({
      data: {
        email: parsed.data.email,
        password: passwordHash,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        phone: parsed.data.phone,
        dateOfBirth: new Date(parsed.data.dateOfBirth),
        role: UserRole.SCHOOL_ADMIN,
        schoolId: school.id,
        partnerId: school.partnerId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const requestMeta = getRequestMetadata(request);
    await prisma.auditLog.create({
      data: {
        userId: actor.id,
        action: "SCHOOL_ADMIN_ADDED",
        entityType: "users",
        entityId: admin.id,
        oldValues: Prisma.JsonNull,
        newValues: {
          schoolId: school.id,
          email: admin.email,
          role: "SCHOOL_ADMIN",
        },
        ipAddress: requestMeta.ipAddress,
        userAgent: requestMeta.userAgent,
      },
    });

    return NextResponse.json({
      ok: true,
      item: admin,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    return NextResponse.json({ message: "Could not create school admin" }, { status: 500 });
  }
}
