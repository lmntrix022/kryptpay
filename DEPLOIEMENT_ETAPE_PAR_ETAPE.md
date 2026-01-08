# 🚀 Guide de Déploiement sur Render - Étape par Étape

## 📋 Vue d'Ensemble

Nous allons déployer KryptPay sur Render en 8 étapes :
1. ✅ Préparation et vérification
2. 🌐 Créer un compte Render
3. 📦 Préparer le repository Git
4. 🔑 Générer les clés secrètes
5. 🗄️ Créer la base de données PostgreSQL
6. 🔴 Configurer Redis (Upstash)
7. 🚀 Déployer l'API Backend
8. 🎨 Déployer le Dashboard Frontend

---

## ✅ ÉTAPE 1 : Préparation et Vérification

### Objectif
Vérifier que tout est prêt avant de commencer le déploiement.

### Actions à effectuer

#### 1.1 Vérifier que le projet compile localement

```bash
# Dans le terminal, depuis le dossier du projet
cd /Users/valerie/Desktop/booh-pay

# Installer les dépendances (si ce n'est pas déjà fait)
npm install

# Générer Prisma Client
npm run prisma:generate

# Tester le build
npm run build
```

✅ **Vérification** : Vous devriez voir un dossier `dist/` créé sans erreur.

#### 1.2 Vérifier le Dashboard

```bash
# Aller dans le dossier dashboard
cd apps/dashboard

# Installer les dépendances
npm install

# Tester le build
npm run build
```

✅ **Vérification** : Vous devriez voir un dossier `.next/` créé sans erreur.

#### 1.3 Vérifier les fichiers de configuration

Vérifiez que ces fichiers existent :
- ✅ `render.yaml` (configuration Render)
- ✅ `RENDER_DEPLOYMENT.md` (guide complet)
- ✅ `.renderignore` (fichiers à exclure)
- ✅ `package.json` (à la racine)
- ✅ `apps/dashboard/package.json`

### Checklist Étape 1

- [ ] Projet backend compile sans erreur (`npm run build`)
- [ ] Dashboard compile sans erreur (`cd apps/dashboard && npm run build`)
- [ ] Tous les fichiers de configuration sont présents
- [ ] Aucune erreur TypeScript

**🎯 Une fois cette étape terminée, passez à l'Étape 2.**

---

## 🌐 ÉTAPE 2 : Créer un Compte Render

### Objectif
Créer un compte Render et se familiariser avec l'interface.

### Actions à effectuer

#### 2.1 Créer un compte Render

1. Allez sur https://render.com
2. Cliquez sur **"Get Started for Free"** ou **"Sign Up"**
3. Choisissez de vous inscrire avec :
   - **GitHub** (recommandé si votre code est sur GitHub)
   - **GitLab**
   - **Email** (si vous préférez)
4. Complétez votre profil (nom, organisation, etc.)

✅ **Vérification** : Vous devriez arriver sur le Dashboard Render.

#### 2.2 Comprendre l'interface Render

Dans le Dashboard, vous verrez :
- **Dashboard** : Vue d'ensemble de tous vos services
- **New +** : Bouton pour créer de nouveaux services
- **Account Settings** : Configuration du compte

### Checklist Étape 2

- [ ] Compte Render créé et validé
- [ ] Accès au Dashboard Render
- [ ] Email de confirmation reçu (si inscription par email)

**🎯 Une fois cette étape terminée, passez à l'Étape 3.**

---

## 📦 ÉTAPE 3 : Préparer le Repository Git

### Objectif
Assurer que votre code est sur un repository Git accessible depuis Render.

### Actions à effectuer

#### 3.1 Vérifier si un repository Git existe

```bash
cd /Users/valerie/Desktop/booh-pay

# Vérifier si Git est initialisé
git status
```

**Si Git n'est pas initialisé :**

```bash
# Initialiser Git
git init

# Ajouter tous les fichiers (sauf ceux dans .gitignore)
git add .

# Faire un premier commit
git commit -m "Initial commit: KryptPay project ready for Render deployment"
```

#### 3.2 Créer un repository sur GitHub/GitLab/Bitbucket

**Option A : GitHub (Recommandé)**

1. Allez sur https://github.com/new
2. Créez un nouveau repository :
   - **Name** : `kryptpay` (ou le nom de votre choix)
   - **Visibility** : Private (recommandé pour un projet commercial)
   - **Ne cochez PAS** "Initialize with README" (vous avez déjà des fichiers)
3. Cliquez sur **"Create repository"**

4. Connectez votre repository local :

```bash
# Ajouter le remote (remplacez USERNAME et REPO par vos valeurs)
git remote add origin https://github.com/USERNAME/kryptpay.git

# Pousser le code
git branch -M main
git push -u origin main
```

**Option B : GitLab**

1. Allez sur https://gitlab.com/projects/new
2. Créez un nouveau projet
3. Suivez les instructions pour connecter votre repository local

**Option C : Bitbucket**

1. Allez sur https://bitbucket.org/repo/create
2. Créez un nouveau repository
3. Suivez les instructions pour connecter votre repository local

### ⚠️ Important : Sécurité

**Assurez-vous que ces fichiers sont dans `.gitignore` et ne sont JAMAIS commités :**

- `.env`
- `.env.local`
- `*.log`
- `config/docker.env` (contient des secrets)

Vérifiez votre `.gitignore` :

```bash
cat .gitignore | grep -E "\.env|docker\.env"
```

### Checklist Étape 3

- [ ] Repository Git initialisé localement
- [ ] Repository créé sur GitHub/GitLab/Bitbucket
- [ ] Code poussé vers le remote
- [ ] Fichiers sensibles (`.env`, etc.) sont dans `.gitignore`
- [ ] Le fichier `render.yaml` est présent dans le repository

**🎯 Une fois cette étape terminée, passez à l'Étape 4.**

---

## 🔑 ÉTAPE 4 : Générer les Clés Secrètes

### Objectif
Générer toutes les clés secrètes nécessaires pour sécuriser l'application.

### Actions à effectuer

#### 4.1 Générer les clés secrètes

Ouvrez un terminal et exécutez ces commandes :

```bash
# 1. JWT Secret (pour l'authentification)
echo "JWT_SECRET=$(openssl rand -hex 32)"

# 2. Admin Token (pour les endpoints bootstrap)
echo "ADMIN_TOKEN=$(openssl rand -hex 32)"

# 3. Data Encryption Key (CRITIQUE : doit être exactement 32 bytes base64)
echo "DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)"
```

**⚠️ IMPORTANT** : Copiez ces valeurs dans un endroit sûr (ex: fichier texte temporaire, gestionnaire de mots de passe).

#### 4.2 Vérifier DATA_ENCRYPTION_KEY

La clé `DATA_ENCRYPTION_KEY` doit être **exactement 32 bytes (256 bits)** en base64.

Pour vérifier :

```bash
# Générer la clé
KEY=$(openssl rand -base64 32)

# Vérifier sa longueur (doit afficher 32)
echo -n "$KEY" | base64 -d | wc -c
```

✅ **Vérification** : La commande doit afficher `32`.

### Stockage des clés

Créez un fichier temporaire pour stocker ces clés (ne le commitez JAMAIS) :

```bash
cat > /tmp/kryptpay-render-keys.txt << EOF
# Clés pour le déploiement Render
# ⚠️ NE PAS COMMITER CE FICHIER

JWT_SECRET=<votre_jwt_secret>
ADMIN_TOKEN=<votre_admin_token>
DATA_ENCRYPTION_KEY=<votre_data_encryption_key>

# Ces clés seront utilisées dans l'Étape 7
EOF
```

### Checklist Étape 4

- [ ] JWT_SECRET généré et sauvegardé
- [ ] ADMIN_TOKEN généré et sauvegardé
- [ ] DATA_ENCRYPTION_KEY généré et vérifié (32 bytes)
- [ ] Toutes les clés sont sauvegardées de manière sécurisée
- [ ] Aucune clé n'a été commitée dans Git

**🎯 Une fois cette étape terminée, passez à l'Étape 5.**

---

## 🗄️ ÉTAPE 5 : Créer la Base de Données PostgreSQL

### Objectif
Créer la base de données PostgreSQL sur Render qui stockera toutes les données de l'application.

### Actions à effectuer

#### 5.1 Créer la base de données

1. Dans le Dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"PostgreSQL"**
3. Configurez la base de données :
   - **Name** : `kryptpay-db`
   - **Database** : `kryptpay`
   - **User** : `kryptpay`
   - **Region** : Choisissez la région la plus proche (ex: `Frankfurt`, `Oregon`, etc.)
   - **Plan** : **Starter** (gratuit pour commencer)
   - **PostgreSQL Version** : `16` (ou la version recommandée)
4. Cliquez sur **"Create Database"**

#### 5.2 Attendre le déploiement

Render va créer la base de données. Cela prend généralement **2-5 minutes**.

✅ **Vérification** : Vous devriez voir un statut "Available" (pastille verte).

#### 5.3 Notez les informations de connexion

Une fois créée, cliquez sur votre base de données pour voir :

- **Internal Database URL** : URL pour connexion depuis les services Render (sera utilisé automatiquement)
- **External Database URL** : URL pour connexion depuis votre machine locale (si besoin)

**Vous n'avez pas besoin de copier ces URLs maintenant** - Render les utilisera automatiquement via `DATABASE_URL` dans le `render.yaml`.

### Checklist Étape 5

- [ ] Base de données PostgreSQL créée sur Render
- [ ] Nom : `kryptpay-db`
- [ ] Statut : "Available" (pastille verte)
- [ ] Plan : Starter (ou supérieur)

**🎯 Une fois cette étape terminée, passez à l'Étape 6.**

---

## 🔴 ÉTAPE 6 : Configurer Redis (Upstash - Gratuit)

### Objectif
Configurer Redis pour les queues Bull et le cache. Nous utilisons Upstash (gratuit) plutôt que Render Redis (payant).

### Actions à effectuer

#### 6.1 Créer un compte Upstash

1. Allez sur https://upstash.com
2. Cliquez sur **"Sign Up"** ou **"Get Started"**
3. Créez un compte (GitHub ou Email)
4. Confirmez votre email si nécessaire

#### 6.2 Créer une base Redis

1. Dans le Dashboard Upstash, cliquez sur **"Create Database"**
2. Configurez :
   - **Name** : `kryptpay-redis`
   - **Type** : **Redis** (par défaut)
   - **Region** : Choisissez la même région que votre base PostgreSQL
   - **Tier** : **Free** (pour commencer)
   - **Primary Region** : Sélectionnez une région
3. Cliquez sur **"Create"**

#### 6.3 Récupérer les informations de connexion

Une fois créée, cliquez sur votre base Redis pour voir :

1. Onglet **"Details"** :
   - **UPSTASH_REDIS_REST_URL** : URL REST (pour certaines intégrations)
   - **UPSTASH_REDIS_REST_TOKEN** : Token REST

2. Onglet **"Redis CLI"** :
   - **Endpoint** : `xxx.upstash.io:6379`
   - **Password** : Mot de passe Redis

#### 6.4 Construire l'URL Redis

Vous avez deux options :

**Option A : Utiliser REDIS_URL (Recommandé)**

Construisez l'URL au format :
```
redis://default:PASSWORD@ENDPOINT:6379
```

Exemple :
```
redis://default:AbC123XyZ@kryptpay-abc123.upstash.io:6379
```

**Option B : Utiliser les variables séparées**

- `REDIS_HOST` : `xxx.upstash.io`
- `REDIS_PORT` : `6379`
- `REDIS_PASSWORD` : Le mot de passe

**Note** : L'application KryptPay supporte les deux formats.

### Sauvegarder les informations

Notez ces informations dans votre fichier temporaire :

```
REDIS_URL=redis://default:PASSWORD@ENDPOINT:6379
# OU
REDIS_HOST=xxx.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=xxx
```

### Checklist Étape 6

- [ ] Compte Upstash créé
- [ ] Base Redis créée (`kryptpay-redis`)
- [ ] Informations de connexion notées
- [ ] URL Redis construite (ou variables séparées)

**🎯 Une fois cette étape terminée, passez à l'Étape 7.**

---

## 🚀 ÉTAPE 7 : Déployer l'API Backend

### Objectif
Déployer le backend NestJS sur Render avec toutes les configurations nécessaires.

### Actions à effectuer

#### 7.1 Créer le service Web API

**Option A : Utiliser le Blueprint (Recommandé - Plus Rapide)**

1. Dans Render Dashboard, cliquez sur **"New +"**
2. Sélectionnez **"Blueprint"**
3. Connectez votre repository Git :
   - Sélectionnez **GitHub**, **GitLab**, ou **Bitbucket**
   - Autorisez Render à accéder à votre compte
   - Sélectionnez le repository `kryptpay`
4. Render détectera automatiquement le fichier `render.yaml`
5. Cliquez sur **"Apply"** pour créer tous les services

Render créera automatiquement :
- ✅ Service Web API (`kryptpay-api`)
- ✅ Service Web Dashboard (`kryptpay-dashboard`)
- ✅ Base de données (si pas déjà créée)

**Option B : Créer manuellement (Plus de contrôle)**

Si vous préférez créer manuellement :

1. Dans Render Dashboard, cliquez sur **"New +"**
2. Sélectionnez **"Web Service"**
3. Connectez votre repository Git
4. Configurez :
   - **Name** : `kryptpay-api`
   - **Region** : Même région que la base de données
   - **Branch** : `main` (ou `master`)
   - **Root Directory** : `/` (laisser vide)
   - **Runtime** : `Node`
   - **Build Command** : `npm ci && npm run prisma:generate && npm run build`
   - **Start Command** : `npm run prisma:migrate:deploy && node dist/main.js`
   - **Plan** : **Starter** (gratuit)

#### 7.2 Configurer les Variables d'Environnement

Dans la section **"Environment"** de votre service API, ajoutez ces variables :

**Variables automatiques (depuis render.yaml si vous utilisez Blueprint) :**
- `DATABASE_URL` - Rempli automatiquement depuis la base PostgreSQL
- `JWT_SECRET` - Généré automatiquement (mais vous pouvez le remplacer)
- `ADMIN_TOKEN` - Généré automatiquement (mais vous pouvez le remplacer)
- `DATA_ENCRYPTION_KEY` - Généré automatiquement (mais vous pouvez le remplacer)

**Variables à configurer manuellement :**

```bash
# Redis (depuis Upstash)
REDIS_URL=redis://default:PASSWORD@ENDPOINT:6379
# OU utilisez :
# REDIS_HOST=xxx.upstash.io
# REDIS_PORT=6379
# REDIS_PASSWORD=xxx

# JWT & Auth (utilisez les clés générées à l'Étape 4)
JWT_SECRET=<votre_jwt_secret_de_l_etape_4>
ADMIN_TOKEN=<votre_admin_token_de_l_etape_4>

# Encryption (CRITIQUE : la clé de l'Étape 4)
DATA_ENCRYPTION_KEY=<votre_data_encryption_key_de_l_etape_4>

# JWT Expiry
JWT_ACCESS_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800
PASSWORD_RESET_TOKEN_TTL=900

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Email (Resend)
EMAIL_ENABLED=true
EMAIL_PROVIDER=resend
EMAIL_FROM=noreply@kryptpay.io
RESEND_API_KEY=<votre_clé_resend>  # À obtenir depuis https://resend.com

# Stripe (depuis votre compte Stripe)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_REFRESH_URL=https://kryptpay-dashboard.onrender.com/connect/error
STRIPE_CONNECT_RETURN_URL=https://kryptpay-dashboard.onrender.com/connect/success

# Moneroo
MONEROO_SECRET_KEY=<votre_clé_moneroo>
MONEROO_WEBHOOK_SECRET=<votre_webhook_secret_moneroo>

# eBilling
EBILLING_USERNAME=<votre_username_ebilling>
EBILLING_SHARED_KEY=<votre_shared_key_ebilling>
EBILLING_BASE_URL=https://stg.billing-easy.com/api/v1/merchant
EBILLING_WEBHOOK_TOKEN=<votre_webhook_token_ebilling>

# SHAP
SHAP_BASE_URL=https://staging.billing-easy.net/shap/api/v1/merchant
SHAP_API_ID=<votre_shap_api_id>
SHAP_API_SECRET=<votre_shap_api_secret>
SHAP_WEBHOOK_TOKEN=<votre_shap_webhook_token>

# App URL (sera mis à jour après déploiement du dashboard)
APP_URL=https://kryptpay-dashboard.onrender.com
```

#### 7.3 Déployer

1. Cliquez sur **"Save Changes"** ou **"Create Web Service"**
2. Render commencera le déploiement
3. Suivez les logs en temps réel dans l'onglet **"Logs"**

#### 7.4 Vérifier le déploiement

Attendez que le déploiement se termine (5-10 minutes la première fois).

**Vérifications :**

1. **Logs** : Vérifiez qu'il n'y a pas d'erreurs dans les logs
2. **Health Check** : Allez sur `https://kryptpay-api.onrender.com/health`
   - ✅ Doit retourner `{"status":"ok"}`
3. **API Docs** : Allez sur `https://kryptpay-api.onrender.com/api`
   - ✅ Doit afficher la documentation Swagger

#### 7.5 Vérifier les migrations Prisma

Dans les logs, vous devriez voir :
```
Running Prisma migrations...
Prisma migrations completed successfully
```

Si les migrations échouent, consultez les logs pour voir l'erreur.

### Checklist Étape 7

- [ ] Service Web API créé sur Render
- [ ] Toutes les variables d'environnement configurées
- [ ] Déploiement réussi (pas d'erreurs dans les logs)
- [ ] Health check fonctionne (`/health`)
- [ ] Migrations Prisma exécutées avec succès
- [ ] API Docs accessible (`/api`)

**🎯 Une fois cette étape terminée, passez à l'Étape 8.**

---

## 🎨 ÉTAPE 8 : Déployer le Dashboard Frontend

### Objectif
Déployer le dashboard Next.js sur Render.

### Actions à effectuer

#### 8.1 Créer le service Web Dashboard

**Si vous avez utilisé Blueprint** : Le dashboard a déjà été créé ! Passez à 8.2.

**Si vous créez manuellement** :

1. Dans Render Dashboard, cliquez sur **"New +"**
2. Sélectionnez **"Web Service"**
3. Connectez le même repository Git
4. Configurez :
   - **Name** : `kryptpay-dashboard`
   - **Region** : Même région que l'API
   - **Branch** : `main` (ou `master`)
   - **Root Directory** : `apps/dashboard` ⚠️ **IMPORTANT**
   - **Runtime** : `Node`
   - **Build Command** : `npm ci && npm run build`
   - **Start Command** : `npm start`
   - **Plan** : **Starter** (gratuit)

#### 8.2 Configurer les Variables d'Environnement

Dans la section **"Environment"** du dashboard :

```bash
NODE_ENV=production
PORT=10000
NEXT_PUBLIC_API_BASE_URL=https://kryptpay-api.onrender.com/v1
```

⚠️ **IMPORTANT** : `NEXT_PUBLIC_API_BASE_URL` doit pointer vers votre API déployée.

#### 8.3 Déployer

1. Cliquez sur **"Save Changes"** ou **"Create Web Service"**
2. Render commencera le déploiement
3. Suivez les logs

#### 8.4 Vérifier le déploiement

Attendez que le déploiement se termine (5-10 minutes).

**Vérifications :**

1. **Logs** : Vérifiez qu'il n'y a pas d'erreurs
2. **Dashboard** : Allez sur `https://kryptpay-dashboard.onrender.com`
   - ✅ Doit afficher la page de login
3. **Connexion** : Essayez de vous connecter avec les identifiants créés plus tôt :
   - Email : `admin@kryptpay.io`
   - Password : `KryptPay2024!`

#### 8.5 Mettre à jour les URLs dans l'API

Maintenant que vous connaissez l'URL du dashboard, mettez à jour l'API :

1. Allez dans le service `kryptpay-api` sur Render
2. Dans **"Environment"**, mettez à jour :
   ```
   APP_URL=https://kryptpay-dashboard.onrender.com
   STRIPE_CONNECT_REFRESH_URL=https://kryptpay-dashboard.onrender.com/connect/error
   STRIPE_CONNECT_RETURN_URL=https://kryptpay-dashboard.onrender.com/connect/success
   ```
3. Redéployez l'API (ou attendez le prochain déploiement automatique)

### Checklist Étape 8

- [ ] Service Web Dashboard créé sur Render
- [ ] Variables d'environnement configurées
- [ ] Root Directory : `apps/dashboard`
- [ ] Déploiement réussi
- [ ] Dashboard accessible sur l'URL Render
- [ ] Page de login s'affiche
- [ ] URLs dans l'API mises à jour

**🎉 Félicitations ! Votre application est déployée !**

---

## ✅ Post-Déploiement

### Créer les Utilisateurs Initiaux

Si vous n'avez pas encore créé les utilisateurs, vous pouvez le faire via le script ou l'API :

**Via Script (en local avec connection à la base Render) :**
```bash
# Configurer DATABASE_URL vers la base Render
export DATABASE_URL="<external_database_url_from_render>"

# Exécuter le script
node_modules/.bin/ts-node scripts/create-kryptpay-users.ts
```

**Via API (recommandé) :**
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
```

### Configurer les Webhooks Stripe

1. Allez sur https://dashboard.stripe.com/test/webhooks
2. Cliquez sur **"Add endpoint"**
3. **Endpoint URL** : `https://kryptpay-api.onrender.com/v1/webhooks/stripe`
4. Sélectionnez les événements :
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.succeeded`
   - `charge.failed`
5. Copiez le **Signing Secret** et ajoutez-le à `STRIPE_WEBHOOK_SECRET` dans Render

---

## 🆘 Dépannage

### L'API ne démarre pas

1. Vérifiez les logs dans Render
2. Vérifiez que `DATABASE_URL` est correctement configuré
3. Vérifiez que `DATA_ENCRYPTION_KEY` est exactement 32 bytes base64

### Les migrations Prisma échouent

1. Vérifiez les logs pour voir l'erreur exacte
2. Vérifiez que la base PostgreSQL est accessible
3. Exécutez manuellement dans le Shell Render : `npm run prisma:migrate:deploy`

### Le dashboard ne peut pas se connecter à l'API

1. Vérifiez que `NEXT_PUBLIC_API_BASE_URL` est correct
2. Vérifiez les logs du dashboard pour les erreurs CORS
3. Vérifiez que l'API est bien démarrée (health check)

### Redis n'est pas accessible

1. Vérifiez que `REDIS_URL` ou les variables Redis sont correctes
2. Vérifiez que votre base Upstash est active
3. Vérifiez les logs pour les erreurs de connexion Redis

---

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Guide complet](./RENDER_DEPLOYMENT.md)
- [Analyse technique](./ANALYSE_DEPLOIEMENT_RENDER.md)

---

**🎯 Prêt à commencer ? Commencez par l'Étape 1 !**
