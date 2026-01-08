# 🚀 Guide de Déploiement sur Render

Ce guide vous explique comment déployer KryptPay sur Render.com.

## 📋 Prérequis

1. Un compte Render.com (gratuit disponible : https://render.com)
2. Les clés API de vos fournisseurs de paiement :
   - Stripe (Secret Key, Publishable Key, Webhook Secret)
   - Moneroo (Secret Key, Webhook Secret)
   - eBilling (Username, Shared Key)
   - SHAP (API ID, API Secret, Webhook Token)
3. Une clé API Resend pour les emails (https://resend.com)
4. Un service Redis (Upstash gratuit recommandé si vous ne voulez pas payer pour Redis sur Render)

## 🏗️ Architecture de Déploiement

Le projet sera déployé avec :
- **1 service web** : API Backend NestJS (`kryptpay-api`)
- **1 service web** : Dashboard Next.js (`kryptpay-dashboard`)
- **1 base de données** : PostgreSQL (`kryptpay-db`)
- **1 service Redis** : Pour les queues Bull (Upstash recommandé, ou Render Redis)

## 📝 Étapes de Déploiement

### 1. Préparer le Repository

Assurez-vous que votre code est pushé sur GitHub/GitLab/Bitbucket, car Render se connecte directement depuis votre repository Git.

### 2. Créer les Services sur Render

#### Option A : Utiliser le fichier `render.yaml` (Recommandé)

1. Connectez-vous à Render et allez dans **Dashboard** → **New** → **Blueprint**
2. Connectez votre repository Git
3. Render détectera automatiquement le fichier `render.yaml`
4. Cliquez sur **Apply** pour créer tous les services

#### Option B : Créer les services manuellement

##### 2.1. Base de données PostgreSQL

1. **Dashboard** → **New** → **PostgreSQL**
2. Nom : `kryptpay-db`
3. Plan : **Starter** (gratuit avec limitations)
4. Database : `kryptpay`
5. User : `kryptpay`
6. Notez la **Connection String** (sera utilisée automatiquement)

##### 2.2. Service Redis (ou utiliser Upstash)

**Option 1 : Upstash Redis (Recommandé - Gratuit)**

1. Créez un compte sur https://upstash.com
2. Créez une nouvelle base Redis
3. Notez l'**UPSTASH_REDIS_REST_URL** et **UPSTASH_REDIS_REST_TOKEN**

Dans Render, ajoutez ces variables :
- `UPSTASH_REDIS_REST_URL` (de Upstash)
- `UPSTASH_REDIS_REST_TOKEN` (de Upstash)

Puis modifiez la connexion Redis dans le code pour utiliser Upstash REST API si nécessaire.

**Option 2 : Render Redis**

1. **Dashboard** → **New** → **Redis**
2. Nom : `kryptpay-redis`
3. Plan : **Starter** (payant, ~$7/mois minimum)

##### 2.3. Service Web - API Backend

1. **Dashboard** → **New** → **Web Service**
2. Connectez votre repository Git
3. Configuration :
   - **Name** : `kryptpay-api`
   - **Environment** : `Node`
   - **Build Command** : `npm ci && npm run prisma:generate && npm run build`
   - **Start Command** : `npm run prisma:migrate:deploy && node dist/main.js`
   - **Plan** : Starter (gratuit)

4. **Environment Variables** (dans la section "Environment") :
   
   **Variables générées automatiquement** (via render.yaml ou à configurer manuellement) :
   ```bash
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<auto-filled from database>
   REDIS_URL=<auto-filled from redis service, or set manually>
   
   # JWT & Auth
   JWT_SECRET=<generate a strong random string>
   JWT_ACCESS_EXPIRES_IN=900
   JWT_REFRESH_EXPIRES_IN=604800
   PASSWORD_RESET_TOKEN_TTL=900
   ADMIN_TOKEN=<generate a strong random string>
   
   # Encryption Key (MUST be exactly 32 bytes base64)
   # Generate with: openssl rand -base64 32
   DATA_ENCRYPTION_KEY=<generate with openssl rand -base64 32>
   
   # Rate Limiting
   THROTTLE_TTL=60000
   THROTTLE_LIMIT=100
   
   # Email
   EMAIL_ENABLED=true
   EMAIL_PROVIDER=resend
   EMAIL_FROM=noreply@kryptpay.io
   RESEND_API_KEY=<your-resend-api-key>
   
   # Stripe
   STRIPE_SECRET_KEY=<your-stripe-secret-key>
   STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
   STRIPE_WEBHOOK_SECRET=<your-stripe-webhook-secret>
   STRIPE_CONNECT_REFRESH_URL=https://kryptpay-dashboard.onrender.com/connect/error
   STRIPE_CONNECT_RETURN_URL=https://kryptpay-dashboard.onrender.com/connect/success
   
   # Moneroo
   MONEROO_SECRET_KEY=<your-moneroo-secret-key>
   MONEROO_WEBHOOK_SECRET=<your-moneroo-webhook-secret>
   
   # eBilling
   EBILLING_USERNAME=<your-ebilling-username>
   EBILLING_SHARED_KEY=<your-ebilling-shared-key>
   EBILLING_BASE_URL=https://stg.billing-easy.com/api/v1/merchant
   EBILLING_WEBHOOK_TOKEN=<your-ebilling-webhook-token>
   
   # SHAP
   SHAP_BASE_URL=https://staging.billing-easy.net/shap/api/v1/merchant
   SHAP_API_ID=<your-shap-api-id>
   SHAP_API_SECRET=<your-shap-api-secret>
   SHAP_WEBHOOK_TOKEN=<your-shap-webhook-token>
   
   # App URL (for email links)
   APP_URL=https://kryptpay-dashboard.onrender.com
   ```

##### 2.4. Service Web - Dashboard Next.js

1. **Dashboard** → **New** → **Web Service**
2. Connectez le même repository Git
3. Configuration :
   - **Name** : `kryptpay-dashboard`
   - **Root Directory** : `apps/dashboard`
   - **Environment** : `Node`
   - **Build Command** : `npm ci && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : Starter (gratuit)

4. **Environment Variables** :
   ```bash
   NODE_ENV=production
   PORT=10000
   NEXT_PUBLIC_API_BASE_URL=https://kryptpay-api.onrender.com/v1
   ```

### 3. Générer les Clés Secrètes

Pour générer les clés secrètes nécessaires, utilisez ces commandes :

```bash
# JWT Secret (256 bits)
openssl rand -hex 32

# Admin Token (256 bits)
openssl rand -hex 32

# Data Encryption Key (32 bytes base64 - IMPORTANT : doit être exactement 32 bytes)
openssl rand -base64 32
```

### 4. Exécuter les Migrations Prisma

Les migrations s'exécutent automatiquement via la commande `npm run prisma:migrate:deploy` dans le start command.

Si vous devez les exécuter manuellement, vous pouvez utiliser le Shell de Render :
1. Ouvrez votre service API dans Render
2. Cliquez sur **Shell**
3. Exécutez : `npm run prisma:migrate:deploy`

### 5. Créer les Utilisateurs Initiaux

Après le déploiement, créez les utilisateurs admin et marchand :

```bash
# Connectez-vous via SSH ou utilisez Render Shell
node_modules/.bin/ts-node scripts/create-kryptpay-users.ts
```

Ou créez-les via l'API :

```bash
# Créer un admin
curl -X POST https://kryptpay-api.onrender.com/v1/internal/users \
  -H "x-admin-token: <VOTRE_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kryptpay.io",
    "password": "KryptPay2024!",
    "role": "ADMIN"
  }'

# Créer un marchand (nécessite d'avoir créé un merchant d'abord)
curl -X POST https://kryptpay-api.onrender.com/v1/admin/merchants \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "KryptPay", "apiKeyLabel": "default"}'

# Notez le merchantId, puis créez l'utilisateur
curl -X POST https://kryptpay-api.onrender.com/v1/internal/users \
  -H "x-admin-token: <VOTRE_ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "contact@kryptpay.io",
    "password": "KryptPay2024!",
    "role": "MERCHANT",
    "merchantId": "<MERCHANT_ID>"
  }'
```

## 🔧 Configuration Post-Déploiement

### 1. Configurer les Webhooks Stripe

1. Allez dans le Dashboard Stripe → **Developers** → **Webhooks**
2. Ajoutez un endpoint : `https://kryptpay-api.onrender.com/v1/webhooks/stripe`
3. Sélectionnez les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.succeeded`
   - `charge.failed`
4. Copiez le **Signing Secret** et ajoutez-le à `STRIPE_WEBHOOK_SECRET` dans Render

### 2. Configurer les Domaines Personnalisés (Optionnel)

1. Dans Render, pour chaque service web :
   - Allez dans **Settings** → **Custom Domains**
   - Ajoutez votre domaine (ex: `api.kryptpay.com`, `app.kryptpay.com`)
   - Configurez les DNS selon les instructions Render

2. Mettez à jour les variables d'environnement :
   - `STRIPE_CONNECT_REFRESH_URL` et `STRIPE_CONNECT_RETURN_URL`
   - `APP_URL`
   - `NEXT_PUBLIC_API_BASE_URL`

### 3. Configurer le Monitoring

Render fournit automatiquement :
- Logs en temps réel
- Métriques (CPU, Memory, Request Rate)
- Alertes par email

Vous pouvez également accéder à :
- **Health Check** : `https://kryptpay-api.onrender.com/health`
- **Metrics** : `https://kryptpay-api.onrender.com/metrics`
- **API Docs** : `https://kryptpay-api.onrender.com/api`

## 🚨 Dépannage

### Les migrations échouent

1. Vérifiez que `DATABASE_URL` est correctement configuré
2. Vérifiez les logs du service API dans Render
3. Exécutez manuellement : `npm run prisma:migrate:deploy` dans le Shell

### Le dashboard ne peut pas se connecter à l'API

1. Vérifiez que `NEXT_PUBLIC_API_BASE_URL` pointe vers l'URL correcte de l'API
2. Vérifiez les logs du dashboard
3. Vérifiez que l'API est bien démarrée (logs du service API)

### Redis n'est pas accessible

1. Si vous utilisez Upstash, vérifiez les variables `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
2. Si vous utilisez Render Redis, vérifiez que `REDIS_URL` est correctement configuré
3. Les services Render Redis sont accessibles uniquement depuis les autres services Render

### Build échoue

1. Vérifiez les logs de build dans Render
2. Assurez-vous que toutes les dépendances sont dans `package.json`
3. Vérifiez que Node.js version est compatible (requis: >=20.11.0)

## 📊 Coûts Estimés (Plan Starter)

- **PostgreSQL** : Gratuit (avec limitations)
- **Web Services (x2)** : Gratuits (avec limitations - peuvent s'endormir après inactivité)
- **Redis** : Optionnel
  - Render Redis : ~$7/mois minimum
  - Upstash Redis : Gratuit jusqu'à 10K requêtes/jour
- **Total** : **Gratuit** avec plan Starter (pour développement/test)

Pour la production, considérez les plans payants pour éviter que les services s'endorment.

## 🔗 URLs par Défaut

Après le déploiement :
- **API** : `https://kryptpay-api.onrender.com`
- **Dashboard** : `https://kryptpay-dashboard.onrender.com`
- **API Docs** : `https://kryptpay-api.onrender.com/api`
- **Health Check** : `https://kryptpay-api.onrender.com/health`

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Render Pricing](https://render.com/pricing)
- [Upstash Redis](https://upstash.com)
- [Resend Email](https://resend.com)
