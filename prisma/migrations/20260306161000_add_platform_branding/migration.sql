CREATE TABLE "platform_branding" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "platform_name" TEXT NOT NULL DEFAULT 'Cacumator Mentorship Platform',
  "logo_url" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_branding_pkey" PRIMARY KEY ("id")
);

INSERT INTO "platform_branding" ("id", "platform_name")
VALUES ('default', 'Cacumator Mentorship Platform')
ON CONFLICT ("id") DO NOTHING;
