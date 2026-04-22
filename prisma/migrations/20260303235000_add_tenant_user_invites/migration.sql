CREATE TABLE "tenant_user_invites" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "invited_by_id" UUID NOT NULL,
  "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "tenant_user_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_user_invites_user_id_key"
  ON "tenant_user_invites"("user_id");

CREATE UNIQUE INDEX "tenant_user_invites_token_hash_key"
  ON "tenant_user_invites"("token_hash");

CREATE INDEX "tenant_user_invites_email_idx"
  ON "tenant_user_invites"("email");

CREATE INDEX "tenant_user_invites_invited_by_id_invited_at_idx"
  ON "tenant_user_invites"("invited_by_id", "invited_at");

CREATE INDEX "tenant_user_invites_expires_at_accepted_at_idx"
  ON "tenant_user_invites"("expires_at", "accepted_at");

ALTER TABLE "tenant_user_invites"
  ADD CONSTRAINT "tenant_user_invites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_user_invites"
  ADD CONSTRAINT "tenant_user_invites_invited_by_id_fkey"
  FOREIGN KEY ("invited_by_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
