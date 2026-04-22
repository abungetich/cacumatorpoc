import { request as httpsRequest } from "node:https";
import nodemailer from "nodemailer";

type VerificationEmailInput = {
  to: string;
  fullName: string;
  verificationUrl: string;
  expiresAt: Date;
};

type PasswordResetEmailInput = {
  to: string;
  fullName: string;
  resetUrl: string;
  expiresAt: Date;
};

type MailTransportInput = {
  to: string;
  fullName: string;
  subject: string;
  html: string;
  text: string;
};

export type VerificationEmailSendResult = {
  sent: boolean;
  reason: string | null;
  channel: "ZEPTO" | "SMTP" | "NONE";
  providerStatusCode: number | null;
  providerMessage: string | null;
  providerPayload: string | null;
};

type ZeptoConfig = {
  url: string;
  token: string;
  fromAddress: string;
  fromName: string;
};

function parseFromField(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (match) {
    return {
      name: match[1]?.trim() || "Cacumator",
      address: match[2]?.trim() || "",
    };
  }

  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const fallbackName = raw.includes("@") ? raw.split("@")[0] : "Cacumator";
  return {
    name: fallbackName || "Cacumator",
    address: raw,
  };
}

function getZeptoConfig(): ZeptoConfig | null {
  const token = process.env.ZEPTO_TOKEN;
  if (!token) {
    return null;
  }

  const parsedFrom = parseFromField(process.env.SMTP_FROM);
  const fromAddress = process.env.ZEPTO_FROM_ADDRESS ?? parsedFrom?.address;
  if (!fromAddress) {
    return null;
  }

  return {
    url: process.env.ZEPTO_URL ?? "https://api.zeptomail.com/v1.1/email",
    token,
    fromAddress,
    fromName: process.env.ZEPTO_FROM_NAME ?? parsedFrom?.name ?? "Cacumator",
  };
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !portRaw || !user || !pass || !from) {
    return null;
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0) {
    return null;
  }

  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
  };
}

function buildVerificationContent(input: VerificationEmailInput) {
  const expiresLabel = input.expiresAt.toUTCString();

  const text = [
    `Hello ${input.fullName},`,
    "",
    "Confirm your email to continue with mentor onboarding.",
    `Open this link to verify your address: ${input.verificationUrl}`,
    `This link expires on ${expiresLabel}.`,
    "",
    "After confirmation, you will be able to sign in and complete your profile.",
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hello ${input.fullName},</p>`,
    "<p>Confirm your email to continue with mentor onboarding.</p>",
    `<p><a href="${input.verificationUrl}">Verify email address</a></p>`,
    `<p>This link expires on ${expiresLabel}.</p>`,
    "<p>After confirmation, you will be able to sign in and complete your profile.</p>",
    "<p>If you did not request this, you can ignore this email.</p>",
  ].join("");

  return {
    subject: "Confirm your Cacumator mentor email",
    text,
    html,
  };
}

function buildOrganizationVerificationContent(input: VerificationEmailInput) {
  const expiresLabel = input.expiresAt.toUTCString();

  const text = [
    `Hello ${input.fullName},`,
    "",
    "Confirm your email to continue with organization onboarding.",
    `Open this link to verify your address: ${input.verificationUrl}`,
    `This link expires on ${expiresLabel}.`,
    "",
    "After confirmation, you will be able to sign in and complete your organization workspace.",
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hello ${input.fullName},</p>`,
    "<p>Confirm your email to continue with organization onboarding.</p>",
    `<p><a href=\"${input.verificationUrl}\">Verify email address</a></p>`,
    `<p>This link expires on ${expiresLabel}.</p>`,
    "<p>After confirmation, you will be able to sign in and complete your organization workspace.</p>",
    "<p>If you did not request this, you can ignore this email.</p>",
  ].join("");

  return {
    subject: "Confirm your Cacumator organization email",
    text,
    html,
  };
}

function buildTestContent(input: { fullName: string }) {
  const text = [
    `Hello ${input.fullName},`,
    "",
    "This is a test email from the Cacumator verification settings workspace.",
    "If you received this, the current email transport can reach your inbox.",
  ].join("\n");

  const html = [
    `<p>Hello ${input.fullName},</p>`,
    "<p>This is a test email from the Cacumator verification settings workspace.</p>",
    "<p>If you received this, the current email transport can reach your inbox.</p>",
  ].join("");

  return {
    subject: "Cacumator email delivery test",
    text,
    html,
  };
}

function buildPasswordResetContent(input: PasswordResetEmailInput) {
  const expiresLabel = input.expiresAt.toUTCString();

  const text = [
    `Hello ${input.fullName},`,
    "",
    "We received a request to reset your Cacumator password.",
    `Open this link to set a new password: ${input.resetUrl}`,
    `This link expires on ${expiresLabel}.`,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hello ${input.fullName},</p>`,
    "<p>We received a request to reset your Cacumator password.</p>",
    `<p><a href="${input.resetUrl}">Reset password</a></p>`,
    `<p>This link expires on ${expiresLabel}.</p>`,
    "<p>If you did not request a password reset, you can ignore this email.</p>",
  ].join("");

  return {
    subject: "Reset your Cacumator password",
    text,
    html,
  };
}

async function sendViaZepto(config: ZeptoConfig, input: MailTransportInput) {
  const requestUrl = new URL(config.url);
  const payload = JSON.stringify({
    from: {
      address: config.fromAddress,
      name: config.fromName,
    },
    to: [
      {
        email_address: {
          address: input.to,
          name: input.fullName,
        },
      },
    ],
    subject: input.subject,
    htmlbody: input.html,
    textbody: input.text,
  });

  const response = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
    const req = httpsRequest(
      {
        protocol: requestUrl.protocol,
        hostname: requestUrl.hostname,
        port: requestUrl.port ? Number(requestUrl.port) : 443,
        path: `${requestUrl.pathname}${requestUrl.search}`,
        method: "POST",
        family: 4,
        timeout: 20000,
        headers: {
          Authorization: config.token,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("ZeptoMail request timed out"));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });

  const rawBody = response.body;
  let providerMessage: string | null = null;
  let providerPayload = rawBody.slice(0, 1200) || null;

  try {
    const parsed = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
    if (parsed) {
      providerMessage =
        (typeof parsed.message === "string" && parsed.message) ||
        (typeof parsed.request_id === "string" && parsed.request_id) ||
        (typeof parsed.data === "string" && parsed.data) ||
        null;
      providerPayload = JSON.stringify(parsed).slice(0, 1200);
    }
  } catch {
    providerMessage = rawBody.slice(0, 240) || null;
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    return {
      sent: false,
      reason: `ZeptoMail API error (${response.statusCode})`,
      channel: "ZEPTO" as const,
      providerStatusCode: response.statusCode,
      providerMessage,
      providerPayload,
    };
  }

  return {
    sent: true,
    reason: null,
    channel: "ZEPTO" as const,
    providerStatusCode: response.statusCode,
    providerMessage,
    providerPayload,
  };
}

async function sendViaSmtp(input: MailTransportInput) {
  const config = getSmtpConfig();
  if (!config) {
    return {
      sent: false,
      reason: "SMTP is not configured",
      channel: "SMTP" as const,
      providerStatusCode: null,
      providerMessage: null,
      providerPayload: null,
    };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const info = await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return {
    sent: true,
    reason: null,
    channel: "SMTP" as const,
    providerStatusCode: null,
    providerMessage: info.response ?? info.messageId ?? null,
    providerPayload: info.messageId ? JSON.stringify({ messageId: info.messageId }).slice(0, 1200) : null,
  };
}

async function sendPreferredEmail(input: MailTransportInput) {
  const smtpConfig = getSmtpConfig();
  if (smtpConfig) {
    try {
      return await sendViaSmtp(input);
    } catch (error) {
      return {
        sent: false,
        reason: error instanceof Error ? error.message : "Could not send email via SMTP",
        channel: "SMTP" as const,
        providerStatusCode: null,
        providerMessage: null,
        providerPayload: null,
      } satisfies VerificationEmailSendResult;
    }
  }

  const zeptoConfig = getZeptoConfig();
  if (zeptoConfig) {
    try {
      return await sendViaZepto(zeptoConfig, input);
    } catch (error) {
      const cause =
        error instanceof Error && error.cause && typeof error.cause === "object" && "message" in error.cause
          ? String((error.cause as { message?: unknown }).message ?? "")
          : null;
      return {
        sent: false,
        reason: error instanceof Error ? [error.message, cause].filter(Boolean).join(": ") : "Could not send email via Zepto",
        channel: "ZEPTO" as const,
        providerStatusCode: null,
        providerMessage: null,
        providerPayload: null,
      } satisfies VerificationEmailSendResult;
    }
  }

  return {
    sent: false,
    reason: "SMTP and Zepto are both not configured",
    channel: "NONE" as const,
    providerStatusCode: null,
    providerMessage: null,
    providerPayload: null,
  };
}

export function getVerificationEmailConfigStatus() {
  const zeptoConfig = getZeptoConfig();
  const smtpConfig = getSmtpConfig();
  const parsedFrom = parseFromField(process.env.SMTP_FROM);

  return {
    zeptoConfigured: Boolean(zeptoConfig),
    smtpConfigured: Boolean(smtpConfig),
    fromAddress: smtpConfig?.from ?? zeptoConfig?.fromAddress ?? parsedFrom?.address ?? null,
    fromName: zeptoConfig?.fromName ?? parsedFrom?.name ?? null,
    activeChannel: smtpConfig ? "SMTP" : zeptoConfig ? "ZEPTO" : "NONE",
  } as const;
}

export async function sendAppEmail(input: MailTransportInput) {
  return sendPreferredEmail(input);
}

export async function sendMentorVerificationEmail(input: VerificationEmailInput) {
  const content = buildVerificationContent(input);
  return sendAppEmail({
    to: input.to,
    fullName: input.fullName,
    ...content,
  });
}

export async function sendOrganizationVerificationEmail(input: VerificationEmailInput) {
  const content = buildOrganizationVerificationContent(input);
  return sendAppEmail({
    to: input.to,
    fullName: input.fullName,
    ...content,
  });
}

export async function sendVerificationTestEmail(input: { to: string; fullName: string }) {
  const content = buildTestContent(input);
  return sendAppEmail({
    to: input.to,
    fullName: input.fullName,
    ...content,
  });
}

export async function sendPasswordResetEmail(input: PasswordResetEmailInput) {
  const content = buildPasswordResetContent(input);
  return sendAppEmail({
    to: input.to,
    fullName: input.fullName,
    ...content,
  });
}
