# 🚀 Guide Rapide de Déploiement Render - KryptPay

Ce guide vous permet de déployer rapidement KryptPay sur Render en suivant les étapes essentielles.

## ⚡ Démarrage Rapide

### 1️⃣ Générer les Clés Secrètes

```bash
# Exécuter le script de préparation
./scripts/prepare-render-deployment.sh

# Les clés seront sauvegardées dans .render-keys/
# ⚠️ NE COMMITEZ JAMAIS ce dossier !
```

**Résultat attendu :**
- ✅ JWT_SECRET généré
- ✅ ADMIN_TOKEN généré  
- ✅ DATA_ENCRYPTION_KEY généré (32 bytes)

### 2️⃣ Préparer le Repository Git

```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Créer le premier commit
git commit -m "Initial commit: KryptPay ready for Render"

# Créer un repository sur GitHub/GitLab/Bitbucket
# Puis connecter :
git remote add origin https://github.com/VOTRE_USERNAME/kryptpay.git
git branch -M main
git push -u origin main
```

### 3️⃣ Créer un Compte Render

1. Allez sur https://render.com
2. Cliquez sur **"Get Started for Free"**
3. Inscrivez-vous avec GitHub (recommandé) ou email
4. Vérifiez votre email si nécessaire

### 4️⃣ Déployer avec Blueprint (Recommandé)

**Méthode la plus simple :**

1. Dans Render Dashboard → **"New +"** → **"Blueprint"**
2. Connectez votre repository Git (GitHub/GitLab/Bitbucket)
3. Sélectionnez le repository `kryptpay`
4. Render détectera automatiquement `render.yaml`
5. Cliquez sur **"Apply"**

Render créera automatiquement :
- ✅ Base de données PostgreSQL (`kryptpay-db`)
- ✅ Service Web API (`kryptpay-api`)
- ✅ Service Web Dashboard (`kryptpay-dashboard`)

### 5️⃣ Configurer les Variables d'Environnement

Après le déploiement du Blueprint, allez dans chaque service pour configurer les variables :

#### Service API (`kryptpay-api`)

**Variables depuis .render-keys/ :**
```bash
# Copiez ces valeurs depuis .render-keys/
JWT_SECRET=<depuis jwt-secret.txt>
ADMIN_TOKEN=<depuis admin-token.txt>
DATA_ENCRYPTION_KEY=<depuis data-encryption-key.txt>
```

**Variables à configurer manuellement :**

1. **Redis (Upstash - Gratuit recommandé)**
   - Créez un compte sur https://upstash.com
   - Créez une base Redis
   - Ajoutez dans Render :
     ```
     REDIS_URL=redis://default:PASSWORD@ENDPOINT:6379
     ```
   - OU utilisez les variables séparées :
     ```
     REDIS_HOST=xxx.upstash.io
     REDIS_PORT=6379
     REDIS_PASSWORD=xxx
     ```

2. **Email (Resend)**
   - Créez un compte sur https://resend.com
   - Obtenez votre API Key
   - Ajoutez :
     ```
     RESEND_API_KEY=re_xxxxx
     EMAIL_ENABLED=true
     EMAIL_PROVIDER=resend
     EMAIL_FROM=noreply@kryptpay.io
     ```

3. **Stripe (Optionnel - pour les paiements)**
   ```
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

4. **Moneroo (Optionnel)**
   ```
   MONEROO_SECRET_KEY=xxxxx
   MONEROO_WEBHOOK_SECRET=xxxxx
   ```

5. **eBilling (Optionnel)**
   ```
   EBILLING_USERNAME=xxxxx
   EBILLING_SHARED_KEY=xxxxx
   ```

6. **SHAP (Optionnel - pour les payouts)**
   ```
   SHAP_API_ID=xxxxx
   SHAP_API_SECRET=xxxxx
   ```

7. **URLs (À configurer après déploiement du dashboard)**
   ```
   APP_URL=https://kryptpay-dashboard.onrender.com
   STRIPE_CONNECT_RETURN_URL=https://kryptpay-dashboard.onrender.com/connect/success
   STRIPE_CONNECT_REFRESH_URL=https://kryptpay-dashboard.onrender.com/connect/error
   ```

#### Service Dashboard (`kryptpay-dashboard`)

**Variables minimales :**
```
NODE_ENV=production
PORT=10000
NEXT_PUBLIC_API_BASE_URL=https://kryptpay-api.onrender.com/v1
```

### 6️⃣ Vérifier le Déploiement

#### API Backend
```bash
# Health check
curl https://kryptpay-api.onrender.com/health

# Devrait retourner : {"status":"ok"}
```

#### Dashboard Frontend
- Ouvrez https://kryptpay-dashboard.onrender.com
- La page de login devrait s'afficher

### 7️⃣ Première Connexion

1. Utilisez les credentials créés avec le script `create-kryptpay-users.ts` :
   - **Admin** : `admin@kryptpay.io` / `KryptPay2024!`
   - **Merchant** : `contact@kryptpay.io` / `KryptPay2024!`

2. Connectez-vous au dashboard

3. Configurez vos providers de paiement dans les paramètres

## 🔧 Configuration Post-Déploiement

### Webhooks

Configurez les webhooks dans vos providers :

1. **Stripe**
   - URL : `https://kryptpay-api.onrender.com/v1/webhooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, etc.

2. **Moneroo**
   - URL : `https://kryptpay-api.onrender.com/v1/webhooks/moneroo`

3. **eBilling**
   - URL : `https://kryptpay-api.onrender.com/v1/webhooks/ebilling`

### Migrations Prisma

Les migrations sont automatiquement exécutées au démarrage grâce à :
```bash
npm run prisma:migrate:deploy
```

Si vous devez les exécuter manuellement :
```bash
# Dans Render Dashboard → Service API → Shell
npm run prisma:migrate:deploy
```

## 📊 Monitoring

### Logs
- **API** : Render Dashboard → `kryptpay-api` → Logs
- **Dashboard** : Render Dashboard → `kryptpay-dashboard` → Logs

### Métriques
- **API** : Render Dashboard → `kryptpay-api` → Metrics
- **Database** : Render Dashboard → `kryptpay-db` → Metrics

## 🆘 Dépannage

### Le build échoue
1. Vérifiez les logs dans Render Dashboard
2. Vérifiez que `package.json` contient tous les scripts nécessaires
3. Vérifiez que Prisma Client est généré : `npm run prisma:generate`

### L'API ne démarre pas
1. Vérifiez les variables d'environnement (surtout DATABASE_URL)
2. Vérifiez les logs pour les erreurs de connexion
3. Vérifiez que les migrations Prisma sont exécutées

### Le dashboard ne se connecte pas à l'API
1. Vérifiez `NEXT_PUBLIC_API_BASE_URL` dans le dashboard
2. Vérifiez que l'API est accessible : `curl https://kryptpay-api.onrender.com/health`
3. Vérifiez les CORS dans l'API

### Erreur de connexion à la base de données
1. Vérifiez `DATABASE_URL` dans les variables d'environnement
2. Vérifiez que la base de données est "Available" (pastille verte)
3. Vérifiez les logs de la base de données

## 📚 Ressources

- **Guide complet** : `DEPLOIEMENT_ETAPE_PAR_ETAPE.md`
- **Checklist** : `CHECKLIST_DEPLOIEMENT_RENDER.md`
- **Analyse technique** : `ANALYSE_DEPLOIEMENT_RENDER.md`
- **Documentation Render** : https://render.com/docs

## ✅ Checklist Rapide

- [ ] Clés secrètes générées (`./scripts/prepare-render-deployment.sh`)
- [ ] Repository Git créé et pushé
- [ ] Compte Render créé
- [ ] Blueprint déployé (ou services créés manuellement)
- [ ] Variables d'environnement configurées
- [ ] API accessible (`/health`)
- [ ] Dashboard accessible
- [ ] Connexion fonctionnelle
- [ ] Webhooks configurés

---

**🎉 Félicitations !** Votre application KryptPay est maintenant déployée sur Render.
