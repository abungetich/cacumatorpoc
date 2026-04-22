import { prisma } from "@/lib/prisma";
import { getPlatformBranding } from "@/lib/platform-branding";
import { getMentorOnboardingWorkspace } from "@/lib/mentor-onboarding-workspace";
import { sendAppEmail } from "@/lib/verification/email";

type OnboardingStepEmailInput = {
  userId: string;
  achievedStep: string;
  detail?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || "Mentor";
}

function renderPendingSteps(pending: string[]) {
  if (pending.length === 0) {
    return `
      <div style="margin-top:16px;border:1px solid #d1fae5;background:#ecfdf5;border-radius:18px;padding:16px;">
        <p style="margin:0;font-size:14px;font-weight:700;color:#065f46;">All visible onboarding items are complete.</p>
        <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#065f46;">
          Your account is now ready for platform review.
        </p>
      </div>
    `;
  }

  return `
    <div style="margin-top:16px;border:1px solid #e5e7eb;background:#ffffff;border-radius:18px;padding:16px;">
      <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">Pending next steps</p>
      <ul style="margin:12px 0 0;padding-left:18px;color:#4b5563;font-size:14px;line-height:1.8;">
        ${pending.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
      </ul>
    </div>
  `;
}

export async function sendMentorOnboardingProgressEmail(input: OnboardingStepEmailInput) {
  const [user, workspace, branding] = await Promise.all([
    prisma.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        middleName: true,
        lastName: true,
        role: true,
        emailVerifiedAt: true,
      },
    }),
    getMentorOnboardingWorkspace(input.userId),
    getPlatformBranding(),
  ]);

  if (!user || user.role !== "MENTOR" || !user.emailVerifiedAt || !workspace) {
    return null;
  }

  const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(" ").trim();
  const pendingSteps = workspace.checklist.filter((item) => !item.complete).map((item) => item.label);
  const stepLabel = input.achievedStep.trim();
  const detail = input.detail?.trim() || null;
  const progressLabel = `${workspace.completedCount}/${workspace.totalCount} core requirements complete`;
  const onboardingUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3001"}/mentor-onboarding`;

  const subject =
    pendingSteps.length === 0
      ? `${branding.platformName}: onboarding complete and ready for review`
      : `${branding.platformName}: ${stepLabel} recorded`;

  const text = [
    `Hello ${firstName(fullName)},`,
    "",
    `Completed step: ${stepLabel}`,
    detail ? `Details: ${detail}` : null,
    `Progress: ${progressLabel} (${workspace.progressPercentage}%)`,
    "",
    pendingSteps.length > 0 ? "Pending next steps:" : "All visible onboarding items are complete.",
    ...(pendingSteps.length > 0 ? pendingSteps.map((step) => `- ${step}`) : ["Your account is now ready for platform review."]),
    "",
    `Continue onboarding: ${onboardingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="margin:0;padding:32px;background:#f8f6fa;font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #ebe5f3;border-radius:28px;overflow:hidden;box-shadow:0 18px 40px rgba(85,34,136,0.08);">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#552288 0%,#6b2fb2 100%);color:#ffffff;">
          <p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.8;">Mentor Onboarding Update</p>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">${escapeHtml(branding.platformName)}</h1>
        </div>
        <div style="padding:28px;">
          <p style="margin:0;font-size:15px;line-height:1.8;color:#374151;">Hello ${escapeHtml(firstName(fullName))},</p>
          <p style="margin:14px 0 0;font-size:15px;line-height:1.8;color:#374151;">
            A new onboarding step has been recorded on your mentor account.
          </p>

          <div style="margin-top:18px;border:1px solid #ddd6fe;background:#f5f3ff;border-radius:20px;padding:18px;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6b21a8;">Completed step</p>
            <p style="margin:8px 0 0;font-size:20px;font-weight:700;color:#111827;">${escapeHtml(stepLabel)}</p>
            ${detail ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">${escapeHtml(detail)}</p>` : ""}
          </div>

          <div style="margin-top:16px;border:1px solid #e5e7eb;background:#fafafa;border-radius:20px;padding:18px;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#6b7280;">Current progress</p>
            <p style="margin:8px 0 0;font-size:24px;font-weight:700;color:#111827;">${workspace.progressPercentage}%</p>
            <p style="margin:6px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">${escapeHtml(progressLabel)}</p>
          </div>

          ${renderPendingSteps(pendingSteps)}

          <div style="margin-top:22px;">
            <a href="${onboardingUrl}" style="display:inline-block;padding:12px 18px;border-radius:14px;background:#552288;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Continue onboarding
            </a>
          </div>
        </div>
      </div>
    </div>
  `;

  return sendAppEmail({
    to: user.email,
    fullName,
    subject,
    html,
    text,
  });
}

export async function safeSendMentorOnboardingProgressEmail(input: OnboardingStepEmailInput) {
  try {
    return await sendMentorOnboardingProgressEmail(input);
  } catch (error) {
    console.error("mentor onboarding progress email failed", error);
    return null;
  }
}
