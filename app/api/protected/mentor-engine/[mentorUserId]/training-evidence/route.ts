import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { canViewMentor, getActorContext } from "@/lib/actor-context";
import { getMentorSnapshotByUserId } from "@/lib/mentor-engine/service";

const maxAttachmentSizeBytes = 10 * 1024 * 1024;
const allowedAttachmentTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
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
  if (mimeType === "text/plain") return ".txt";
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return "";
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ mentorUserId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { mentorUserId } = await params;
  const snapshot = await getMentorSnapshotByUserId(mentorUserId);
  if (!snapshot) {
    return NextResponse.json({ message: "Mentor not found" }, { status: 404 });
  }

  if (!canViewMentor(actor, snapshot)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
  }

  const evidence = formData.get("evidence");
  if (!(evidence instanceof File) || evidence.size === 0) {
    return NextResponse.json({ message: "Training evidence file is required" }, { status: 400 });
  }

  if (evidence.size > maxAttachmentSizeBytes) {
    return NextResponse.json({ message: "Training evidence must be 10MB or smaller" }, { status: 400 });
  }

  if (evidence.type && !allowedAttachmentTypes.has(evidence.type)) {
    return NextResponse.json({ message: "Unsupported evidence type" }, { status: 400 });
  }

  const originalName = sanitizeFileName(evidence.name || "training-evidence");
  const ext = path.extname(originalName) || extensionFromType(evidence.type);
  const storedFileName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "mentor-compliance", "training");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await evidence.arrayBuffer();
  await writeFile(path.join(uploadDir, storedFileName), Buffer.from(bytes));

  return NextResponse.json({
    ok: true,
    evidenceUrl: `/uploads/mentor-compliance/training/${storedFileName}`,
    evidenceName: originalName.slice(0, 255),
    evidenceMime: evidence.type || undefined,
    evidenceSize: evidence.size,
  });
}
