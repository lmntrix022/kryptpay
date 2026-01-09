# 🚀 Étape Suivante : Déployer sur Render

Maintenant que votre code est sur GitHub sans secrets, passons au déploiement sur Render.

## ✅ Vérifications Préalables

Assurez-vous que :
- ✅ Code pushé sur GitHub sans erreurs
- ✅ Clés secrètes générées dans `.render-keys/`
- ✅ Fichier `render.yaml` présent à la racine

## 🎯 Prochaines Actions

### Étape 1 : Créer un Compte Render (si pas déjà fait)

1. Allez sur **https://render.com**
2. Cliquez sur **"Get Started for Free"**
3. Inscrivez-vous avec **GitHub** (recommandé pour faciliter la connexion)
4. Autorisez Render à accéder à votre compte GitHub
5. Vérifiez votre email si nécessaire

### Étape 2 : Déployer avec Blueprint (Recommandé)

**C'est la méthode la plus simple et la plus rapide :**

1. Dans le **Dashboard Render**, cliquez sur **"New +"** en haut à droite
2. Sélectionnez **"Blueprint"** dans le menu
3. Connectez votre repository Git :
   - Choisissez **"GitHub"** (si pas déjà connecté)
   - Autorisez Render à accéder à votre compte GitHub
   - Sélectionnez le repository **`kryptpay`** (ou le nom de votre repo)
4. Render détectera automatiquement le fichier `render.yaml`
5. Vous verrez un aperçu des services à créer :
   - ✅ **kryptpay-db** (PostgreSQL)
   - ✅ **kryptpay-api** (Backend API)
   - ✅ **kryptpay-dashboard** (Frontend Dashboard)
6. Cliquez sur **"Apply"** pour créer tous les services

**⏱️ Temps estimé :** 5-10 minutes pour le premier déploiement

### Étape 3 : Attendre le Déploiement

Render va :
1. Créer la base de données PostgreSQL
2. Cloner votre repository Git
3. Installer les dépendances
4. Construire les services
5. Déployer l'application

**Surveillez les logs** pour voir la progression :
- Dashboard → Service → **Logs**

### Étape 4 : Configurer les Variables d'Environnement

Une fois les services créés, configurez les variables d'environnement :

#### 📍 Service API (`kryptpay-api`) → Environment

**1. Clés secrètes (depuis `.render-keys/`) :**

Dans votre terminal local :
```bash
# Afficher les clés (pour les copier)
cat .render-keys/jwt-secret.txt
cat .render-keys/admin-token.txt
cat .render-keys/data-encryption-key.txt
```

Dans Render Dashboard :
- Allez dans `kryptpay-api` → **Environment**
- Ajoutez ces variables :
  - `JWT_SECRET` = (valeur depuis jwt-secret.txt)
  - `ADMIN_TOKEN` = (valeur depuis admin-token.txt)
  - `DATA_ENCRYPTION_KEY` = (valeur depuis data-encryption-key.txt)

**2. Redis (Upstash - Gratuit) :**

Créez un compte Upstash pour Redis gratuit :
1. Allez sur **https://upstash.com**
2. Créez un compte (gratuit)
3. Créez une nouvelle base Redis
4. Notez les informations de connexion :
   - **REST URL** : `https://xxx.upstash.io`
   - **REST TOKEN** : `xxxxx`

Dans Render, ajoutez :
- `REDIS_URL` = (URL complète depuis Upstash)
  - Format : `redis://default:TOKEN@HOST:6379`
- OU utilisez les variables séparées :
  - `REDIS_HOST` = (host depuis Upstash)
  - `REDIS_PORT` = `6379`
  - `REDIS_PASSWORD` = (token depuis Upstash)

**3. Email (Resend) :**

Créez un compte Resend pour les emails :
1. Allez sur **https://resend.com**
2. Créez un compte (gratuit avec limitations)
3. Générez une API Key
4. Ajoutez dans Render :
   - `RESEND_API_KEY` = (votre clé API Resend)
   - `EMAIL_ENABLED` = `true`
   - `EMAIL_PROVIDER` = `resend`
   - `EMAIL_FROM` = `noreply@kryptpay.io` (ou votre domaine)

**4. URLs (À configurer après le déploiement du dashboard) :**

Une fois le dashboard déployé, mettez à jour :
- `APP_URL` = `https://kryptpay-dashboard.onrender.com`
- `STRIPE_CONNECT_RETURN_URL` = `https://kryptpay-dashboard.onrender.com/connect/success`
- `STRIPE_CONNECT_REFRESH_URL` = `https://kryptpay-dashboard.onrender.com/connect/error`

**5. Providers de Paiement (Optionnel - pour plus tard) :**

Vous pouvez configurer ces variables maintenant ou plus tard :
- Stripe, Moneroo, eBilling, SHAP
- Voir `DEPLOIEMENT_RAPIDE.md` pour les détails

#### 📍 Service Dashboard (`kryptpay-dashboard`) → Environment

**Variables minimales :**
- `NODE_ENV` = `production`
- `PORT` = `10000`
- `NEXT_PUBLIC_API_BASE_URL` = `https://kryptpay-api.onrender.com/v1`

### Étape 5 : Vérifier le Déploiement

**1. Vérifier l'API Backend :**
```bash
curl https://kryptpay-api.onrender.com/health
```
Devrait retourner : `{"status":"ok"}`

**2. Vérifier le Dashboard Frontend :**
- Ouvrez https://kryptpay-dashboard.onrender.com
- La page de login devrait s'afficher

**3. Vérifier les Logs :**
- Dashboard Render → Service → **Logs**
- Vérifiez qu'il n'y a pas d'erreurs critiques
- Les migrations Prisma devraient s'être exécutées automatiquement

### Étape 6 : Première Connexion

1. Utilisez les credentials par défaut :
   - **Email** : `admin@kryptpay.io`
   - **Mot de passe** : `KryptPay2024!`

2. Si cela ne fonctionne pas, vous devrez créer un utilisateur admin :
   - Voir la section "Créer un utilisateur admin" dans `DEPLOIEMENT_ETAPE_PAR_ETAPE.md`

## 🔧 Configuration Post-Déploiement

### Créer un Utilisateur Admin

Si vous n'avez pas encore d'utilisateur, créez-en un via l'API :

```bash
# Appeler l'endpoint de création d'admin
curl -X POST https://kryptpay-api.onrender.com/v1/admin/bootstrap \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@kryptpay.io",
    "password": "KryptPay2024!",
    "adminToken": "VOTRE_ADMIN_TOKEN_DEPUIS_RENDER"
  }'
```

### Configurer les Webhooks

Une fois l'API déployée, configurez les webhooks dans vos providers :

1. **Stripe** :
   - URL : `https://kryptpay-api.onrender.com/v1/webhooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`

2. **Moneroo** :
   - URL : `https://kryptpay-api.onrender.com/v1/webhooks/moneroo`

3. **eBilling** :
   - URL : `https://kryptpay-api.onrender.com/v1/webhooks/ebilling`

## 📊 Monitoring

- **Logs** : Render Dashboard → Service → Logs
- **Métriques** : Render Dashboard → Service → Metrics
- **Base de données** : Render Dashboard → Database → Metrics

## 🆘 Problèmes Courants

### Le build échoue
- Vérifiez les logs pour les erreurs
- Vérifiez que toutes les variables d'environnement sont configurées
- Vérifiez que `package.json` contient tous les scripts nécessaires

### L'API ne démarre pas
- Vérifiez `DATABASE_URL` (doit être rempli automatiquement)
- Vérifiez les migrations Prisma dans les logs
- Vérifiez que les variables d'environnement obligatoires sont présentes

### Le dashboard ne se connecte pas à l'API
- Vérifiez `NEXT_PUBLIC_API_BASE_URL` dans le dashboard
- Vérifiez que l'API est accessible : `curl https://kryptpay-api.onrender.com/health`
- Vérifiez les CORS dans les logs de l'API

## 📚 Ressources

- **Guide rapide** : `DEPLOIEMENT_RAPIDE.md`
- **Guide complet** : `DEPLOIEMENT_ETAPE_PAR_ETAPE.md`
- **Checklist** : `CHECKLIST_DEPLOIEMENT_RENDER.md`
- **Documentation Render** : https://render.com/docs

---

**🎯 Action Immédiate :**
1. Créez un compte Render (si pas déjà fait)
2. Déployez avec Blueprint
3. Configurez les variables d'environnement
4. Vérifiez que tout fonctionne

**Bonne chance avec le déploiement ! 🚀**
