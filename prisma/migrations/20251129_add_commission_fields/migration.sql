-- Migration: Ajouter les champs de commission séparés
-- Modèle de frais:
-- - boohpay_fee: Frais BoohPay (1.5% + 1€) - pour BoohPay
-- - app_commission: Commission de l'app (variable) - pour Bööh, etc.
-- - platform_fee: Total des deux (pour compatibilité)

-- Ajouter les champs au modèle Merchant
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "app_commission_rate" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "merchants" ADD COLUMN IF NOT EXISTS "app_commission_fixed" INTEGER DEFAULT 0;

-- Ajouter les champs au modèle Payment
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "boohpay_fee" INTEGER DEFAULT 0;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "app_commission" INTEGER DEFAULT 0;

-- Mettre à jour les transactions existantes:
-- On considère que l'ancien platform_fee était tout pour BoohPay (avant l'ajout des commissions app)
UPDATE "transactions" 
SET "boohpay_fee" = "platform_fee", 
    "app_commission" = 0 
WHERE "boohpay_fee" = 0;

