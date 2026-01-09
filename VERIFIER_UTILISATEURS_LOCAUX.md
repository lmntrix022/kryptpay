# 🔍 Vérifier les Utilisateurs dans la Base de Données Docker Locale

## 📋 Informations de Connexion

D'après `docker-compose.yml` :
- **User** : `boohpay`
- **Password** : `boohpay`
- **Database** : `boohpay`
- **Port** : `5432`

## 🚀 Méthode 1 : Script Automatique

```bash
cd /Users/valerie/Desktop/booh-pay

# Vérifier que Docker est démarré
docker-compose ps

# Si PostgreSQL n'est pas démarré
docker-compose up -d postgres

# Exécuter le script
./scripts/check-local-db.sh
```

## 🚀 Méthode 2 : Connexion Manuelle

### Option A : Via Docker Exec

```bash
# Trouver le nom du conteneur
docker ps --filter "name=postgres"

# Se connecter à PostgreSQL
docker exec -it booh-pay-postgres-1 psql -U boohpay -d boohpay
```

Puis exécutez ces requêtes SQL :

```sql
-- Voir tous les utilisateurs
SELECT 
    id,
    email,
    role,
    merchant_id,
    created_at
FROM users
ORDER BY created_at DESC;

-- Compter les utilisateurs par rôle
SELECT 
    role,
    COUNT(*) as count
FROM users
GROUP BY role;

-- Voir les marchands
SELECT 
    id,
    name,
    created_at
FROM merchants
ORDER BY created_at DESC;

-- Voir les clés API
SELECT 
    id,
    label,
    merchant_id,
    created_at,
    last_used_at,
    status
FROM api_keys
ORDER BY created_at DESC;
```

### Option B : Via psql Local (si installé)

```bash
psql -h localhost -p 5432 -U boohpay -d boohpay
```

Mot de passe : `boohpay`

## 📊 Ce que Vous Verrez

Le script affichera :
- ✅ **Tous les utilisateurs** avec leur email, rôle, et marchand associé
- ✅ **Statistiques** : nombre d'utilisateurs par rôle
- ✅ **Marchands** : tous les marchands créés
- ✅ **Clés API** : toutes les clés API générées
- ✅ **Transactions** : les 5 dernières transactions (si existantes)

## 🔍 Différence : Local vs Production

| Base de Données | Où ? | Utilisateurs |
|----------------|------|--------------|
| **Docker Local** | Votre machine | Utilisateurs de développement/test |
| **PostgreSQL Render** | Render.com | Utilisateurs de production |

**⚠️ Important** : Les utilisateurs dans Docker local sont **différents** de ceux sur Render. Ce sont deux bases de données séparées.

## 📋 Migrer les Utilisateurs Locaux vers Production

Si vous voulez migrer des utilisateurs de votre base locale vers Render :

1. **Exporter depuis Docker local** :
   ```bash
   docker exec booh-pay-postgres-1 pg_dump -U boohpay -d boohpay -t users > users_export.sql
   ```

2. **Importer vers Render** :
   - Connectez-vous à PostgreSQL Render
   - Exécutez le script SQL exporté

**⚠️ Attention** : Assurez-vous que les `merchant_id` existent aussi dans la base Render !

---

**💡 Astuce** : Utilisez le script `./scripts/check-local-db.sh` pour un affichage formaté.
