import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { uploadGrantTaskEvidence } from "@/lib/grants/service";
import { getRequestMetadata } from "@/lib/request-metadata";

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

async function saveTaskEvidence(file: File) {
  if (file.size > maxAttachmentSizeBytes) {
    throw new Error("Evidence must be 10MB or smaller");
  }

  if (file.type && !allowedAttachmentTypes.has(file.type)) {
    throw new Error("Unsupported evidence type");
  }

  const originalName = sanitizeFileName(file.name || "evidence");
  const ext = path.extname(originalName) || extensionFromType(file.type);
  const storedFileName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "grants", "task-evidence");

  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedFileName), Buffer.from(bytes));

  return {
    evidenceUrl: `/uploads/grants/task-evidence/${storedFileName}`,
    evidenceName: originalName.slice(0, 255),
    evidenceMime: file.type || undefined,
    evidenceSize: file.size,
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
  }

  const evidence = formData.get("evidence");
  if (!(evidence instanceof File) || evidence.size === 0) {
    return NextResponse.json({ message: "Evidence file is required" }, { status: 400 });
  }

  let saved:
    | {
        evidenceUrl: string;
        evidenceName: string;
        evidenceMime?: string;
        evidenceSize: number;
      }
    | undefined;
  try {
    saved = await saveTaskEvidence(evidence);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not save evidence" },
      { status: 400 },
    );
  }

  const result = await uploadGrantTaskEvidence({
    actor,
    taskId,
    evidenceUrl: saved.evidenceUrl,
    evidenceName: saved.evidenceName,
    evidenceMime: saved.evidenceMime,
    evidenceSize: saved.evidenceSize,
    requestMeta: getRequestMetadata(request),
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message, details: result.details }, { status: result.status });
  }

  return NextResponse.json({
    ok: true,
    item: result.data,
  });
}
