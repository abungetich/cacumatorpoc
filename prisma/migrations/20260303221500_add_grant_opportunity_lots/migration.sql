CREATE TABLE "grant_opportunity_lots" (
  "id" UUID NOT NULL,
  "opportunity_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "min_budget_minor" BIGINT NOT NULL,
  "max_budget_minor" BIGINT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "grant_opportunity_lots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "grant_opportunity_lots_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "grant_opportunity_lots_budget_range_check" CHECK ("min_budget_minor" <= "max_budget_minor")
);

CREATE INDEX "grant_opportunity_lots_opportunity_id_sort_order_idx"
  ON "grant_opportunity_lots"("opportunity_id", "sort_order");

ALTER TABLE "grant_opportunity_lots"
  ADD CONSTRAINT "grant_opportunity_lots_opportunity_id_fkey"
  FOREIGN KEY ("opportunity_id") REFERENCES "grant_opportunities"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
