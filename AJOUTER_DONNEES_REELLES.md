# 📊 Guide - Ajouter des Données Réelles à l'Application Déployée

## 🎯 Objectif

Ajouter des utilisateurs, marchands et données réelles à votre application déployée sur Render.

## 📋 Prérequis

1. **ADMIN_TOKEN** : Obtenez-le depuis Render Dashboard
   - Render Dashboard → **kryptpay-api** → **Environment**
   - Copiez la valeur de `ADMIN_TOKEN`

2. **API URL** : `https://kryptpay-api.onrender.com`

## 🚀 Méthode 1 : Script Automatique (Recommandé)

### Créer un Utilisateur ADMIN

```bash
cd /Users/valerie/Desktop/booh-pay

# Obtenez ADMIN_TOKEN depuis Render Dashboard
export ADMIN_TOKEN='votre_admin_token_ici'

# Exécutez le script
chmod +x scripts/create-admin-user.sh
./scripts/create-admin-user.sh
```

Le script vous demandera :
- Email de l'admin
- Mot de passe

### Créer des Données Complètes (Admin + Marchands + Utilisateurs)

```bash
export ADMIN_TOKEN='votre_admin_token_ici'
export API_URL='https://kryptpay-api.onrender.com'

chmod +x scripts/seed-production-data.sh
./scripts/seed-production-data.sh
```

## 🚀 Méthode 2 : Via les Endpoints API

### 1. Créer un Utilisateur ADMIN

```bash
curl -X POST https://kryptpay-api.onrender.com/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: VOTRE_ADMIN_TOKEN" \
  -d '{
    "email": "admin@example.com",
    "password": "VotreMotDePasse123!",
    "role": "ADMIN"
  }'
```

**Réponse** :
```json
{
  "id": "user-id-here",
  "email": "admin@example.com",
  "role": "ADMIN",
  "merchant_id": null
}
```

### 2. Créer un Marchand

```bash
curl -X POST https://kryptpay-api.onrender.com/internal/merchants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: VOTRE_ADMIN_TOKEN" \
  -d '{
    "name": "Mon Marchand",
    "apiKeyLabel": "Clé API Production"
  }'
```

**Réponse** :
```json
{
  "merchant_id": "merchant-id-here",
  "apiKey": "bpk_live_..."
}
```

**⚠️ Important** : Sauvegardez l'`apiKey` retournée, elle ne sera plus affichée !

### 3. Créer un Utilisateur Marchand

```bash
curl -X POST https://kryptpay-api.onrender.com/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: VOTRE_ADMIN_TOKEN" \
  -d '{
    "email": "merchant@example.com",
    "password": "VotreMotDePasse123!",
    "role": "MERCHANT",
    "merchantId": "merchant-id-from-step-2"
  }'
```

## 🚀 Méthode 3 : Via le Dashboard (Après connexion)

Une fois connecté en tant qu'ADMIN :

1. **Créer des marchands** :
   - Dashboard → **Merchants** → **+ Nouveau Marchand**
   - Ou via API : `POST /v1/admin/merchants` (avec JWT token)

2. **Créer des utilisateurs** :
   - Dashboard → **Users** → **+ Nouveau Utilisateur**
   - Ou via API : `POST /v1/admin/users` (avec JWT token)

## 📋 Checklist Complète

### Étape 1 : Créer l'Utilisateur ADMIN

- [ ] Obtenir `ADMIN_TOKEN` depuis Render Dashboard
- [ ] Créer un utilisateur ADMIN via script ou API
- [ ] Tester la connexion au dashboard

### Étape 2 : Créer des Marchands

- [ ] Créer au moins un marchand
- [ ] Sauvegarder l'API Key générée
- [ ] Noter le `merchant_id`

### Étape 3 : Créer des Utilisateurs Marchands

- [ ] Créer des utilisateurs avec le rôle `MERCHANT`
- [ ] Associer chaque utilisateur à un `merchant_id`

### Étape 4 : Configurer les Providers

- [ ] Configurer Stripe (clés API)
- [ ] Configurer Moneroo (clés API)
- [ ] Configurer eBilling (si nécessaire)
- [ ] Configurer SHAP (si nécessaire)

### Étape 5 : Tester

- [ ] Tester la connexion au dashboard
- [ ] Tester la création d'un paiement
- [ ] Vérifier les webhooks

## 🔑 Obtenir ADMIN_TOKEN

1. **Render Dashboard** → **kryptpay-api** → **Environment**
2. Cherchez `ADMIN_TOKEN` dans la liste
3. Cliquez sur l'icône pour révéler la valeur
4. Copiez-la

**Note** : Si `ADMIN_TOKEN` n'existe pas, il sera généré automatiquement par Render lors du déploiement (grâce à `generateValue: true` dans `render.yaml`).

## 🔐 Sécurité

- ⚠️ **Ne partagez jamais** `ADMIN_TOKEN` publiquement
- ⚠️ **Utilisez des mots de passe forts** (min 8 caractères, majuscules, minuscules, chiffres)
- ⚠️ **Limitez l'accès** aux endpoints `/internal/*` (protégés par `ADMIN_TOKEN`)

## 📝 Exemple Complet

```bash
# 1. Définir les variables
export ADMIN_TOKEN='votre_token_ici'
export API_URL='https://kryptpay-api.onrender.com'

# 2. Créer un admin
curl -X POST $API_URL/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"email":"admin@boohpay.com","password":"Admin123!","role":"ADMIN"}'

# 3. Créer un marchand
MERCHANT_RESPONSE=$(curl -s -X POST $API_URL/internal/merchants \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"name":"Bööh","apiKeyLabel":"Production"}')

MERCHANT_ID=$(echo $MERCHANT_RESPONSE | jq -r '.merchant_id')
API_KEY=$(echo $MERCHANT_RESPONSE | jq -r '.apiKey')

echo "Marchand créé: $MERCHANT_ID"
echo "API Key: $API_KEY"

# 4. Créer un utilisateur marchand
curl -X POST $API_URL/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d "{\"email\":\"merchant@boohpay.com\",\"password\":\"Merchant123!\",\"role\":\"MERCHANT\",\"merchantId\":\"$MERCHANT_ID\"}"
```

## ✅ Vérification

Après avoir créé les données :

1. **Vérifier dans PostgreSQL** :
   ```sql
   SELECT * FROM users;
   SELECT * FROM merchants;
   ```

2. **Tester la connexion** :
   - Dashboard : https://kryptpay-dashboard.onrender.com/login
   - Utilisez l'email et mot de passe créés

---

**💡 Astuce** : Utilisez les scripts fournis pour automatiser le processus !
