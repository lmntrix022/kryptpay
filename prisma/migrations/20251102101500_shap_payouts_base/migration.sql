CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "PayoutType" AS ENUM ('WITHDRAWAL', 'REFUND', 'CASHBACK');
CREATE TYPE "PayoutProvider" AS ENUM ('SHAP');

CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "provider" "PayoutProvider" NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "payment_system" TEXT NOT NULL,
    "payout_type" "PayoutType" NOT NULL,
    "amount_minor" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "msisdn" TEXT NOT NULL,
    "external_reference" TEXT,
    "provider_reference" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payouts_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "payout_events" (
    "id" TEXT NOT NULL,
    "payout_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payout_events_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "payout_events_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "payouts_merchant_id_idx" ON "payouts" ("merchant_id");
CREATE INDEX "payouts_provider_reference_idx" ON "payouts" ("provider_reference");
CREATE INDEX "payouts_payment_system_idx" ON "payouts" ("payment_system");
CREATE UNIQUE INDEX "payouts_merchant_id_external_reference_key" ON "payouts" ("merchant_id", "external_reference");

CREATE INDEX "payout_events_payout_id_occurred_at_idx" ON "payout_events" ("payout_id", "occurred_at");


