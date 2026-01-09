# 🔧 Fix Migration Order - platform_fee → commission_fields

## 🔴 Problème

La migration `20251129_add_commission_fields` s'exécute **avant** `20251129_add_platform_fee` à cause de l'ordre lexicographique, mais elle essaie d'utiliser la colonne `platform_fee` qui n'existe pas encore :

```
ERROR: column "platform_fee" does not exist
```

**Cause** : Prisma trie les migrations par nom, donc :
- `20251129_add_commission_fields` (vient avant "platform")
- `20251129_add_platform_fee` (vient après "commission")

## ✅ Corrections Appliquées

1. ✅ **Renommé** `20251129_add_platform_fee` → `20251129000000_add_platform_fee` (s'exécute en premier)
2. ✅ **Renommé** `20251129_add_commission_fields` → `20251129010000_add_commission_fields` (s'exécute après)
3. ✅ **Ajouté une vérification** dans `add_commission_fields` pour s'assurer que `platform_fee` existe avant de l'utiliser

**Nouvel ordre des migrations** :
1. `20251129000000_add_platform_fee` - Crée `platform_fee` ✅
2. `20251129010000_add_commission_fields` - Utilise `platform_fee` ✅
3. `20251129_add_reconciliation_tables`
4. `20251129200000_add_vat_tables`
5. `20251130000000_add_vat_monetization_fields`

## 📋 Actions Requises

### 1. Commiter les Corrections

```bash
cd /Users/valerie/Desktop/booh-pay
git add prisma/migrations/20251129000000_add_platform_fee
git add prisma/migrations/20251129010000_add_commission_fields
git rm -r prisma/migrations/20251129_add_platform_fee 2>/dev/null || true
git rm -r prisma/migrations/20251129_add_commission_fields 2>/dev/null || true
git commit -m "fix: Rename migrations to correct order (platform_fee before commission_fields)"
git push origin main
```

### 2. Nettoyer la Migration en Échec sur Render

La migration est bloquée. Connectez-vous à PostgreSQL Render et exécutez :

```sql
-- Supprimer la migration en échec
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251129_add_commission_fields';

-- Vérifier si des colonnes ont été partiellement ajoutées
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('boohpay_fee', 'app_commission', 'app_commission_rate', 'app_commission_fixed');

-- Si des colonnes existent, les supprimer (ATTENTION : Supprime les données !)
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "boohpay_fee";
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "app_commission";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "app_commission_rate";
ALTER TABLE "merchants" DROP COLUMN IF EXISTS "app_commission_fixed";
```

### 3. Redéployer sur Render

Après avoir nettoyé la base de données :
- Render Dashboard → **kryptpay-api** → **Manual Deploy**
- Les migrations s'appliqueront automatiquement dans le bon ordre

## ✅ Vérification

Après le redéploiement :
- ✅ `platform_fee` est créé en premier
- ✅ `boohpay_fee` et `app_commission` sont créés ensuite
- ✅ Les données sont migrées correctement
- ✅ L'API démarre sans erreur

---

**Note** : La vérification conditionnelle ajoutée dans `add_commission_fields` garantit que la migration fonctionne même si `platform_fee` n'existe pas encore (défense en profondeur).
