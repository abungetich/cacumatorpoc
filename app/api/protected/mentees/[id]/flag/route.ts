import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const menteeProfile = await prisma.menteeProfile.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!menteeProfile) {
    return NextResponse.json({ message: "Mentee not found" }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "MENTEE_FLAGGED",
      entityType: "mentee_profiles",
      entityId: id,
      oldValues: Prisma.JsonNull,
      newValues: {
        flaggedAt: new Date().toISOString(),
      },
      ipAddress: request.headers.get("x-forwarded-for") ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    },
  });

  return NextResponse.json({ ok: true });
}
