import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import sharp from "sharp";
import { authOptions } from "@/lib/auth-options";
import { getActorContext } from "@/lib/actor-context";
import { can } from "@/lib/permissions";

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE = 5 * 1024 * 1024;

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
    return NextResponse.json({ message: "Only platform admins can manage training modules" }, { status: 403 });
  }

  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ message: "Select an image to upload" }, { status: 400 });
  }

  if (!ACCEPTED_TYPES.has(image.type)) {
    return NextResponse.json({ message: "Only PNG, JPG, and WEBP images are allowed" }, { status: 400 });
  }

  if (image.size > MAX_SIZE) {
    return NextResponse.json({ message: "Image must be 5MB or smaller" }, { status: 400 });
  }

  const storedFileName = `${randomUUID()}.png`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "training", "body-images");
  await mkdir(uploadDir, { recursive: true });

  const buffer = await sharp(Buffer.from(await image.arrayBuffer())).png({ quality: 100 }).toBuffer();
  await writeFile(path.join(uploadDir, storedFileName), buffer);

  return NextResponse.json({
    ok: true,
    imageUrl: `/uploads/training/body-images/${storedFileName}`,
  });
}
