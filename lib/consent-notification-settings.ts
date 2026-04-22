import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DEFAULT_SETTINGS = {
  id: "default",
  notifyPlatformAdminsOnDecline: false,
};

type ConsentNotificationSettingsView = typeof DEFAULT_SETTINGS;

function hasSettingsDelegate() {
  const candidate = prisma as typeof prisma & {
    consentNotificationSettings?: {
      findUnique: (args: { where: { id: string } }) => Promise<{
        id: string;
        notifyPlatformAdminsOnDecline: boolean;
      } | null>;
      upsert: (args: {
        where: { id: string };
        update: { notifyPlatformAdminsOnDecline: boolean };
        create: { id: string; notifyPlatformAdminsOnDecline: boolean };
      }) => Promise<{
        id: string;
        notifyPlatformAdminsOnDecline: boolean;
      }>;
    };
  };

  return Boolean(candidate.consentNotificationSettings);
}

export async function getConsentNotificationSettings(): Promise<ConsentNotificationSettingsView> {
  if (hasSettingsDelegate()) {
    const item = await (prisma as typeof prisma & {
      consentNotificationSettings: {
        findUnique: (args: { where: { id: string } }) => Promise<ConsentNotificationSettingsView | null>;
      };
    }).consentNotificationSettings.findUnique({
      where: { id: DEFAULT_SETTINGS.id },
    });

    return item ?? DEFAULT_SETTINGS;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; notify_platform_admins_on_decline: boolean }>>(
      Prisma.sql`SELECT id, notify_platform_admins_on_decline FROM consent_notification_settings WHERE id = ${DEFAULT_SETTINGS.id} LIMIT 1`,
    );
    const row = rows[0];
    if (!row) {
      return DEFAULT_SETTINGS;
    }

    return {
      id: row.id,
      notifyPlatformAdminsOnDecline: Boolean(row.notify_platform_admins_on_decline),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function updateConsentNotificationSettings(input: {
  notifyPlatformAdminsOnDecline: boolean;
}) {
  if (hasSettingsDelegate()) {
    return (prisma as typeof prisma & {
      consentNotificationSettings: {
        upsert: (args: {
          where: { id: string };
          update: { notifyPlatformAdminsOnDecline: boolean };
          create: { id: string; notifyPlatformAdminsOnDecline: boolean };
        }) => Promise<ConsentNotificationSettingsView>;
      };
    }).consentNotificationSettings.upsert({
      where: { id: DEFAULT_SETTINGS.id },
      update: {
        notifyPlatformAdminsOnDecline: input.notifyPlatformAdminsOnDecline,
      },
      create: {
        id: DEFAULT_SETTINGS.id,
        notifyPlatformAdminsOnDecline: input.notifyPlatformAdminsOnDecline,
      },
    });
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO consent_notification_settings (id, notify_platform_admins_on_decline)
      VALUES (${DEFAULT_SETTINGS.id}, ${input.notifyPlatformAdminsOnDecline})
      ON CONFLICT (id)
      DO UPDATE SET
        notify_platform_admins_on_decline = EXCLUDED.notify_platform_admins_on_decline,
        updated_at = NOW()
    `,
  );

  return getConsentNotificationSettings();
}
