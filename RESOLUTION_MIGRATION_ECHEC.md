# 🔧 Résolution Migration en Échec - Render

## 🔴 Problème

Les migrations suivantes étaient dans le mauvais ordre :
- `20250103014430_add_notifications` → Référence `merchants` mais s'exécute avant sa création
- `20250103020000_advanced_features` → Référence `merchants` mais s'exécute avant sa création

**Erreur Render** :
```
ERROR: relation "merchants" does not exist
Migration name: 20250103014430_add_notifications
```

## ✅ Corrections Appliquées

1. ✅ **Renommé** `20250103014430_add_notifications` → `20251102000000_add_notifications`
2. ✅ **Renommé** `20250103020000_advanced_features` → `20251102240000_advanced_features`

**Nouvel ordre des migrations** :
1. `20251030000000_initial_transactions` - Tables de base
2. `20251101040000_multi_tenant_base` - **Crée `merchants`** ✅
3. `20251101052000_auth_users` - Utilisateurs (référence `merchants`)
4. `20251102000000_add_notifications` - Notifications (référence `merchants`) ✅
5. `20251102090000_password_reset_tokens`
6. `20251102094500_add_ebilling_gateway`
7. `20251102101500_shap_payouts_base`
8. `20251102230000_add_refunds`
9. `20251102240000_advanced_features` - Features avancées (référence `merchants`) ✅
10. ... autres migrations

## 📋 Actions Requises

### Option A : Reset la Base de Données (Recommandé pour une base vide)

Si votre base de données est vide ou contient uniquement des données de test :

1. **Dans Render Dashboard** :
   - Allez dans **kryptpay-db** → **Settings**
   - Cliquez sur **"Delete"** pour supprimer la base de données

2. **Recréer la base** :
   - Soit via le Blueprint (redéployer)
   - Soit manuellement : **New** → **PostgreSQL**

3. **Redéployer l'API** :
   - Les migrations s'appliqueront automatiquement dans le bon ordre

### Option B : Résoudre Manuellement (Si vous avez des données importantes)

Si vous devez garder la base de données existante :

1. **Connectez-vous à PostgreSQL Render** :
   - Dans Render Dashboard → **kryptpay-db** → **Connect**
   - Copiez la commande de connexion

2. **Vérifier l'état des migrations** :
   ```sql
   SELECT migration_name, finished_at, applied_steps_count 
   FROM "_prisma_migrations" 
   ORDER BY started_at;
   ```

3. **Nettoyer les migrations en échec** :
   ```sql
   -- Supprimer la migration en échec de l'historique
   DELETE FROM "_prisma_migrations" 
   WHERE migration_name IN (
     '20250103014430_add_notifications',
     '20250103020000_advanced_features'
   );
   ```

4. **Vérifier si les tables existent déjà** :
   ```sql
   -- Si les tables des notifications existent déjà (migration partiellement appliquée)
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('notification_history', 'merchant_notification_preferences', 'subscriptions');
   ```

   Si elles existent, vous devrez peut-être les supprimer et laisser Prisma les recréer :
   ```sql
   -- ATTENTION : Supprime les données existantes !
   DROP TABLE IF EXISTS "sandbox_webhook_logs" CASCADE;
   DROP TABLE IF EXISTS "dunning_attempts" CASCADE;
   DROP TABLE IF EXISTS "subscriptions" CASCADE;
   DROP TABLE IF EXISTS "saved_filters" CASCADE;
   DROP TABLE IF EXISTS "merchant_notification_preferences" CASCADE;
   DROP TABLE IF EXISTS "notification_history" CASCADE;
   ```

5. **Redéployer** : Les migrations s'appliqueront avec les nouveaux noms.

## ✅ Commiter les Changements

```bash
git add prisma/migrations/20251102000000_add_notifications
git add prisma/migrations/20251102240000_advanced_features
git rm -r prisma/migrations/20250103014430_add_notifications 2>/dev/null || true
git rm -r prisma/migrations/20250103020000_advanced_features 2>/dev/null || true
git commit -m "fix: Rename migrations to correct order (after merchants creation)"
git push origin main
```

## 🎯 Vérification

Après le redéploiement, vérifiez que :
1. ✅ La base de données est créée
2. ✅ La table `merchants` existe
3. ✅ Les migrations s'appliquent dans le bon ordre
4. ✅ L'API démarre correctement

---

**💡 Recommandation** : Si c'est un déploiement initial, utilisez l'**Option A** (reset) pour éviter toute complication.
