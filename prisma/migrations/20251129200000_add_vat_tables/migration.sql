-- Migration manuelle pour créer les tables VAT
-- Exécuter avec: npx prisma db execute --file prisma/migrations/create_vat_tables.sql --schema prisma/schema.prisma

-- Créer l'enum VatReportStatus si nécessaire
DO $$ BEGIN
  CREATE TYPE "VatReportStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PAID', 'RECONCILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Créer l'enum VatPaymentStatus si nécessaire
DO $$ BEGIN
  CREATE TYPE "VatPaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'EXECUTED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Table vat_rates
CREATE TABLE IF NOT EXISTS "vat_rates" (
  "id" TEXT NOT NULL,
  "country_code" CHAR(2) NOT NULL,
  "region" TEXT,
  "product_category" TEXT NOT NULL,
  "rate" DECIMAL(5,4) NOT NULL,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vat_rates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vat_rates_country_code_product_category_effective_from_key" ON "vat_rates"("country_code", "product_category", "effective_from");
CREATE INDEX IF NOT EXISTS "vat_rates_country_code_product_category_effective_from_idx" ON "vat_rates"("country_code", "product_category", "effective_from");
CREATE INDEX IF NOT EXISTS "vat_rates_country_code_effective_from_effective_to_idx" ON "vat_rates"("country_code", "effective_from", "effective_to");

-- Table vat_transactions
CREATE TABLE IF NOT EXISTS "vat_transactions" (
  "id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "buyer_country" CHAR(2),
  "seller_country" CHAR(2) NOT NULL,
  "currency" CHAR(3) NOT NULL,
  "amount_gross" BIGINT NOT NULL,
  "amount_net" BIGINT NOT NULL,
  "vat_amount" BIGINT NOT NULL,
  "vat_rate_id" TEXT,
  "vat_calculation_version" TEXT NOT NULL,
  "vat_included" BOOLEAN NOT NULL DEFAULT true,
  "applied_rule" TEXT NOT NULL,
  "buyer_vat_number" TEXT,
  "is_b2b" BOOLEAN NOT NULL DEFAULT false,
  "product_category" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vat_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vat_transactions_payment_id_key" ON "vat_transactions"("payment_id");
CREATE INDEX IF NOT EXISTS "vat_transactions_merchant_id_created_at_idx" ON "vat_transactions"("merchant_id", "created_at");
CREATE INDEX IF NOT EXISTS "vat_transactions_payment_id_idx" ON "vat_transactions"("payment_id");
CREATE INDEX IF NOT EXISTS "vat_transactions_vat_rate_id_idx" ON "vat_transactions"("vat_rate_id");
CREATE INDEX IF NOT EXISTS "vat_transactions_buyer_country_idx" ON "vat_transactions"("buyer_country");
CREATE INDEX IF NOT EXISTS "vat_transactions_seller_country_idx" ON "vat_transactions"("seller_country");

-- Table vat_refund_adjustments
CREATE TABLE IF NOT EXISTS "vat_refund_adjustments" (
  "id" TEXT NOT NULL,
  "refund_id" TEXT NOT NULL,
  "vat_transaction_id" TEXT NOT NULL,
  "adjustment_amount" BIGINT NOT NULL,
  "adjustment_type" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vat_refund_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vat_refund_adjustments_refund_id_idx" ON "vat_refund_adjustments"("refund_id");
CREATE INDEX IF NOT EXISTS "vat_refund_adjustments_vat_transaction_id_idx" ON "vat_refund_adjustments"("vat_transaction_id");

-- Table vat_reports
CREATE TABLE IF NOT EXISTS "vat_reports" (
  "id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "total_vat" BIGINT NOT NULL,
  "total_sales" BIGINT NOT NULL,
  "total_net" BIGINT NOT NULL,
  "transaction_count" INTEGER NOT NULL DEFAULT 0,
  "status" "VatReportStatus" NOT NULL DEFAULT 'DRAFT',
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submitted_at" TIMESTAMP(3),
  "paid_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vat_reports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vat_reports_merchant_id_period_start_period_end_idx" ON "vat_reports"("merchant_id", "period_start", "period_end");
CREATE INDEX IF NOT EXISTS "vat_reports_merchant_id_status_idx" ON "vat_reports"("merchant_id", "status");

-- Table vat_payments
CREATE TABLE IF NOT EXISTS "vat_payments" (
  "id" TEXT NOT NULL,
  "report_id" TEXT,
  "merchant_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "fee" BIGINT NOT NULL DEFAULT 0,
  "currency" CHAR(3) NOT NULL,
  "recipient_account" TEXT,
  "recipient_name" TEXT,
  "external_payment_id" TEXT,
  "status" "VatPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "executed_at" TIMESTAMP(3),
  "failure_reason" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vat_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vat_payments_merchant_id_status_idx" ON "vat_payments"("merchant_id", "status");
CREATE INDEX IF NOT EXISTS "vat_payments_report_id_idx" ON "vat_payments"("report_id");

-- Table merchant_vat_settings
CREATE TABLE IF NOT EXISTS "merchant_vat_settings" (
  "id" TEXT NOT NULL,
  "merchant_id" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "seller_country" CHAR(2) NOT NULL,
  "auto_detect_buyer_country" BOOLEAN NOT NULL DEFAULT true,
  "default_tax_behavior" TEXT NOT NULL,
  "auto_reversement" BOOLEAN NOT NULL DEFAULT false,
  "reversement_account" TEXT,
  "default_rates" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "merchant_vat_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "merchant_vat_settings_merchant_id_key" ON "merchant_vat_settings"("merchant_id");

-- Table vat_audit_logs
CREATE TABLE IF NOT EXISTS "vat_audit_logs" (
  "id" TEXT NOT NULL,
  "transaction_id" TEXT,
  "report_id" TEXT,
  "action" TEXT NOT NULL,
  "actor_id" TEXT,
  "actor_type" TEXT,
  "payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vat_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "vat_audit_logs_transaction_id_idx" ON "vat_audit_logs"("transaction_id");
CREATE INDEX IF NOT EXISTS "vat_audit_logs_report_id_idx" ON "vat_audit_logs"("report_id");
CREATE INDEX IF NOT EXISTS "vat_audit_logs_action_created_at_idx" ON "vat_audit_logs"("action", "created_at");

-- Ajouter les foreign keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_transactions_payment_id_fkey') THEN
    ALTER TABLE "vat_transactions" ADD CONSTRAINT "vat_transactions_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_transactions_merchant_id_fkey') THEN
    ALTER TABLE "vat_transactions" ADD CONSTRAINT "vat_transactions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_transactions_vat_rate_id_fkey') THEN
    ALTER TABLE "vat_transactions" ADD CONSTRAINT "vat_transactions_vat_rate_id_fkey" FOREIGN KEY ("vat_rate_id") REFERENCES "vat_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_refund_adjustments_refund_id_fkey') THEN
    ALTER TABLE "vat_refund_adjustments" ADD CONSTRAINT "vat_refund_adjustments_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_refund_adjustments_vat_transaction_id_fkey') THEN
    ALTER TABLE "vat_refund_adjustments" ADD CONSTRAINT "vat_refund_adjustments_vat_transaction_id_fkey" FOREIGN KEY ("vat_transaction_id") REFERENCES "vat_transactions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_reports_merchant_id_fkey') THEN
    ALTER TABLE "vat_reports" ADD CONSTRAINT "vat_reports_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vat_payments_report_id_fkey') THEN
    ALTER TABLE "vat_payments" ADD CONSTRAINT "vat_payments_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "vat_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_vat_settings_merchant_id_fkey') THEN
    ALTER TABLE "merchant_vat_settings" ADD CONSTRAINT "merchant_vat_settings_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

