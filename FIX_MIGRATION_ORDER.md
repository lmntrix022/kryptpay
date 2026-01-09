# 🔧 Fix Migration Order - Merchants Table

## 🔴 Problème

La migration `20250103014430_add_notifications` était exécutée **avant** `20251101040000_multi_tenant_base` qui crée la table `merchants`. 

**Erreur** :
```
ERROR: relation "merchants" does not exist
```

**Cause** : Prisma trie les migrations par nom alphabétique, donc `20250103` vient avant `20251101`.

## ✅ Solution Appliquée

Renommage de la migration pour qu'elle soit exécutée **après** la création de la table `merchants` :

```
20250103014430_add_notifications → 20251102000000_add_notifications
```

L'ordre des migrations est maintenant :
1. `20251030000000_initial_transactions` - Crée les tables de base (transactions)
2. `20251101040000_multi_tenant_base` - Crée la table `merchants`
3. `20251101052000_auth_users` - Crée les utilisateurs (référence `merchants`)
4. `20251102000000_add_notifications` - Crée les notifications (référence `merchants`) ✅
5. ... autres migrations

## 📝 Actions Requises

### 1. Commiter le changement

```bash
git add prisma/migrations/20251102000000_add_notifications
git rm -r prisma/migrations/20250103014430_add_notifications  # Si toujours présent
git commit -m "fix: Rename notifications migration to correct order (after merchants creation)"
git push origin main
```

### 2. Résoudre la migration en échec sur Render

Sur Render, la migration est en état d'échec. Deux options :

#### Option A : Reset la base de données (Recommandé pour une base vide)

Si la base de données est vide ou contient uniquement des données de test :

1. Dans Render Dashboard → **kryptpay-db** → **Settings**
2. Cliquez sur **"Delete"** pour supprimer la base de données
3. Recréez-la via le Blueprint ou manuellement
4. Les migrations s'appliqueront dans le bon ordre

#### Option B : Marquer la migration comme résolue manuellement

Si vous voulez garder la base de données existante :

1. Connectez-vous à la base PostgreSQL Render
2. Marquez la migration comme appliquée manuellement :

```sql
-- Vérifier l'état des migrations
SELECT * FROM "_prisma_migrations" ORDER BY started_at;

-- Marquer la migration comme appliquée (si elle était partiellement appliquée)
-- ATTENTION : À utiliser seulement si vous êtes sûr que la migration a échoué avant toute modification
DELETE FROM "_prisma_migrations" WHERE migration_name = '20250103014430_add_notifications';
```

Puis redéployez.

## ✅ Vérification

Après le renommage et le redéploiement, les migrations devraient s'appliquer dans le bon ordre :
1. ✅ Base de données créée
2. ✅ Tables initiales créées
3. ✅ Table `merchants` créée
4. ✅ Notifications créées (référence `merchants`)
5. ✅ Autres migrations...

---

**Note** : Ce problème survient souvent quand des migrations sont créées avec des timestamps incorrects. Assurez-vous toujours que les migrations dépendantes viennent après les migrations qui créent les dépendances.
