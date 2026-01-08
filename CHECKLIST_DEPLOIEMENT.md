# ✅ Checklist de Déploiement Render - Suivez votre Progression

Cochez chaque étape au fur et à mesure :

## 📋 Étape 1 : Préparation et Vérification
- [ ] Projet backend compile (`npm run build` fonctionne)
- [ ] Dashboard compile (`cd apps/dashboard && npm run build` fonctionne)
- [ ] Tous les fichiers de configuration sont présents
- [ ] Lecture du guide [DEPLOIEMENT_ETAPE_PAR_ETAPE.md](./DEPLOIEMENT_ETAPE_PAR_ETAPE.md)

## 🌐 Étape 2 : Créer un Compte Render
- [ ] Compte Render créé sur https://render.com
- [ ] Email confirmé (si inscription par email)
- [ ] Accès au Dashboard Render confirmé

## 📦 Étape 3 : Préparer le Repository Git
- [ ] Repository Git initialisé localement (`git init` fait)
- [ ] Repository créé sur GitHub/GitLab/Bitbucket
- [ ] Code poussé vers le remote (`git push`)
- [ ] Vérifié que `.env` et `config/docker.env` sont dans `.gitignore`
- [ ] `render.yaml` est présent dans le repository

## 🔑 Étape 4 : Générer les Clés Secrètes
- [ ] `JWT_SECRET` généré et sauvegardé
- [ ] `ADMIN_TOKEN` généré et sauvegardé
- [ ] `DATA_ENCRYPTION_KEY` généré et vérifié (32 bytes)
- [ ] Toutes les clés sauvegardées de manière sécurisée

## 🗄️ Étape 5 : Créer la Base de Données PostgreSQL
- [ ] Base PostgreSQL créée sur Render (`kryptpay-db`)
- [ ] Nom, database, user configurés
- [ ] Statut "Available" (pastille verte)
- [ ] Plan Starter (ou supérieur) sélectionné

## 🔴 Étape 6 : Configurer Redis (Upstash)
- [ ] Compte Upstash créé sur https://upstash.com
- [ ] Base Redis créée (`kryptpay-redis`)
- [ ] Informations de connexion récupérées
- [ ] URL Redis construite (ou variables séparées)

## 🚀 Étape 7 : Déployer l'API Backend
- [ ] Service Web API créé (`kryptpay-api`)
- [ ] Repository Git connecté
- [ ] Variables d'environnement configurées :
  - [ ] `DATABASE_URL` (auto-rempli)
  - [ ] `REDIS_URL` (depuis Upstash)
  - [ ] `JWT_SECRET`, `ADMIN_TOKEN`, `DATA_ENCRYPTION_KEY`
  - [ ] Clés Stripe, Moneroo, eBilling, SHAP
  - [ ] `RESEND_API_KEY`
- [ ] Build réussi (pas d'erreurs dans les logs)
- [ ] Health check fonctionne : `/health`
- [ ] Migrations Prisma exécutées avec succès
- [ ] API Docs accessible : `/api`

## 🎨 Étape 8 : Déployer le Dashboard Frontend
- [ ] Service Web Dashboard créé (`kryptpay-dashboard`)
- [ ] Root Directory configuré : `apps/dashboard`
- [ ] Variables d'environnement configurées :
  - [ ] `NEXT_PUBLIC_API_BASE_URL`
- [ ] Build réussi
- [ ] Dashboard accessible sur l'URL Render
- [ ] Page de login s'affiche
- [ ] URLs dans l'API mises à jour (`APP_URL`, `STRIPE_CONNECT_*`)

## ✅ Post-Déploiement
- [ ] Utilisateurs initiaux créés (admin@kryptpay.io, contact@kryptpay.io)
- [ ] Connexion au dashboard testée avec succès
- [ ] Webhooks Stripe configurés
- [ ] Tests de base effectués (création de paiement, etc.)

## 🎉 Félicitations !
- [ ] Toutes les étapes terminées
- [ ] Application fonctionnelle en production
- [ ] Documentation consultée si besoin

---

**📚 Guides disponibles :**
- [Guide Étape par Étape](./DEPLOIEMENT_ETAPE_PAR_ETAPE.md) - **COMMENCEZ ICI**
- [Guide Complet](./RENDER_DEPLOYMENT.md) - Référence détaillée
- [Analyse Technique](./ANALYSE_DEPLOIEMENT_RENDER.md) - Informations techniques
