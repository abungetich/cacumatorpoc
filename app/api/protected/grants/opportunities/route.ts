import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { GrantOpportunityStatus, GrantSourceType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { createGrantOpportunity } from "@/lib/grants/service";
import { getRequestMetadata } from "@/lib/request-metadata";
import { buildValidationError, createGrantOpportunitySchema } from "@/lib/validation";

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

function optionalString(entry: FormDataEntryValue | null | undefined) {
  if (typeof entry !== "string") {
    return undefined;
  }
  const trimmed = entry.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function optionalInt(entry: FormDataEntryValue | null | undefined) {
  const value = optionalString(entry);
  if (!value) {
    return undefined;
  }
  return Number(value);
}

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

async function saveGrantAttachment(file: File) {
  if (file.size > maxAttachmentSizeBytes) {
    throw new Error("Attachment must be 10MB or smaller");
  }

  if (file.type && !allowedAttachmentTypes.has(file.type)) {
    throw new Error("Unsupported attachment type");
  }

  const originalName = sanitizeFileName(file.name || "attachment");
  const ext = path.extname(originalName) || extensionFromType(file.type);
  const storedFileName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "grants");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedFileName), Buffer.from(bytes));

  return {
    attachmentUrl: `/uploads/grants/${storedFileName}`,
    attachmentName: originalName.slice(0, 255),
    attachmentMime: file.type || undefined,
    attachmentSize: file.size,
  };
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await getActorContext(session.user.id);
  if (!actor) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let body: unknown;
  let attachmentPayload:
    | {
        attachmentUrl: string;
        attachmentName: string;
        attachmentMime?: string;
        attachmentSize: number;
      }
    | undefined;

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
    }

    const attachment = formData.get("attachment");
    if (attachment instanceof File && attachment.size > 0) {
      try {
        attachmentPayload = await saveGrantAttachment(attachment);
      } catch (error) {
        return NextResponse.json(
          { message: error instanceof Error ? error.message : "Could not save attachment" },
          { status: 400 },
        );
      }
    }

    body = {
      title: String(formData.get("title") ?? ""),
      funderName: String(formData.get("funderName") ?? ""),
      description: optionalString(formData.get("description")),
      sourceType: optionalString(formData.get("sourceType")),
      sourceReference: optionalString(formData.get("sourceReference")),
      sourceUrl: optionalString(formData.get("sourceUrl")),
      deadline: String(formData.get("deadline") ?? ""),
      status: optionalString(formData.get("status")),
      fitScore: optionalInt(formData.get("fitScore")),
      country: optionalString(formData.get("country")),
      currencyCode: String(formData.get("currencyCode") ?? ""),
      amountMinor: String(formData.get("amountMinor") ?? ""),
      schoolId: optionalString(formData.get("schoolId")),
      partnerId: optionalString(formData.get("partnerId")),
    };
  } else {
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON payload" }, { status: 400 });
    }
  }

  const parsed = createGrantOpportunitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(buildValidationError(parsed.error), { status: 400 });
  }

  const result = await createGrantOpportunity({
    actor,
    title: parsed.data.title,
    funderName: parsed.data.funderName,
    description: parsed.data.description,
    sourceType: parsed.data.sourceType as GrantSourceType | undefined,
    sourceReference: parsed.data.sourceReference,
    sourceUrl: parsed.data.sourceUrl,
    attachmentUrl: attachmentPayload?.attachmentUrl,
    attachmentName: attachmentPayload?.attachmentName,
    attachmentMime: attachmentPayload?.attachmentMime,
    attachmentSize: attachmentPayload?.attachmentSize,
    deadline: parsed.data.deadline,
    status: parsed.data.status as GrantOpportunityStatus | undefined,
    fitScore: parsed.data.fitScore,
    country: parsed.data.country,
    currencyCode: parsed.data.currencyCode,
    amountMinor: parsed.data.amountMinor,
    schoolId: parsed.data.schoolId,
    partnerId: parsed.data.partnerId,
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
