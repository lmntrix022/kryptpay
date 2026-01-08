-- Migration: Ajout des champs de monétisation pour BööhTax
-- Date: 2025-11-30

-- 1. Ajouter boohTaxFee dans la table transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "booh_tax_fee" BIGINT NOT NULL DEFAULT 0;

-- 2. Ajouter reversementFee dans la table vat_payments (remplacer fee par reversementFee pour plus de clarté)
ALTER TABLE "vat_payments" ADD COLUMN IF NOT EXISTS "reversement_fee" BIGINT NOT NULL DEFAULT 0;

-- Si le champ fee existe déjà, copier ses valeurs vers reversement_fee puis supprimer fee
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vat_payments' AND column_name='fee') THEN
    UPDATE "vat_payments" SET "reversement_fee" = "fee" WHERE "reversement_fee" = 0;
    ALTER TABLE "vat_payments" DROP COLUMN IF EXISTS "fee";
  END IF;
END $$;

-- 3. Ajouter l'enum SubscriptionPlanType
DO $$ BEGIN
  CREATE TYPE "SubscriptionPlanType" AS ENUM ('BASIC', 'TAX_PRO', 'BUSINESS_SUITE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Ajouter planType dans la table subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "plan_type" "SubscriptionPlanType";

-- 5. Créer un index pour les requêtes par planType
CREATE INDEX IF NOT EXISTS "subscriptions_merchant_id_plan_type_idx" ON "subscriptions"("merchant_id", "plan_type");

-- 6. Index pour boohTaxFee dans transactions (pour analytics)
CREATE INDEX IF NOT EXISTS "transactions_booh_tax_fee_idx" ON "transactions"("booh_tax_fee") WHERE "booh_tax_fee" > 0;

-- Commentaires pour documentation
COMMENT ON COLUMN "transactions"."booh_tax_fee" IS 'Frais service TVA (si reversement auto ou plan premium)';
COMMENT ON COLUMN "vat_payments"."reversement_fee" IS 'Frais de service: 1% du montant TVA reversée (min 300 XAF)';
COMMENT ON COLUMN "subscriptions"."plan_type" IS 'Type de plan: BASIC, TAX_PRO (4000 XAF/mois), BUSINESS_SUITE (7000 XAF/mois)';











