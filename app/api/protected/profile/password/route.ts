import { hash, compare } from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { buildValidationError, profilePasswordUpdateSchema } from "@/lib/validation";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = profilePasswordUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const matches = await compare(parsed.data.currentPassword, user.password);
  if (!matches) {
    return NextResponse.json({ message: "Current password is incorrect" }, { status: 400 });
  }

  const nextPasswordHash = await hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: nextPasswordHash,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Password updated successfully",
  });
}
