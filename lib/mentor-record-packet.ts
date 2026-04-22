import { ConsentType, UserRole } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getMentorOnboardingWorkspace } from "@/lib/mentor-onboarding-workspace";
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

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "Not recorded";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
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

export async function buildMentorRecordPacket(userId: string) {
  const [branding, workspace, user, trainingCompletions, consents, consentAuditTrail] = await Promise.all([
    getPlatformBranding(),
    getMentorOnboardingWorkspace(userId),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        mentorProfile: {
          select: {
            status: true,
            backgroundCheckStatus: true,
            backgroundCheckDate: true,
            backgroundCheckExpiry: true,
            backgroundCheckDocument: true,
            trainingCompleted: true,
            safeguardingAgreed: true,
          },
        },
      },
    }),
    prisma.mentorTrainingCompletion.findMany({
      where: { userId },
      select: {
        acknowledgedName: true,
        completedAt: true,
        notes: true,
        module: {
          select: {
            title: true,
            version: true,
            description: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: {
        completedAt: "asc",
      },
    }),
    prisma.consent.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      select: {
        consentType: true,
        version: true,
        agreedAt: true,
        documentUrl: true,
        evidenceUrl: true,
      },
      orderBy: {
        agreedAt: "asc",
      },
    }),
    prisma.auditLog.findMany({
      where: {
        userId,
        action: "MENTOR_CONSENT_SELF_ASSENTED",
        entityType: "mentor_consent_settings",
      },
      select: {
        createdAt: true,
        newValues: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!user || user.role !== UserRole.MENTOR || !user.mentorProfile || !workspace) {
    return null;
  }

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
  const consentSettings = await prisma.mentorConsentSetting.findMany({
    select: {
      title: true,
      summary: true,
      consentType: true,
      version: true,
    },
  });
  const consentSettingMap = new Map(consentSettings.map((item) => [`${item.consentType}:${item.version}`, item]));
  const consentAuditMap = new Map<string, { acknowledgedName: string | null; createdAt: string | null }>();

  for (const entry of consentAuditTrail) {
    const payload = (entry.newValues ?? {}) as Record<string, unknown>;
    const consentType = typeof payload.consentType === "string" ? payload.consentType : null;
    const version = typeof payload.version === "string" ? payload.version : null;
    if (!consentType || !version) continue;

    const key = `${consentType}:${version}`;
    if (!consentAuditMap.has(key)) {
      consentAuditMap.set(key, {
        acknowledgedName: typeof payload.acknowledgedName === "string" ? payload.acknowledgedName : null,
        createdAt: entry.createdAt.toISOString(),
      });
    }
  }

  const pdf = await PDFDocument.create();
  const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const signatureFont = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  let page = pdf.addPage([595.28, 841.89]);
  let cursorY = 790;
  const marginX = 48;
  const contentWidth = 500;

  const ensureSpace = (neededHeight: number) => {
    if (cursorY - neededHeight > 48) {
      return;
    }
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
  page.drawText("Mentor starter-pack record", {
    x: marginX,
    y: 783,
    size: 11,
    font: regularFont,
    color: rgb(0.96, 0.93, 0.98),
  });

  cursorY = 732;
  drawLine(`Mentor: ${fullName}`, { size: 13, font: boldFont });
  drawLine(`Email: ${user.email}`);
  drawLine(`Generated: ${formatDateTime(new Date())}`);
  drawLine(`Account status: ${user.mentorProfile.status}`);
  drawLine(`Onboarding progress recorded: ${workspace.completedCount}/${workspace.totalCount}`);

  drawSectionTitle("Checklist snapshot");
  for (const step of workspace.checklist) {
    drawLine(`${step.complete ? "[Done]" : "[Pending]"} ${step.label}`, { font: boldFont, size: 11 });
    drawLine(step.description, { size: 10, color: rgb(0.35, 0.35, 0.42), leading: 13 });
    drawSpacer(6);
  }

  drawSectionTitle("Signed documents");
  if (consents.length === 0) {
    drawLine("No signed consent or safeguarding records are currently on file.", { size: 10, color: rgb(0.4, 0.4, 0.46) });
  } else {
    for (const consent of consents) {
      const key = `${consent.consentType}:${consent.version}`;
      const setting = consentSettingMap.get(key);
      const signatureMeta = consentAuditMap.get(key);
      drawLine(setting?.title ?? formatConsentType(consent.consentType), { size: 12, font: boldFont });
      drawLine(`Type: ${formatConsentType(consent.consentType)}  |  Version: ${consent.version}`, { size: 10 });
      drawLine(`Agreed on: ${formatDateTime(consent.agreedAt)}`, { size: 10 });
      drawLine(`Typed name: ${signatureMeta?.acknowledgedName ?? fullName}`, { size: 10 });
      if (setting?.summary) {
        drawLine(setting.summary, { size: 10, color: rgb(0.35, 0.35, 0.42), leading: 13 });
      }
      if (consent.documentUrl) {
        drawLine(`Source document: ${consent.documentUrl}`, { size: 9, color: rgb(0.18, 0.3, 0.58), leading: 12 });
      }
      if (consent.evidenceUrl) {
        drawLine(`Signed evidence: ${consent.evidenceUrl}`, { size: 9, color: rgb(0.18, 0.3, 0.58), leading: 12 });
      }
      drawLine(signatureMeta?.acknowledgedName ?? fullName, { size: 16, font: signatureFont, color: rgb(0.33, 0.13, 0.53), leading: 18 });
      drawSpacer(8);
    }
  }

  drawSectionTitle("Training completions");
  if (trainingCompletions.length === 0) {
    drawLine("No mentor training completions are currently on file.", { size: 10, color: rgb(0.4, 0.4, 0.46) });
  } else {
    for (const completion of trainingCompletions) {
      drawLine(completion.module.title, { size: 12, font: boldFont });
      drawLine(`Version: ${completion.module.version}  |  Completed: ${formatDateTime(completion.completedAt)}`, { size: 10 });
      drawLine(`Acknowledged as: ${completion.acknowledgedName}`, { size: 10 });
      if (completion.module.estimatedMinutes) {
        drawLine(`Estimated duration: ${completion.module.estimatedMinutes} minutes`, { size: 10 });
      }
      drawLine(completion.module.description, { size: 10, color: rgb(0.35, 0.35, 0.42), leading: 13 });
      if (completion.notes) {
        drawLine(`Notes: ${completion.notes}`, { size: 10, font: italicFont, color: rgb(0.38, 0.26, 0.5), leading: 13 });
      }
      drawLine(completion.acknowledgedName, { size: 16, font: signatureFont, color: rgb(0.33, 0.13, 0.53), leading: 18 });
      drawSpacer(8);
    }
  }

  drawSectionTitle("Background check");
  drawLine(`Status: ${workspace.backgroundCheck.status}`, { size: 11, font: boldFont });
  drawLine(`Checked on: ${formatDate(workspace.backgroundCheck.checkedOn)}`, { size: 10 });
  drawLine(`Expires on: ${formatDate(workspace.backgroundCheck.expiresAt)}`, { size: 10 });
  drawLine(`Document: ${workspace.backgroundCheck.documentUrl ?? "Not attached"}`, {
    size: 9,
    color: workspace.backgroundCheck.documentUrl ? rgb(0.18, 0.3, 0.58) : rgb(0.4, 0.4, 0.46),
    leading: 12,
  });

  return await pdf.save();
}
