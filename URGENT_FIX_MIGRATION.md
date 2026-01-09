# 🚨 Fix Urgent - Migration en Échec sur Render

## 🔴 Problème Actuel

La migration `20250103014430_add_notifications` a échoué sur Render et bloque toutes les nouvelles migrations :
```
Error: P3009
migrate found failed migrations in the target database
The `20250103014430_add_notifications` migration started at 2026-01-09 00:34:06.035642 UTC failed
```

## ✅ Solution Immédiate

### Option 1 : Nettoyer l'Historique de Migration (Recommandé)

1. **Connectez-vous à PostgreSQL Render** :
   - Allez dans Render Dashboard → **kryptpay-db** → **Connect**
   - Copiez la commande de connexion (format : `psql postgresql://...`)

2. **Exécutez ces commandes SQL** :
   ```sql
   -- Vérifier l'état des migrations
   SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
   FROM "_prisma_migrations" 
   ORDER BY started_at;
   
   -- Supprimer la migration en échec
   DELETE FROM "_prisma_migrations" 
   WHERE migration_name = '20250103014430_add_notifications';
   
   -- Vérifier que c'est supprimé
   SELECT migration_name FROM "_prisma_migrations" 
   WHERE migration_name LIKE '%notifications%';
   ```

3. **Vérifier si des tables partiellement créées existent** :
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('notification_history', 'merchant_notification_preferences');
   ```

4. **Si les tables existent, les supprimer** (car la migration va les recréer) :
   ```sql
   DROP TABLE IF EXISTS "merchant_notification_preferences" CASCADE;
   DROP TABLE IF EXISTS "notification_history" CASCADE;
   ```

5. **Commiter et pusher les migrations renommées** :
   ```bash
   git add prisma/migrations/
   git commit -m "fix: Rename migrations to correct order"
   git push origin main
   ```

6. **Redéployer sur Render** : Les migrations s'appliqueront automatiquement dans le bon ordre.

### Option 2 : Reset Complet de la Base (Si Option 1 ne fonctionne pas)

Si la base de données est vide ou contient uniquement des données de test :

1. **Dans Render Dashboard** :
   - Allez dans **kryptpay-db** → **Settings**
   - Cliquez sur **"Delete"** pour supprimer la base de données

2. **Recréer la base** :
   - Dans Render Dashboard → **New** → **PostgreSQL**
   - Utilisez le même nom ou un nouveau nom
   - Mettez à jour `DATABASE_URL` dans les variables d'environnement du service API si nécessaire

3. **Redéployer l'API** : Les migrations s'appliqueront automatiquement dans le bon ordre.

## 📋 Checklist

- [ ] Migration locale renommée : `20251102000000_add_notifications`
- [ ] Migration locale renommée : `20251102240000_advanced_features`
- [ ] Ancienne migration supprimée de `_prisma_migrations` sur Render
- [ ] Tables partiellement créées supprimées (si existent)
- [ ] Changements commités et pushés
- [ ] API redéployée sur Render

## 🎯 Ordre Final des Migrations

1. `20251030000000_initial_transactions` - Tables de base
2. `20251101040000_multi_tenant_base` - **Crée `merchants`** ✅
3. `20251101052000_auth_users` - Utilisateurs
4. `20251102000000_add_notifications` - Notifications (après merchants) ✅
5. `20251102090000_password_reset_tokens`
6. `20251102094500_add_ebilling_gateway`
7. `20251102101500_shap_payouts_base`
8. `20251102230000_add_refunds`
9. `20251102240000_advanced_features` - Features avancées (après merchants) ✅
10. ... autres migrations

---

**💡 Astuce** : Utilisez l'Option 1 pour un fix rapide sans perdre de données. L'Option 2 est plus propre mais nécessite de recréer la base.
