# 🚨 Fix Immédiat - Migration en Échec Render

## 🔴 Situation Actuelle

- ✅ Migrations renommées localement
- ❌ Migrations en échec dans la base Render qui bloquent tout
- ❌ Changements pas encore commités

## 📋 Étapes à Suivre (Dans l'ordre)

### 1. Commiter les Migrations Renommées

```bash
cd /Users/valerie/Desktop/booh-pay

# Ajouter les nouvelles migrations renommées
git add prisma/migrations/20251102000000_add_notifications
git add prisma/migrations/20251102240000_advanced_features

# Supprimer les anciennes migrations (si elles apparaissent)
git rm -r prisma/migrations/20250103014430_add_notifications 2>/dev/null || true
git rm -r prisma/migrations/20250103020000_advanced_features 2>/dev/null || true

# Commiter
git commit -m "fix: Rename migrations to correct order (after merchants creation)"

# Pusher
git push origin main
```

### 2. Nettoyer la Base de Données Render

**Connectez-vous à PostgreSQL Render** :

1. Render Dashboard → **kryptpay-db** → **Connect**
2. Copiez la commande de connexion (format : `psql postgresql://...`)
3. Collez-la dans votre terminal local

**Exécutez ces commandes SQL** :

```sql
-- 1. Vérifier l'état des migrations
SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
FROM "_prisma_migrations" 
ORDER BY started_at;

-- 2. Supprimer la migration en échec
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20250103014430_add_notifications';

-- 3. Vérifier si des tables partiellement créées existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'notification_history', 
  'merchant_notification_preferences',
  'subscriptions',
  'saved_filters',
  'dunning_attempts',
  'sandbox_webhook_logs'
);

-- 4. Si des tables existent, les supprimer (ATTENTION : Supprime les données !)
DROP TABLE IF EXISTS "sandbox_webhook_logs" CASCADE;
DROP TABLE IF EXISTS "dunning_attempts" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "saved_filters" CASCADE;
DROP TABLE IF EXISTS "merchant_notification_preferences" CASCADE;
DROP TABLE IF EXISTS "notification_history" CASCADE;

-- 5. Vérifier que tout est propre
SELECT migration_name FROM "_prisma_migrations" 
WHERE migration_name LIKE '%20250103%';
```

### 3. Redéployer sur Render

1. Render Dashboard → **kryptpay-api** → **Manual Deploy**
2. Sélectionnez le dernier commit (avec les migrations renommées)
3. Cliquez sur **Deploy**

Les migrations s'appliqueront automatiquement dans le bon ordre.

### 4. Alternative : Reset Complet (Si vous n'avez pas de données importantes)

Si vous préférez repartir de zéro :

1. Render Dashboard → **kryptpay-db** → **Settings** → **Delete**
2. Recréer la base : **New** → **PostgreSQL**
3. Mettre à jour `DATABASE_URL` dans les variables d'environnement du service API
4. Redéployer l'API

## ✅ Vérification

Après le redéploiement, vérifiez les logs :
- ✅ Les migrations s'appliquent sans erreur
- ✅ L'API démarre correctement
- ✅ Aucune erreur dans les logs

---

**💡 Astuce** : Si vous n'avez pas encore de données importantes, l'option "Reset Complet" est plus simple et plus sûre.
