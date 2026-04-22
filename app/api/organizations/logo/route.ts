import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const maxUploadBytes = 5 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function extensionFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/webp") return ".webp";
  return "";
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid multipart payload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "File is required" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > maxUploadBytes) {
    return NextResponse.json({ message: "Image must be between 1 byte and 5MB" }, { status: 400 });
  }

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json({ message: "Only PNG, JPG, and WEBP are allowed" }, { status: 400 });
  }

  const ext = extensionFromMime(file.type);
  const storedName = `${randomUUID()}${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "organizations");
  await mkdir(uploadDir, { recursive: true });

  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadDir, storedName), Buffer.from(bytes));

  const logoUrl = `/uploads/organizations/${storedName}`;

  return NextResponse.json({
    ok: true,
    logoUrl,
  });
}
