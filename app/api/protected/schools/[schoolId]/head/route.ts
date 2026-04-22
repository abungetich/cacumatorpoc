import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext, isSchoolInActorScope } from "@/lib/actor-context";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, updateSchoolHeadSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ schoolId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!can(actor, "schools.manage")) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { schoolId } = await params;

  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: {
      id: true,
      partnerId: true,
      principalName: true,
      principalEmail: true,
    },
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

  const parsed = updateSchoolHeadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const updated = await prisma.school.update({
    where: { id: school.id },
    data: {
      principalName: parsed.data.principalName,
      principalEmail: parsed.data.principalEmail,
    },
    select: {
      id: true,
      principalName: true,
      principalEmail: true,
    },
  });

  const requestMeta = getRequestMetadata(request);
  await prisma.auditLog.create({
    data: {
      userId: actor.id,
      action: "SCHOOL_HEAD_UPDATED",
      entityType: "schools",
      entityId: school.id,
      oldValues: {
        principalName: school.principalName,
        principalEmail: school.principalEmail,
      },
      newValues: {
        principalName: updated.principalName,
        principalEmail: updated.principalEmail,
      },
      ipAddress: requestMeta.ipAddress,
      userAgent: requestMeta.userAgent,
    },
  });

  return NextResponse.json({
    ok: true,
    item: updated,
  });
}
