# ✅ Checklist de Déploiement Render - KryptPay

Utilisez cette checklist pour suivre votre progression dans le déploiement.

## 📋 Préparation

- [ ] **Étape 1.1**: Projet backend compile sans erreur
  ```bash
  npm run build
  ```
- [ ] **Étape 1.2**: Dashboard compile sans erreur
  ```bash
  cd apps/dashboard && npm run build
  ```
- [ ] **Étape 1.3**: Fichiers de configuration présents
  - [ ] `render.yaml` existe
  - [ ] `.renderignore` existe
  - [ ] `package.json` à la racine
  - [ ] `apps/dashboard/package.json` existe

## 🌐 Compte Render

- [ ] **Étape 2.1**: Compte Render créé
  - [ ] Inscription complétée
  - [ ] Email vérifié (si applicable)
  - [ ] Accès au Dashboard Render

## 📦 Repository Git

- [ ] **Étape 3.1**: Repository Git initialisé
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  ```
- [ ] **Étape 3.2**: Repository créé sur GitHub/GitLab/Bitbucket
  - [ ] Repository créé
  - [ ] Code pushé sur le repository distant
  - [ ] Repository connecté à Render

## 🔑 Clés Secrètes

- [ ] **Étape 4.1**: Clés secrètes générées
  ```bash
  ./scripts/prepare-render-deployment.sh
  ```
- [ ] **Étape 4.2**: Clés sauvegardées de manière sécurisée
  - [ ] JWT_SECRET généré
  - [ ] ADMIN_TOKEN généré
  - [ ] DATA_ENCRYPTION_KEY généré et vérifié (32 bytes)
  - [ ] Clés stockées dans `.render-keys/` (ne pas commiter)

## 🗄️ Base de Données

- [ ] **Étape 5.1**: Base de données PostgreSQL créée sur Render
  - [ ] Nom: `kryptpay-db`
  - [ ] Database: `kryptpay`
  - [ ] User: `kryptpay`
  - [ ] Plan: Starter (gratuit)
  - [ ] Statut: Available (pastille verte)
- [ ] **Étape 5.2**: Connection String notée
  - [ ] DATABASE_URL disponible dans le Dashboard Render

## 🔴 Redis

- [ ] **Étape 6.1**: Service Redis configuré
  - [ ] Option A: Upstash Redis créé (recommandé - gratuit)
    - [ ] UPSTASH_REDIS_REST_URL noté
    - [ ] UPSTASH_REDIS_REST_TOKEN noté
  - [ ] Option B: Render Redis créé (payant)
    - [ ] REDIS_URL disponible dans le Dashboard Render

## 🚀 API Backend

- [ ] **Étape 7.1**: Service Web API créé sur Render
  - [ ] Nom: `kryptpay-api`
  - [ ] Repository Git connecté
  - [ ] Build Command: `npm ci && npm run prisma:generate && npm run build`
  - [ ] Start Command: `npm run prisma:migrate:deploy && node dist/main.js`
  - [ ] Plan: Starter (gratuit)
- [ ] **Étape 7.2**: Variables d'environnement configurées
  - [ ] NODE_ENV=production
  - [ ] PORT=10000
  - [ ] DATABASE_URL (auto-rempli depuis la DB)
  - [ ] REDIS_URL (ou UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
  - [ ] JWT_SECRET (depuis .render-keys/)
  - [ ] ADMIN_TOKEN (depuis .render-keys/)
  - [ ] DATA_ENCRYPTION_KEY (depuis .render-keys/)
  - [ ] EMAIL_PROVIDER=resend
  - [ ] RESEND_API_KEY (à configurer)
  - [ ] STRIPE_SECRET_KEY (à configurer)
  - [ ] STRIPE_PUBLISHABLE_KEY (à configurer)
  - [ ] STRIPE_WEBHOOK_SECRET (à configurer)
  - [ ] MONEROO_SECRET_KEY (à configurer)
  - [ ] EBILLING_USERNAME (à configurer)
  - [ ] EBILLING_SHARED_KEY (à configurer)
  - [ ] SHAP_API_ID (à configurer)
  - [ ] SHAP_API_SECRET (à configurer)
  - [ ] APP_URL (à configurer après déploiement du dashboard)
- [ ] **Étape 7.3**: Service déployé avec succès
  - [ ] Build réussi
  - [ ] Migrations Prisma exécutées
  - [ ] Service accessible sur https://kryptpay-api.onrender.com
  - [ ] Health check: https://kryptpay-api.onrender.com/health

## 🎨 Dashboard Frontend

- [ ] **Étape 8.1**: Service Web Dashboard créé sur Render
  - [ ] Nom: `kryptpay-dashboard`
  - [ ] Repository Git connecté
  - [ ] Root Directory: `apps/dashboard`
  - [ ] Build Command: `npm ci && npm run build`
  - [ ] Start Command: `npm start`
  - [ ] Plan: Starter (gratuit)
- [ ] **Étape 8.2**: Variables d'environnement configurées
  - [ ] NODE_ENV=production
  - [ ] PORT=10000
  - [ ] NEXT_PUBLIC_API_BASE_URL=https://kryptpay-api.onrender.com/v1
- [ ] **Étape 8.3**: Service déployé avec succès
  - [ ] Build réussi
  - [ ] Service accessible sur https://kryptpay-dashboard.onrender.com
  - [ ] Dashboard fonctionnel

## ✅ Tests Post-Déploiement

- [ ] **Test 1**: API Health Check
  ```bash
  curl https://kryptpay-api.onrender.com/health
  ```
- [ ] **Test 2**: Dashboard accessible
  - [ ] Ouvrir https://kryptpay-dashboard.onrender.com
  - [ ] Page de login s'affiche
- [ ] **Test 3**: Connexion API
  - [ ] Tester l'endpoint `/v1/auth/login` avec les credentials admin
- [ ] **Test 4**: Base de données
  - [ ] Vérifier que les migrations Prisma sont appliquées
  - [ ] Vérifier que les tables existent

## 🔧 Configuration Finale

- [ ] **Config 1**: Mettre à jour APP_URL dans l'API
  - [ ] APP_URL=https://kryptpay-dashboard.onrender.com
- [ ] **Config 2**: Configurer les webhooks
  - [ ] Stripe webhook URL: https://kryptpay-api.onrender.com/v1/webhooks/stripe
  - [ ] Moneroo webhook URL: https://kryptpay-api.onrender.com/v1/webhooks/moneroo
  - [ ] eBilling webhook URL: https://kryptpay-api.onrender.com/v1/webhooks/ebilling
- [ ] **Config 3**: Configurer les URLs de redirection Stripe Connect
  - [ ] STRIPE_CONNECT_RETURN_URL=https://kryptpay-dashboard.onrender.com/connect/success
  - [ ] STRIPE_CONNECT_REFRESH_URL=https://kryptpay-dashboard.onrender.com/connect/error

## 🎉 Déploiement Terminé

- [ ] Tous les services sont opérationnels
- [ ] Les tests passent
- [ ] Les webhooks sont configurés
- [ ] Les emails fonctionnent
- [ ] Les paiements peuvent être traités

---

**📝 Notes:**
- Sauvegardez cette checklist et cochez les cases au fur et à mesure
- En cas de problème, consultez `DEPLOIEMENT_ETAPE_PAR_ETAPE.md` pour les détails
- Les logs Render sont disponibles dans le Dashboard → Service → Logs
