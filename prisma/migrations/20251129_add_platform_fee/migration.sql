-- Ajouter le champ platformFee pour les commissions de la plateforme
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "platform_fee" INTEGER DEFAULT 0;

-- Mettre à jour les transactions existantes avec une commission de 5%
UPDATE "transactions" 
SET "platform_fee" = ROUND("amountMinor" * 0.05)
WHERE "platform_fee" = 0 OR "platform_fee" IS NULL;

-- Créer un index pour les requêtes d'analytics
CREATE INDEX IF NOT EXISTS "idx_transactions_platform_fee" ON "transactions"("platform_fee");

