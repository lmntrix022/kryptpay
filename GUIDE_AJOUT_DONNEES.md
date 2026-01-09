# 📊 Guide Complet - Ajouter des Données Réelles

## 🎯 Objectif

Ajouter des utilisateurs, marchands et données réelles à votre application déployée sur Render.

## 📋 Étape 1 : Obtenir ADMIN_TOKEN

1. **Render Dashboard** → **kryptpay-api** → **Environment**
2. Cherchez `ADMIN_TOKEN` dans la liste
3. Cliquez sur l'icône 👁️ pour révéler la valeur
4. **Copiez-la** (vous en aurez besoin)

**Note** : Si `ADMIN_TOKEN` n'existe pas, il sera généré automatiquement par Render (grâce à `generateValue: true` dans `render.yaml`).

## 🚀 Étape 2 : Créer un Utilisateur ADMIN

### Option A : Script Node.js (Simple)

```bash
cd /Users/valerie/Desktop/booh-pay

# Définir ADMIN_TOKEN
export ADMIN_TOKEN='votre_token_ici'

# Exécuter le script
node scripts/create-admin.js
```

Le script vous demandera :
- Email de l'admin
- Mot de passe

### Option B : Script Shell

```bash
export ADMIN_TOKEN='votre_token_ici'
./scripts/create-admin-user.sh
```

### Option C : Via curl (Manuel)

```bash
curl -X POST https://kryptpay-api.onrender.com/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: VOTRE_ADMIN_TOKEN" \
  -d '{
    "email": "admin@boohpay.com",
    "password": "VotreMotDePasse123!",
    "role": "ADMIN"
  }'
```

**Réponse attendue** :
```json
{
  "id": "user-id-here",
  "email": "admin@boohpay.com",
  "role": "ADMIN",
  "merchant_id": null
}
```

## 🚀 Étape 3 : Créer des Marchands

### Option A : Script Node.js

```bash
export ADMIN_TOKEN='votre_token_ici'
node scripts/create-merchant.js "Bööh" "Clé API Production"
```

### Option B : Via curl

```bash
curl -X POST https://kryptpay-api.onrender.com/internal/merchants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: VOTRE_ADMIN_TOKEN" \
  -d '{
    "name": "Bööh",
    "apiKeyLabel": "Clé API Production"
  }'
```

**Réponse attendue** :
```json
{
  "merchant_id": "merchant-id-here",
  "apiKey": "bpk_live_..."
}
```

**⚠️ IMPORTANT** : Sauvegardez l'`apiKey` retournée, elle ne sera plus affichée !

## 🚀 Étape 4 : Créer des Utilisateurs Marchands

```bash
curl -X POST https://kryptpay-api.onrender.com/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: VOTRE_ADMIN_TOKEN" \
  -d '{
    "email": "merchant@boohpay.com",
    "password": "VotreMotDePasse123!",
    "role": "MERCHANT",
    "merchantId": "merchant-id-from-step-3"
  }'
```

## 📋 Checklist Complète

### ✅ Configuration Initiale

- [ ] Obtenir `ADMIN_TOKEN` depuis Render Dashboard
- [ ] Créer un utilisateur ADMIN
- [ ] Tester la connexion au dashboard : https://kryptpay-dashboard.onrender.com/login

### ✅ Création des Marchands

- [ ] Créer au moins un marchand
- [ ] Sauvegarder l'API Key générée (dans un gestionnaire de mots de passe)
- [ ] Noter le `merchant_id`

### ✅ Création des Utilisateurs

- [ ] Créer des utilisateurs avec le rôle `MERCHANT`
- [ ] Associer chaque utilisateur à un `merchant_id`

### ✅ Configuration des Providers

- [ ] Configurer Stripe (clés API dans Render Dashboard)
- [ ] Configurer Moneroo (clés API dans Render Dashboard)
- [ ] Configurer eBilling (si nécessaire)
- [ ] Configurer SHAP (si nécessaire)

### ✅ Test

- [ ] Tester la connexion au dashboard
- [ ] Tester la création d'un paiement
- [ ] Vérifier les webhooks

## 🔑 Endpoints Disponibles

### Endpoints Internes (avec ADMIN_TOKEN)

- `POST /internal/users` - Créer un utilisateur
- `POST /internal/merchants` - Créer un marchand

**Header requis** : `x-admin-token: VOTRE_ADMIN_TOKEN`

### Endpoints Admin (avec JWT après connexion)

- `POST /v1/admin/users` - Créer un utilisateur (nécessite JWT + rôle ADMIN)
- `POST /v1/admin/merchants` - Créer un marchand (nécessite JWT + rôle ADMIN)

## 📝 Exemple Complet en Une Commande

```bash
# Définir les variables
export ADMIN_TOKEN='votre_token_ici'
export API_URL='https://kryptpay-api.onrender.com'

# 1. Créer un admin
curl -X POST $API_URL/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"email":"admin@boohpay.com","password":"Admin123!","role":"ADMIN"}'

# 2. Créer un marchand et récupérer l'ID
MERCHANT_RESPONSE=$(curl -s -X POST $API_URL/internal/merchants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"name":"Bööh","apiKeyLabel":"Production"}')

MERCHANT_ID=$(echo $MERCHANT_RESPONSE | jq -r '.merchant_id')
API_KEY=$(echo $MERCHANT_RESPONSE | jq -r '.apiKey')

echo "✅ Marchand créé: $MERCHANT_ID"
echo "🔑 API Key: $API_KEY"

# 3. Créer un utilisateur marchand
curl -X POST $API_URL/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d "{\"email\":\"merchant@boohpay.com\",\"password\":\"Merchant123!\",\"role\":\"MERCHANT\",\"merchantId\":\"$MERCHANT_ID\"}"
```

## 🔐 Sécurité

- ⚠️ **Ne partagez jamais** `ADMIN_TOKEN` publiquement
- ⚠️ **Utilisez des mots de passe forts** (min 8 caractères, majuscules, minuscules, chiffres)
- ⚠️ **Sauvegardez les API Keys** dans un gestionnaire de mots de passe
- ⚠️ **Limitez l'accès** aux endpoints `/internal/*` (protégés par `ADMIN_TOKEN`)

## ✅ Vérification

### Vérifier dans PostgreSQL

Connectez-vous à PostgreSQL Render et exécutez :

```sql
-- Voir tous les utilisateurs
SELECT id, email, role, merchant_id, created_at 
FROM users 
ORDER BY created_at DESC;

-- Voir tous les marchands
SELECT id, name, created_at 
FROM merchants 
ORDER BY created_at DESC;

-- Voir les clés API
SELECT id, label, merchant_id, created_at, last_used_at 
FROM api_keys 
ORDER BY created_at DESC;
```

### Tester la Connexion

1. Allez sur : https://kryptpay-dashboard.onrender.com/login
2. Utilisez l'email et mot de passe créés
3. Vous devriez être connecté en tant qu'ADMIN

---

**💡 Astuce** : Utilisez les scripts fournis (`scripts/create-admin.js` et `scripts/create-merchant.js`) pour automatiser le processus !
