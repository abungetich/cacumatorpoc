import { UserRole } from "@prisma/client";
import { getAppBaseUrl } from "@/lib/app-url";
import { getConsentNotificationSettings } from "@/lib/consent-notification-settings";
import { prisma } from "@/lib/prisma";
import { sendAppEmail } from "@/lib/verification/email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function notifyAdminsOfRequiredConsentDecline(input: {
  mentorUserId: string;
  title: string;
  version: string;
  consentType: string;
  acknowledgedName: string;
  reason?: string | null;
}) {
  const settings = await getConsentNotificationSettings();
  if (!settings.notifyPlatformAdminsOnDecline) {
    return null;
  }

  const [mentor, admins] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.mentorUserId },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
      },
    }),
    prisma.user.findMany({
      where: {
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
        emailVerifiedAt: {
          not: null,
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    }),
  ]);

  if (!mentor || admins.length === 0) {
    return null;
  }

  const mentorName = [mentor.firstName, mentor.middleName, mentor.lastName].filter(Boolean).join(" ").trim() || mentor.email;
  const mentorRecordUrl = `${getAppBaseUrl()}/people/mentors/${mentor.id}`;
  const subject = `Required consent declined: ${input.title}`;
  const reasonText = input.reason?.trim() || "No reason was provided.";

  await Promise.allSettled(
    admins.map((admin) =>
      sendAppEmail({
        to: admin.email,
        fullName: `${admin.firstName} ${admin.lastName}`.trim(),
        subject,
        text: [
          `Hello ${admin.firstName || "Admin"},`,
          "",
          `${mentorName} declined a required mentor consent document.`,
          `Document: ${input.title} (${input.version})`,
          `Consent type: ${input.consentType.replaceAll("_", " ")}`,
          `Acknowledged as: ${input.acknowledgedName}`,
          `Reason: ${reasonText}`,
          "",
          `Open mentor record: ${mentorRecordUrl}`,
        ].join("\n"),
        html: `
          <div style="margin:0;padding:32px;background:#f8f6fa;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
            <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #ebe5f3;border-radius:28px;overflow:hidden;box-shadow:0 18px 40px rgba(85,34,136,0.08);">
              <div style="padding:24px 28px;background:linear-gradient(135deg,#552288 0%,#6b2fb2 100%);color:#ffffff;">
                <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">Consent decline alert</p>
                <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Required consent declined</h1>
              </div>
              <div style="padding:28px;">
                <p style="margin:0;font-size:15px;line-height:1.8;color:#374151;">
                  ${escapeHtml(mentorName)} declined a required mentor consent document.
                </p>
                <div style="margin-top:18px;border:1px solid #fecdd3;background:#fff1f2;border-radius:20px;padding:18px;">
                  <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9f1239;">Document</p>
                  <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(input.title)}</p>
                  <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">
                    Version ${escapeHtml(input.version)} · ${escapeHtml(input.consentType.replaceAll("_", " "))}
                  </p>
                </div>
                <div style="margin-top:16px;border:1px solid #e5e7eb;background:#fafafa;border-radius:20px;padding:18px;">
                  <p style="margin:0;font-size:14px;line-height:1.8;color:#374151;"><strong>Acknowledged as:</strong> ${escapeHtml(input.acknowledgedName)}</p>
                  <p style="margin:10px 0 0;font-size:14px;line-height:1.8;color:#374151;"><strong>Reason:</strong> ${escapeHtml(reasonText)}</p>
                </div>
                <div style="margin-top:22px;">
                  <a href="${mentorRecordUrl}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#552288;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
                    Open mentor record
                  </a>
                </div>
              </div>
            </div>
          </div>
        `,
      }),
    ),
  );

  return { notified: admins.length };
}

export async function safeNotifyAdminsOfRequiredConsentDecline(input: {
  mentorUserId: string;
  title: string;
  version: string;
  consentType: string;
  acknowledgedName: string;
  reason?: string | null;
}) {
  try {
    return await notifyAdminsOfRequiredConsentDecline(input);
  } catch (error) {
    console.error("required consent decline admin notification failed", error);
    return null;
  }
}
