import nodemailer from "nodemailer";

type InviteEmailInput = {
  to: string;
  fullName: string;
  roleLabel: string;
  inviteUrl: string;
  expiresAt: Date;
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
    auth: {
      user,
      pass,
    },
    from,
  };
}

function buildInviteContent(input: InviteEmailInput) {
  const expiresLabel = input.expiresAt.toUTCString();

  const text = [
    `Hello ${input.fullName},`,
    "",
    `You have been invited as ${input.roleLabel} to the root organization workspace.`,
    `Complete your account setup here: ${input.inviteUrl}`,
    `This invite expires on ${expiresLabel}.`,
    "",
    "If you did not expect this invite, please ignore this email.",
  ].join("\n");

  const html = [
    `<p>Hello ${input.fullName},</p>`,
    `<p>You have been invited as <strong>${input.roleLabel}</strong> to the root organization workspace.</p>`,
    `<p><a href=\"${input.inviteUrl}\">Complete account setup</a></p>`,
    `<p>This invite expires on ${expiresLabel}.</p>`,
    `<p>If you did not expect this invite, please ignore this email.</p>`,
  ].join("");

  return {
    subject: "Your Cacumator Tenant Invite",
    text,
    html,
  };
}

async function sendViaZepto(config: ZeptoConfig, input: InviteEmailInput) {
  const content = buildInviteContent(input);
  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: config.token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
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
      subject: content.subject,
      htmlbody: content.html,
      textbody: content.text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ZeptoMail API error (${response.status}): ${body.slice(0, 300)}`);
  }
}

async function sendViaSmtp(input: InviteEmailInput) {
  const config = getSmtpConfig();
  if (!config) {
    return false;
  }

  const content = buildInviteContent(input);

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transporter.sendMail({
    from: config.from,
    to: input.to,
    subject: content.subject,
    text: content.text,
    html: content.html,
  });

  return true;
}

export async function sendTenantInviteEmail(input: InviteEmailInput) {
  const zeptoConfig = getZeptoConfig();
  if (zeptoConfig) {
    await sendViaZepto(zeptoConfig, input);
    return {
      sent: true,
      reason: null,
    } as const;
  }

  const smtpSent = await sendViaSmtp(input);
  if (!smtpSent) {
    return {
      sent: false,
      reason: "Zepto API and SMTP are both not configured",
    } as const;
  }

  return {
    sent: true,
    reason: null,
  } as const;
}
