# 🔧 Création des tables VAT

## Problème

L'erreur indique que la table `vat_transactions` n'existe pas dans la base de données :
```
The table `public.vat_transactions` does not exist in the current database.
```

## Solution

Exécuter le script SQL suivant dans votre base de données PostgreSQL :

```bash
# Option 1: Via psql (si installé)
psql $DATABASE_URL -f prisma/migrations/create_vat_tables.sql

# Option 2: Via Prisma Studio
# Ouvrir Prisma Studio et exécuter le SQL dans l'onglet SQL
npx prisma studio

# Option 3: Via un client PostgreSQL (pgAdmin, DBeaver, etc.)
# Ouvrir le fichier prisma/migrations/create_vat_tables.sql et l'exécuter
```

## Fichier SQL

Le fichier SQL complet se trouve dans :
`prisma/migrations/create_vat_tables.sql`

Ce script :
- ✅ Crée les enums nécessaires (`VatReportStatus`, `VatPaymentStatus`)
- ✅ Crée toutes les tables VAT (`vat_rates`, `vat_transactions`, `vat_refund_adjustments`, `vat_reports`, `vat_payments`, `merchant_vat_settings`, `vat_audit_logs`)
- ✅ Crée tous les index nécessaires
- ✅ Ajoute les foreign keys vers les tables existantes (`payments`, `merchants`, `refunds`)

## Après exécution

1. Régénérer le client Prisma :
   ```bash
   npx prisma generate
   ```

2. Redémarrer le serveur backend :
   ```bash
   npm run start:dev
   ```

3. Tester l'endpoint :
   ```bash
   curl http://localhost:3000/v1/vat/transactions
   ```

## Note

Si certaines tables de base (`payments`, `merchants`, `refunds`) n'existent pas, il faudra d'abord créer ces tables avant d'exécuter le script VAT.

