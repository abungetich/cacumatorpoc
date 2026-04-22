import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashEmailVerificationToken } from "@/lib/verification/token";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
  }

  const token = typeof body === "object" && body && "token" in body ? String((body as { token?: unknown }).token ?? "").trim() : "";
  if (!token) {
    return NextResponse.json({ message: "Verification token is required" }, { status: 400 });
  }

  const tokenHash = hashEmailVerificationToken(token);
  const now = new Date();

  const verification = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
        },
      },
    },
  });

  if (!verification) {
    return NextResponse.json({ message: "Verification link is invalid" }, { status: 404 });
  }

  if (verification.verifiedAt) {
    return NextResponse.json({
      ok: true,
      email: verification.email,
      alreadyVerified: true,
      message: "Email already confirmed. You can sign in and complete your profile.",
    });
  }

  if (verification.expiresAt < now) {
    return NextResponse.json({ message: "Verification link has expired" }, { status: 410 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: verification.id },
      data: { verifiedAt: now },
    });

    await tx.user.update({
      where: { id: verification.userId },
      data: {
        emailVerifiedAt: now,
        isActive: true,
      },
    });
  });

  return NextResponse.json({
    ok: true,
    email: verification.email,
    message: "Email confirmed. Sign in to complete your profile.",
  });
}
