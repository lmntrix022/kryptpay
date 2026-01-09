# 🔧 Fix Migration VAT - Table payments → transactions

## 🔴 Problème

La migration `20251129200000_add_vat_tables` référence une table `payments` qui n'existe pas :
```
ERROR: relation "payments" does not exist
```

**Cause** : Dans le schéma Prisma, la table s'appelle `transactions`, pas `payments`.

## ✅ Correction Appliquée

Changement de la référence dans la migration :
- ❌ `REFERENCES "payments"("id")`
- ✅ `REFERENCES "transactions"("id")`

## 📋 Actions Requises

### 1. Commiter la correction

```bash
cd /Users/valerie/Desktop/booh-pay
git add prisma/migrations/20251129200000_add_vat_tables/migration.sql
git commit -m "fix: Change payments to transactions in VAT migration foreign key"
git push origin main
```

### 2. Nettoyer la migration en échec sur Render

La migration est bloquée. Connectez-vous à PostgreSQL Render :

1. **Render Dashboard** → **kryptpay-db** → **Connect**
2. Copiez la commande de connexion
3. Exécutez ces commandes SQL :

```sql
-- Supprimer la migration en échec
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251129200000_add_vat_tables';

-- Vérifier si des tables VAT partiellement créées existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vat_%';

-- Si des tables VAT existent, les supprimer (ATTENTION : Supprime les données !)
DROP TABLE IF EXISTS "vat_audit_logs" CASCADE;
DROP TABLE IF EXISTS "merchant_vat_settings" CASCADE;
DROP TABLE IF EXISTS "vat_payments" CASCADE;
DROP TABLE IF EXISTS "vat_reports" CASCADE;
DROP TABLE IF EXISTS "vat_refund_adjustments" CASCADE;
DROP TABLE IF EXISTS "vat_transactions" CASCADE;
DROP TABLE IF EXISTS "vat_rates" CASCADE;

-- Supprimer les types si nécessaire
DROP TYPE IF EXISTS "VatPaymentStatus" CASCADE;
DROP TYPE IF EXISTS "VatReportStatus" CASCADE;
```

### 3. Redéployer sur Render

Après avoir nettoyé la base de données, redéployez :
- Les migrations s'appliqueront automatiquement avec la correction

## ✅ Vérification

Après le redéploiement :
- ✅ Les migrations VAT s'appliquent sans erreur
- ✅ La foreign key pointe vers `transactions` (pas `payments`)
- ✅ L'API démarre correctement

---

**Note** : Cette correction aligne la migration avec le schéma Prisma où la table principale est `transactions`.
