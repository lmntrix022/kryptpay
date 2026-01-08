-- Script pour mettre à jour le platformFee pour toutes les transactions existantes
-- Taux de commission: 2.5% (0.025)

UPDATE transactions
SET "platform_fee" = ROUND("amountMinor" * 0.025)
WHERE "platform_fee" = 0;

-- Vérification
SELECT 
  COUNT(*) as total_transactions,
  SUM("platform_fee") as total_commissions,
  AVG("platform_fee") as average_commission
FROM transactions
WHERE "platform_fee" > 0;

