import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { getRequestMetadata } from "@/lib/request-metadata";
import { safeSendMentorOnboardingProgressEmail } from "@/lib/mentor-onboarding/email";
import { getMentorOnboardingWorkspace } from "@/lib/mentor-onboarding-workspace";
import { syncMentorOnboarding } from "@/lib/mentor-onboarding";
import { invalidatePeopleOverviewCache } from "@/lib/people-intake";

const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const allowedAttachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromType(mimeType: string) {
  if (mimeType === "application/pdf") return ".pdf";
  if (mimeType === "application/msword") return ".doc";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return ".docx";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return "";
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "INVALID" : parsed;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "MENTOR") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
  }

  const evidence = formData.get("evidence");
  if (!(evidence instanceof File) || evidence.size === 0) {
    return NextResponse.json({ message: "Background check document is required" }, { status: 400 });
  }

  if (evidence.size > maxAttachmentSizeBytes) {
    return NextResponse.json({ message: "Background check document must be 10MB or smaller" }, { status: 400 });
  }

  if (evidence.type && !allowedAttachmentTypes.has(evidence.type)) {
    return NextResponse.json({ message: "Unsupported background check document type" }, { status: 400 });
  }

  const checkedOn = parseOptionalDate(formData.get("checkedOn"));
  const expiresAt = parseOptionalDate(formData.get("expiresAt"));

  if (checkedOn === "INVALID" || expiresAt === "INVALID") {
    return NextResponse.json({ message: "Use valid background check dates" }, { status: 400 });
  }

  const originalName = sanitizeFileName(evidence.name || "background-check");
  const ext = path.extname(originalName) || extensionFromType(evidence.type);
  const storedFileName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "mentor-compliance", "background-checks");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await evidence.arrayBuffer();
  const evidenceUrl = `/uploads/mentor-compliance/background-checks/${storedFileName}`;
  await writeFile(path.join(uploadDir, storedFileName), Buffer.from(bytes));

  const meta = getRequestMetadata(request);

  await prisma.$transaction(async (tx) => {
    await tx.mentorProfile.update({
      where: {
        userId: session.user.id,
      },
      data: {
        backgroundCheckStatus: "PENDING",
        backgroundCheckDocument: evidenceUrl,
        backgroundCheckDate: checkedOn instanceof Date ? checkedOn : new Date(),
        backgroundCheckExpiry: expiresAt instanceof Date ? expiresAt : null,
      },
    });

    await syncMentorOnboarding(session.user.id, tx);

    const mentorProfile = await tx.mentorProfile.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

    if (mentorProfile) {
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: "MENTOR_BACKGROUND_CHECK_SUBMITTED",
          entityType: "mentor_profiles",
          entityId: mentorProfile.id,
          oldValues: Prisma.JsonNull,
          newValues: {
            evidenceUrl,
            checkedOn: checkedOn instanceof Date ? checkedOn.toISOString() : null,
            expiresAt: expiresAt instanceof Date ? expiresAt.toISOString() : null,
            fileName: originalName,
          },
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
      });
    }
  });

  void safeSendMentorOnboardingProgressEmail({
    userId: session.user.id,
    achievedStep: "Background check submitted",
    detail: "Your document is on file and waiting for admin review.",
  });

  invalidatePeopleOverviewCache();

  const item = await getMentorOnboardingWorkspace(session.user.id);
  return NextResponse.json({ ok: true, item });
}
