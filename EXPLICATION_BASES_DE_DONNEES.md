# 📊 Explication des Bases de Données - PostgreSQL vs Redis

## 🔍 Différence Principale

### PostgreSQL (Base de Données Principale) ✅
**C'est ICI que sont stockés vos utilisateurs et toutes les données permanentes.**

- ✅ **Utilisateurs** (`users` table)
- ✅ **Marchands** (`merchants` table)
- ✅ **Transactions** (`transactions` table)
- ✅ **Paiements** (`payouts` table)
- ✅ **Abonnements** (`subscriptions` table)
- ✅ **Clés API** (`api_keys` table)
- ✅ **Toutes les données métier**

**Base de données** : PostgreSQL sur Render (`kryptpay-db`)

### Redis (Cache et Queues) ⚡
**Redis ne stocke PAS vos utilisateurs. C'est un cache temporaire et un système de queues.**

Redis est utilisé pour :
1. **Cache** (données temporaires pour améliorer les performances)
   - Cache des requêtes fréquentes
   - Cache des taux de change
   - Cache des configurations
   - **⚠️ Données temporaires qui peuvent être supprimées**

2. **Queues** (tâches en arrière-plan)
   - Queue pour l'envoi de webhooks
   - Queue pour les notifications
   - **⚠️ Données temporaires de traitement**

3. **Rate Limiting** (limitation de débit)
   - Compteurs de requêtes
   - **⚠️ Données temporaires**

## 📋 Où sont Stockés les Utilisateurs ?

### ✅ PostgreSQL - Table `users`

```sql
CREATE TABLE "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "merchant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL
);
```

**Tous vos utilisateurs sont dans PostgreSQL**, pas dans Redis.

## 🔍 Vérifier vos Utilisateurs

Pour voir vos utilisateurs dans PostgreSQL sur Render :

1. **Connectez-vous à PostgreSQL Render** :
   - Render Dashboard → **kryptpay-db** → **Connect**
   - Copiez la commande de connexion

2. **Exécutez cette requête** :
   ```sql
   SELECT id, email, role, merchant_id, created_at 
   FROM users 
   ORDER BY created_at DESC;
   ```

## ⚠️ Important

- **Redis est vide au démarrage** - C'est normal, il se remplit au fur et à mesure de l'utilisation
- **Redis peut être vidé** - Les données sont temporaires et peuvent être supprimées sans perte
- **PostgreSQL contient toutes vos données** - C'est la source de vérité

## 🎯 Résumé

| Type de Données | Où ? | Permanent ? |
|----------------|------|--------------|
| **Utilisateurs** | PostgreSQL | ✅ Oui |
| **Transactions** | PostgreSQL | ✅ Oui |
| **Marchands** | PostgreSQL | ✅ Oui |
| **Cache** | Redis | ❌ Non (temporaire) |
| **Queues** | Redis | ❌ Non (temporaire) |
| **Rate Limiting** | Redis | ❌ Non (temporaire) |

---

**💡 Conclusion** : Vos utilisateurs sont dans **PostgreSQL**, pas dans Redis. Redis est vide au démarrage et se remplit avec des données temporaires (cache, queues) pendant l'utilisation.
