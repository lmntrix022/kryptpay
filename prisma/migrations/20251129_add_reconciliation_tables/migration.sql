-- Création des tables pour la réconciliation automatique

-- Table pour stocker les logs de réconciliation
CREATE TABLE IF NOT EXISTS "reconciliation_logs" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "run_id" TEXT UNIQUE NOT NULL,
    "merchant_id" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL,
    "completed_at" TIMESTAMPTZ NOT NULL,
    "result" JSONB NOT NULL,
    "issues_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker les résumés quotidiens
CREATE TABLE IF NOT EXISTS "reconciliation_summaries" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "date" DATE UNIQUE NOT NULL,
    "merchants_processed" INTEGER DEFAULT 0,
    "total_payments" INTEGER DEFAULT 0,
    "total_payouts" INTEGER DEFAULT 0,
    "total_volume" BIGINT DEFAULT 0,
    "total_commissions" BIGINT DEFAULT 0,
    "issues_count" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table pour les balances des marchands
CREATE TABLE IF NOT EXISTS "merchant_balances" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "merchant_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" BIGINT DEFAULT 0,
    "pending_balance" BIGINT DEFAULT 0,
    "last_updated" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("merchant_id", "currency")
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS "idx_reconciliation_logs_merchant" ON "reconciliation_logs"("merchant_id");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_logs_date" ON "reconciliation_logs"("started_at");
CREATE INDEX IF NOT EXISTS "idx_reconciliation_summaries_date" ON "reconciliation_summaries"("date");
CREATE INDEX IF NOT EXISTS "idx_merchant_balances_merchant" ON "merchant_balances"("merchant_id");

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_reconciliation_summaries_updated_at ON reconciliation_summaries;
CREATE TRIGGER update_reconciliation_summaries_updated_at
    BEFORE UPDATE ON reconciliation_summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
