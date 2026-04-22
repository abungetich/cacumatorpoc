-- CreateTable
CREATE TABLE "mentor_training_module_settings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "estimated_minutes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentor_training_module_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_training_completions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "module_id" UUID NOT NULL,
    "acknowledged_name" TEXT NOT NULL,
    "completed_at" TIMESTAMPTZ(6) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentor_training_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentor_consent_settings" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "mentor_consent_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mentor_training_module_settings_is_active_sort_order_idx" ON "mentor_training_module_settings"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "mentor_training_completions_module_id_completed_at_idx" ON "mentor_training_completions"("module_id", "completed_at");

-- CreateIndex
CREATE INDEX "mentor_training_completions_user_id_completed_at_idx" ON "mentor_training_completions"("user_id", "completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "mentor_training_completions_user_id_module_id_key" ON "mentor_training_completions"("user_id", "module_id");

-- CreateIndex
CREATE INDEX "mentor_consent_settings_is_active_sort_order_idx" ON "mentor_consent_settings"("is_active", "sort_order");

-- CreateIndex
CREATE INDEX "mentor_consent_settings_consent_type_is_active_idx" ON "mentor_consent_settings"("consent_type", "is_active");

-- AddForeignKey
ALTER TABLE "mentor_training_completions" ADD CONSTRAINT "mentor_training_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentor_training_completions" ADD CONSTRAINT "mentor_training_completions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "mentor_training_module_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
