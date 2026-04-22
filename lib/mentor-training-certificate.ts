import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { UserRole } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/app-url";
import { prisma } from "@/lib/prisma";
import { getPlatformBranding } from "@/lib/platform-branding";

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
    if (current) lines.push(current);
    current = word;
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildMentorTrainingCertificate(userId: string, moduleId: string) {
  const [branding, user, completion] = await Promise.all([
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
    prisma.mentorTrainingCompletion.findFirst({
      where: {
        userId,
        moduleId,
      },
      select: {
        id: true,
        acknowledgedName: true,
        completedAt: true,
        notes: true,
        module: {
          select: {
            id: true,
            title: true,
            version: true,
            description: true,
            passingScore: true,
            estimatedMinutes: true,
          },
        },
      },
    }),
  ]);

  if (!user || user.role !== UserRole.MENTOR || !completion) {
    return null;
  }

  const passedAttempt = await prisma.mentorTrainingAttempt.findFirst({
    where: {
      userId,
      moduleId,
      passed: true,
    },
    orderBy: {
      submittedAt: "desc",
    },
    select: {
      score: true,
      submittedAt: true,
      acknowledgedName: true,
    },
  });

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
  const certificateHolder = completion.acknowledgedName || passedAttempt?.acknowledgedName || fullName;
  const verificationUrl = `${getAppBaseUrl()}/verify/training/${completion.id}`;

  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  const page = pdf.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.984, 0.965, 0.98) });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: rgb(0.33, 0.13, 0.53), borderWidth: 2 });
  page.drawRectangle({ x: 42, y: 42, width: width - 84, height: height - 84, borderColor: rgb(0.79, 0.69, 0.88), borderWidth: 1 });

  page.drawText(branding.platformName, {
    x: 68,
    y: height - 88,
    size: 18,
    font: boldFont,
    color: rgb(0.33, 0.13, 0.53),
  });

  page.drawText("Certificate of Completion", {
    x: 68,
    y: height - 150,
    size: 30,
    font: boldFont,
    color: rgb(0.16, 0.13, 0.24),
  });

  page.drawText("This certifies that", {
    x: 68,
    y: height - 205,
    size: 16,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.42),
  });

  page.drawText(certificateHolder, {
    x: 68,
    y: height - 255,
    size: 30,
    font: boldFont,
    color: rgb(0.33, 0.13, 0.53),
  });

  page.drawText("has successfully completed the mentor training module", {
    x: 68,
    y: height - 300,
    size: 16,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.42),
  });

  const moduleTitleLines = wrapText(completion.module.title, width - 136, 22, boldFont);
  let titleY = height - 344;
  for (const line of moduleTitleLines) {
    page.drawText(line, {
      x: 68,
      y: titleY,
      size: 22,
      font: boldFont,
      color: rgb(0.16, 0.13, 0.24),
    });
    titleY -= 28;
  }

  const details = [
    `Version: ${completion.module.version}`,
    `Achieved score: ${passedAttempt?.score ?? completion.module.passingScore}%`,
    `Pass threshold: ${completion.module.passingScore}%`,
    `Completed on: ${formatDateTime(completion.completedAt)}`,
    completion.module.estimatedMinutes ? `Estimated duration: ${completion.module.estimatedMinutes} minutes` : null,
  ].filter(Boolean) as string[];

  let detailY = 170;
  for (const detail of details) {
    page.drawText(detail, {
      x: 68,
      y: detailY,
      size: 12,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.42),
    });
    detailY -= 18;
  }

  const descriptionLines = wrapText(completion.module.description, 360, 11, regularFont);
  let descriptionY = 172;
  for (const line of descriptionLines.slice(0, 4)) {
    page.drawText(line, {
      x: 420,
      y: descriptionY,
      size: 11,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.42),
    });
    descriptionY -= 15;
  }

  page.drawLine({
    start: { x: width - 260, y: 108 },
    end: { x: width - 90, y: 108 },
    thickness: 1,
    color: rgb(0.79, 0.69, 0.88),
  });
  page.drawText(branding.ceoName, {
    x: width - 250,
    y: 118,
    size: 20,
    font: signatureFont,
    color: rgb(0.33, 0.13, 0.53),
  });
  page.drawText(branding.ceoTitle, {
    x: width - 250,
    y: 92,
    size: 10,
    font: regularFont,
    color: rgb(0.35, 0.35, 0.42),
  });

  page.drawText("Issued by platform records", {
    x: 68,
    y: 68,
    size: 10,
    font: regularFont,
    color: rgb(0.45, 0.45, 0.5),
  });
  page.drawText(`Verification: ${verificationUrl}`, {
    x: 68,
    y: 52,
    size: 9,
    font: regularFont,
    color: rgb(0.18, 0.3, 0.58),
  });

  return await pdf.save();
}
