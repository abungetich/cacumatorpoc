CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "used_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "password_reset_tokens_email_idx"
  ON "password_reset_tokens"("email");

CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_expires_at_used_at_idx"
  ON "password_reset_tokens"("user_id", "expires_at", "used_at");
