# 📊 Analyse du Projet pour Déploiement sur Render

## 🎯 Vue d'Ensemble du Projet

**KryptPay** est une plateforme d'orchestration de paiements hybrides avec :
- **Backend API** : NestJS (Node.js 22, TypeScript)
- **Dashboard Frontend** : Next.js 14 (React 18)
- **Base de données** : PostgreSQL 16 (via Prisma ORM)
- **Cache/Queue** : Redis (pour Bull queues et cache)
- **SDK Package** : Package TypeScript pour intégration marchands

## 📁 Structure du Projet

```
booh-pay/
├── src/                    # Backend NestJS
│   ├── modules/           # Modules métier (payments, webhooks, etc.)
│   ├── auth/              # Authentification JWT
│   ├── common/            # Services partagés (Redis, cache, etc.)
│   └── main.ts            # Point d'entrée
├── apps/
│   └── dashboard/         # Frontend Next.js
│       ├── app/           # Pages Next.js (App Router)
│       ├── components/    # Composants React
│       └── package.json   # Dépendances du dashboard
├── packages/
│   └── boohpay-sdk/       # SDK TypeScript
├── prisma/
│   └── schema.prisma      # Schéma de base de données
├── scripts/               # Scripts utilitaires
└── package.json           # Dépendances racine (backend)

```

## 🔍 Analyse des Dépendances

### Backend (Racine)
- **Node.js** : >=20.11.0 (requis)
- **Frameworks** : NestJS 10, Express
- **Base de données** : Prisma Client, PostgreSQL (pg)
- **Cache/Queue** : ioredis, Bull
- **Autres** : bcrypt, JWT, Stripe SDK, etc.

### Frontend Dashboard
- **Framework** : Next.js 14, React 18
- **Styling** : Tailwind CSS
- **Animations** : Framer Motion
- **Dépendances minimales** : Aucune dépendance backend

## ⚙️ Configuration Nécessaire

### Variables d'Environnement Backend

**Base de données & Cache**
- `DATABASE_URL` : Connection string PostgreSQL
- `REDIS_URL` : Connection string Redis (ou `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`)

**Authentification & Sécurité**
- `JWT_SECRET` : Secret pour signer les tokens JWT
- `ADMIN_TOKEN` : Token pour endpoints bootstrap
- `DATA_ENCRYPTION_KEY` : Clé de 32 bytes (base64) pour chiffrer les credentials

**Providers de Paiement**
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `MONEROO_SECRET_KEY`, `MONEROO_WEBHOOK_SECRET`
- `EBILLING_USERNAME`, `EBILLING_SHARED_KEY`, `EBILLING_WEBHOOK_TOKEN`
- `SHAP_API_ID`, `SHAP_API_SECRET`, `SHAP_WEBHOOK_TOKEN`

**Notifications**
- `RESEND_API_KEY` : Pour les emails via Resend
- `EMAIL_FROM`, `EMAIL_ENABLED`

**Rate Limiting**
- `THROTTLE_TTL`, `THROTTLE_LIMIT`

### Variables d'Environnement Frontend

- `NEXT_PUBLIC_API_BASE_URL` : URL de l'API backend (ex: `https://kryptpay-api.onrender.com/v1`)

## 🏗️ Architecture de Déploiement Recommandée

### Option 1 : Déploiement Complet (Recommandé)

```
┌─────────────────────┐
│  Render PostgreSQL  │
│   (kryptpay-db)     │
└─────────────────────┘
          │
          ▼
┌─────────────────────┐
│   Render Web API    │
│  (kryptpay-api)     │◄───┐
│  NestJS Backend     │    │
└─────────────────────┘    │
          │                │
          ▼                │
┌─────────────────────┐    │
│   Upstash Redis     │    │
│  (Free Tier OK)     │    │
└─────────────────────┘    │
          │                │
          ▼                │
┌─────────────────────┐    │
│ Render Web Dashboard│    │
│ (kryptpay-dashboard)│────┘
│  Next.js Frontend   │
└─────────────────────┘
```

**Services nécessaires :**
1. **Web Service API** : Backend NestJS
2. **Web Service Dashboard** : Frontend Next.js
3. **PostgreSQL Database** : Base de données principale
4. **Redis** : Upstash (gratuit) ou Render Redis (payant)

### Option 2 : Architecture Alternative

Si vous voulez utiliser Render Redis au lieu d'Upstash :
- Remplacer Upstash par un service Redis Render
- Modifier `render.yaml` pour inclure le service Redis
- Note : Render Redis est payant (~$7/mois minimum)

## 📋 Checklist de Déploiement

### Pré-déploiement
- [ ] Repository Git prêt (GitHub/GitLab/Bitbucket)
- [ ] Toutes les clés API des providers obtenues
- [ ] Clé API Resend obtenue
- [ ] Compte Render créé

### Configuration Render
- [ ] Base de données PostgreSQL créée
- [ ] Service Redis configuré (Upstash ou Render)
- [ ] Service Web API créé et configuré
- [ ] Service Web Dashboard créé et configuré
- [ ] Variables d'environnement configurées

### Post-déploiement
- [ ] Migrations Prisma exécutées
- [ ] Utilisateurs initiaux créés (admin, merchant)
- [ ] Webhooks Stripe configurés
- [ ] Tests de connexion dashboard ↔ API
- [ ] Health checks fonctionnels

## 🚀 Commandes de Build/Start

### Backend API
```bash
# Build
npm ci
npm run prisma:generate
npm run build

# Start (avec migrations)
npm run prisma:migrate:deploy
node dist/main.js
```

### Frontend Dashboard
```bash
# Build
cd apps/dashboard
npm ci
npm run build

# Start
npm start
```

## 🔒 Sécurité

### Clés à Générer

```bash
# JWT Secret (256 bits)
openssl rand -hex 32

# Admin Token (256 bits)
openssl rand -hex 32

# Data Encryption Key (32 bytes base64 - CRITIQUE : doit être exactement 32 bytes)
openssl rand -base64 32
```

⚠️ **IMPORTANT** : `DATA_ENCRYPTION_KEY` doit être exactement 32 bytes (256 bits) après décodage base64.

### Secrets à Ne Jamais Commit

- Toutes les clés API (Stripe, Moneroo, etc.)
- JWT_SECRET
- ADMIN_TOKEN
- DATA_ENCRYPTION_KEY
- RESEND_API_KEY
- Tous les tokens webhook

Utilisez les variables d'environnement dans Render (marquées `sync: false` dans `render.yaml`).

## 💰 Coûts Estimés

### Plan Gratuit (Starter - Développement/Test)
- **PostgreSQL** : Gratuit (512MB RAM, 1GB storage)
- **Web Services (x2)** : Gratuits (s'endorment après 15min d'inactivité)
- **Redis** : Upstash gratuit (10K requêtes/jour)
- **Total** : **$0/mois**

### Plan Production (Recommandé)
- **PostgreSQL** : Starter ($7/mois) ou Standard ($20/mois)
- **Web Services** : Starter ($7/mois chacun) = $14/mois
- **Redis** : Upstash Pro ($10/mois) ou Render Redis ($7/mois)
- **Total** : **~$31-41/mois**

## ⚠️ Limitations du Plan Gratuit

1. **Services Web** :
   - S'endorment après 15 minutes d'inactivité
   - Premier démarrage peut prendre 30-60 secondes
   - 750 heures/heure par mois (suffisant pour test)

2. **PostgreSQL** :
   - 512MB RAM
   - 1GB storage
   - Pas de backups automatiques

3. **Upstash Redis Free** :
   - 10K commandes/jour
   - 256MB storage

## 🎯 Points d'Attention

### 1. Build du Dashboard
Le dashboard est dans `apps/dashboard/` et a son propre `package.json`. 
- Render doit être configuré avec **Root Directory** : `apps/dashboard`
- Ou utiliser la commande build : `cd apps/dashboard && npm ci && npm run build`

### 2. Migrations Prisma
Les migrations doivent s'exécuter automatiquement au démarrage via :
```bash
npm run prisma:migrate:deploy && node dist/main.js
```

### 3. Redis Connection
L'application supporte deux formats :
- `REDIS_URL` : URL complète (ex: `redis://user:pass@host:port`)
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` : Configuration séparée

### 4. CORS
Le backend a `app.enableCors()`, mais vérifiez que le dashboard peut communiquer avec l'API.

### 5. Health Checks
- Backend : `/health` (configuré dans `render.yaml`)
- Dashboard : `/` (page d'accueil)

## 📚 Ressources Créées

Les fichiers suivants ont été créés pour faciliter le déploiement :

1. **`render.yaml`** : Configuration Blueprint Render (déploiement automatique)
2. **`RENDER_DEPLOYMENT.md`** : Guide détaillé pas-à-pas
3. **`.renderignore`** : Fichiers à exclure du déploiement
4. **`scripts/render-build.sh`** : Script de build optimisé

## ✅ Prochaines Étapes

1. Lire le guide `RENDER_DEPLOYMENT.md`
2. Créer les services sur Render (via Blueprint ou manuellement)
3. Configurer les variables d'environnement
4. Déployer et tester
5. Créer les utilisateurs initiaux
6. Configurer les webhooks Stripe

## 🔗 URLs Attendues

Après déploiement :
- **API** : `https://kryptpay-api.onrender.com`
- **Dashboard** : `https://kryptpay-dashboard.onrender.com`
- **API Docs** : `https://kryptpay-api.onrender.com/api`
- **Health** : `https://kryptpay-api.onrender.com/health`
