import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";

const maxAttachmentSizeBytes = 5 * 1024 * 1024;
const allowedAttachmentTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromType(mimeType: string) {
  if (mimeType === "image/png") return ".png";
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  return "";
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

  if (!can(actor, "training.manage")) {
    return NextResponse.json({ message: "Only platform admins can upload training question images" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
  }

  const image = formData.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ message: "Question image file is required" }, { status: 400 });
  }

  if (image.size > maxAttachmentSizeBytes) {
    return NextResponse.json({ message: "Question image must be 5MB or smaller" }, { status: 400 });
  }

  if (image.type && !allowedAttachmentTypes.has(image.type)) {
    return NextResponse.json({ message: "Unsupported image type" }, { status: 400 });
  }

  const originalName = sanitizeFileName(image.name || "training-question");
  const ext = path.extname(originalName) || extensionFromType(image.type);
  const storedFileName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "training", "questions");

  await mkdir(uploadDir, { recursive: true });
  const bytes = await image.arrayBuffer();
  await writeFile(path.join(uploadDir, storedFileName), Buffer.from(bytes));

  return NextResponse.json({
    ok: true,
    imageUrl: `/uploads/training/questions/${storedFileName}`,
    imageName: originalName.slice(0, 255),
    imageMime: image.type || undefined,
    imageSize: image.size,
  });
}
