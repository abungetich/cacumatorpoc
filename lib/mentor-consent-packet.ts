import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ConsentType, UserRole } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { getPlatformBranding } from "@/lib/platform-branding";
import { renderRichDocumentHtml } from "@/lib/rich-documents";

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "Not recorded";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatConsentType(type: ConsentType) {
  return type.replaceAll("_", " ");
}

function wrapText(text: string, maxWidth: number, fontSize: number, font: { widthOfTextAtSize: (text: string, size: number) => number }) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
    }
    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function richHtmlToPdfLines(html: string) {
  return html
    .replace(/<\/(p|div|h1|h2|h3|h4|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<\/(ul|ol)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function richHtmlToPdfBlocks(html: string) {
  const blocks: Array<{ type: "text"; html: string } | { type: "image"; src: string }> = [];
  const regex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const before = html.slice(lastIndex, match.index);
    if (before.trim()) {
      blocks.push({ type: "text", html: before });
    }
    if (match[1]) {
      blocks.push({ type: "image", src: match[1] });
    }
    lastIndex = regex.lastIndex;
  }

  const trailing = html.slice(lastIndex);
  if (trailing.trim()) {
    blocks.push({ type: "text", html: trailing });
  }

  return blocks;
}

export async function buildMentorConsentPacket(userId: string, settingId: string) {
  const [branding, user, setting] = await Promise.all([
    getPlatformBranding(),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    }),
    prisma.mentorConsentSetting.findUnique({
      where: { id: settingId },
      select: {
        id: true,
        title: true,
        summary: true,
        consentType: true,
        version: true,
        documentBody: true,
        documentUrl: true,
        required: true,
      },
    }),
  ]);

  if (!user || user.role !== UserRole.MENTOR || !setting) {
    return null;
  }

  const consent = await prisma.consent.findFirst({
    where: {
      userId,
      consentType: setting.consentType,
      version: setting.version,
      revokedAt: null,
    },
    select: {
      id: true,
      agreedAt: true,
      documentUrl: true,
      evidenceUrl: true,
    },
  });

  if (!consent) {
    return null;
  }

  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      userId,
      action: "MENTOR_CONSENT_SELF_ASSENTED",
      entityType: "mentor_consent_settings",
      entityId: setting.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      newValues: true,
    },
  });

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
  const verificationUrl = `${getAppBaseUrl()}/verify/consents/${consent.id}`;
  const payload = (auditEntry?.newValues ?? {}) as Record<string, unknown>;
  const acknowledgedName = typeof payload.acknowledgedName === "string" ? payload.acknowledgedName : fullName;

  const renderedHtml = renderRichDocumentHtml(setting.documentBody, {
    "{{mentor_name}}": fullName,
    "{{mentor_email}}": user.email,
    "{{signed_date}}": formatDateTime(consent.agreedAt),
    "{{platform_name}}": branding.platformName,
    "{{document_version}}": setting.version,
  });

  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  let page = pdf.addPage([595.28, 841.89]);
  let cursorY = 790;
  const marginX = 48;
  const contentWidth = 500;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight > 48) return;
    page = pdf.addPage([595.28, 841.89]);
    cursorY = 790;
  };

  const drawLine = (text: string, options?: { size?: number; font?: typeof regularFont; color?: ReturnType<typeof rgb>; leading?: number }) => {
    const size = options?.size ?? 11;
    const font = options?.font ?? regularFont;
    const color = options?.color ?? rgb(0.16, 0.13, 0.24);
    const leading = options?.leading ?? 15;
    const lines = wrapText(text, contentWidth, size, font);
    ensureSpace(lines.length * leading + 4);
    for (const line of lines) {
      page.drawText(line, { x: marginX, y: cursorY, size, font, color });
      cursorY -= leading;
    }
  };

  const drawSpacer = (height = 10) => {
    cursorY -= height;
  };

  const drawSectionTitle = (text: string) => {
    drawSpacer(4);
    drawLine(text, { size: 16, font: boldFont, color: rgb(0.33, 0.13, 0.53), leading: 20 });
    drawSpacer(2);
  };

  const drawImageBlock = async (src: string) => {
    if (!src.startsWith("/")) {
      drawLine(`[Image omitted in PDF export: ${src}]`, { size: 9, color: rgb(0.45, 0.45, 0.5), leading: 12 });
      return;
    }

    const absolutePath = path.join(process.cwd(), "public", src.replace(/^\//, ""));
    try {
      const imageBytes = await readFile(absolutePath);
      const lowerSrc = src.toLowerCase();
      const image = lowerSrc.endsWith(".png") ? await pdf.embedPng(imageBytes) : lowerSrc.endsWith(".jpg") || lowerSrc.endsWith(".jpeg") ? await pdf.embedJpg(imageBytes) : null;

      if (!image) {
        drawLine(`[Image omitted in PDF export: unsupported format]`, { size: 9, color: rgb(0.45, 0.45, 0.5), leading: 12 });
        return;
      }

      const maxWidth = contentWidth;
      const maxHeight = 220;
      const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      ensureSpace(height + 20);
      page.drawImage(image, {
        x: marginX,
        y: cursorY - height,
        width,
        height,
      });
      cursorY -= height + 12;
    } catch {
      drawLine(`[Image omitted in PDF export: could not load source]`, { size: 9, color: rgb(0.45, 0.45, 0.5), leading: 12 });
    }
  };

  page.drawRectangle({
    x: 0,
    y: 761,
    width: 595.28,
    height: 80,
    color: rgb(0.33, 0.13, 0.53),
  });
  page.drawText(branding.platformName, {
    x: marginX,
    y: 807,
    size: 20,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  page.drawText("Signed mentor consent record", {
    x: marginX,
    y: 783,
    size: 11,
    font: regularFont,
    color: rgb(0.96, 0.93, 0.98),
  });

  cursorY = 732;
  drawLine(`Document: ${setting.title}`, { size: 13, font: boldFont });
  drawLine(`Mentor: ${fullName}`);
  drawLine(`Email: ${user.email}`);
  drawLine(`Type: ${formatConsentType(setting.consentType)}  |  Version: ${setting.version}`);
  drawLine(`Signed on: ${formatDateTime(consent.agreedAt)}`);
  drawLine(`Acknowledged as: ${acknowledgedName}`);

  drawSectionTitle("Summary");
  drawLine(setting.summary, { size: 10, color: rgb(0.35, 0.35, 0.42), leading: 13 });

  drawSectionTitle("Rendered document");
  for (const block of richHtmlToPdfBlocks(renderedHtml)) {
    if (block.type === "image") {
      await drawImageBlock(block.src);
      continue;
    }

    for (const line of richHtmlToPdfLines(block.html)) {
      drawLine(line, { size: 10, leading: 13 });
    }
  }

  drawSectionTitle("Signature record");
  drawLine(`Typed signature: ${acknowledgedName}`, { size: 11, font: boldFont });
  drawLine(`Recorded at: ${formatDateTime(auditEntry?.createdAt ?? consent.agreedAt)}`, { size: 10 });
  if (setting.documentUrl || consent.documentUrl) {
    drawLine(`Source document: ${consent.documentUrl ?? setting.documentUrl}`, { size: 9, color: rgb(0.18, 0.3, 0.58), leading: 12 });
  }
  drawLine(`Public verification: ${verificationUrl}`, { size: 9, color: rgb(0.18, 0.3, 0.58), leading: 12 });
  if (consent.evidenceUrl) {
    drawLine(`Signed evidence: ${consent.evidenceUrl}`, { size: 9, color: rgb(0.18, 0.3, 0.58), leading: 12 });
  }
  drawLine(acknowledgedName, { size: 16, font: signatureFont, color: rgb(0.33, 0.13, 0.53), leading: 18 });

  return await pdf.save();
}
