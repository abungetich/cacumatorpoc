import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_VERIFICATION_SETTINGS = {
  id: "default",
  autoReminderEnabled: false,
  resendIntervalHours: 24,
  maxReminders: 3,
} as const;

export type VerificationSettingsRecord = {
  id: string;
  autoReminderEnabled: boolean;
  resendIntervalHours: number;
  maxReminders: number;
  createdAt: Date;
  updatedAt: Date;
};

function getVerificationSettingsDelegate() {
  const client = prisma as typeof prisma & {
    verificationSettings?: {
      findUnique: (args: { where: { id: string } }) => Promise<VerificationSettingsRecord | null>;
      upsert: (args: {
        where: { id: string };
        create: {
          id: string;
          autoReminderEnabled: boolean;
          resendIntervalHours: number;
          maxReminders: number;
        };
        update: {
          autoReminderEnabled: boolean;
          resendIntervalHours: number;
          maxReminders: number;
        };
      }) => Promise<VerificationSettingsRecord>;
    };
  };

  return client.verificationSettings;
}

async function getVerificationSettingsRaw() {
  const rows = await prisma.$queryRaw<VerificationSettingsRecord[]>(Prisma.sql`
    select
      id,
      auto_reminder_enabled as "autoReminderEnabled",
      resend_interval_hours as "resendIntervalHours",
      max_reminders as "maxReminders",
      created_at as "createdAt",
      updated_at as "updatedAt"
    from verification_settings
    where id = ${DEFAULT_VERIFICATION_SETTINGS.id}
    limit 1
  `);

  return rows[0] ?? null;
}

export async function getVerificationSettings() {
  const delegate = getVerificationSettingsDelegate();

  const settings = delegate
    ? await delegate.findUnique({
        where: {
          id: DEFAULT_VERIFICATION_SETTINGS.id,
        },
      })
    : await getVerificationSettingsRaw();

  return (
    settings ?? {
      ...DEFAULT_VERIFICATION_SETTINGS,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  );
}

export async function saveVerificationSettings(input: {
  autoReminderEnabled: boolean;
  resendIntervalHours: number;
  maxReminders: number;
}) {
  const delegate = getVerificationSettingsDelegate();
  if (delegate) {
    return delegate.upsert({
      where: { id: DEFAULT_VERIFICATION_SETTINGS.id },
      create: {
        id: DEFAULT_VERIFICATION_SETTINGS.id,
        ...input,
      },
      update: input,
    });
  }

  const rows = await prisma.$queryRaw<VerificationSettingsRecord[]>(Prisma.sql`
    insert into verification_settings (
      id,
      auto_reminder_enabled,
      resend_interval_hours,
      max_reminders,
      created_at,
      updated_at
    )
    values (
      ${DEFAULT_VERIFICATION_SETTINGS.id},
      ${input.autoReminderEnabled},
      ${input.resendIntervalHours},
      ${input.maxReminders},
      now(),
      now()
    )
    on conflict (id) do update
    set
      auto_reminder_enabled = excluded.auto_reminder_enabled,
      resend_interval_hours = excluded.resend_interval_hours,
      max_reminders = excluded.max_reminders,
      updated_at = now()
    returning
      id,
      auto_reminder_enabled as "autoReminderEnabled",
      resend_interval_hours as "resendIntervalHours",
      max_reminders as "maxReminders",
      created_at as "createdAt",
      updated_at as "updatedAt"
  `);

  return rows[0] ?? {
    ...DEFAULT_VERIFICATION_SETTINGS,
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
