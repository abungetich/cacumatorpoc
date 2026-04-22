CREATE TABLE "verification_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "auto_reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "resend_interval_hours" INTEGER NOT NULL DEFAULT 24,
    "max_reminders" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_settings_pkey" PRIMARY KEY ("id")
);
