# BoohPay – Hybrid Payment Orchestration

## Vision

BoohPay fournit une API unique permettant de router et d’orchestrer des paiements entre Moneroo et Stripe. L’objectif MVP est de couvrir les paiements entrants (mobile money & carte), la mise à jour du statut via webhooks et un tableau de bord minimal interne.

## MVP (Phase en cours)

- Orchestration Moneroo Mobile Money & Stripe Cards
- Statuts transactionnels via polling + webhooks
- Dashboard interne pour le suivi des transactions

Consultez `docs/mvp_payments_inbound.md` pour le détail fonctionnel, technique et le backlog associé.

## Stack Proposée

- **Backend** : NestJS (Node.js 22, TypeScript)
- **Base de données** : PostgreSQL 16, Redis pour idempotency
- **Messaging** : AWS SQS pour événements webhooks
- **Infra** : AWS ECS Fargate + Secrets Manager (Terraform)
- **Frontend Dashboard** : Next.js minimal ou module SSR NestJS

## Getting Started (prévisionnel)

1. Installer Node.js 22 et npm.
2. `npm install`
3. `npm run prisma:generate`
4. `npm run prisma:migrate -- --name init` (création du schéma local)
5. Configurer les variables d’environnement (voir `config/env.example`).
6. `npm run start:dev` pour lancer l’API.

> Variables clés : `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECT_REFRESH_URL`, `STRIPE_CONNECT_RETURN_URL`, `MONEROO_SECRET_KEY`, `MONEROO_WEBHOOK_SECRET`, `DATA_ENCRYPTION_KEY`, `ADMIN_TOKEN`, `JWT_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `PASSWORD_RESET_TOKEN_TTL`, `SHAP_BASE_URL`, `SHAP_API_ID`, `SHAP_API_SECRET`, `SHAP_WEBHOOK_TOKEN`.

### Multi-tenant & API Keys

1. Créer un marchand :
   ```bash
   curl -X POST http://localhost:3000/v1/internal/merchants \
     -H "x-admin-token: <ADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Merchant Alpha","apiKeyLabel":"default"}'
   ```
   → note `merchantId` et `apiKey`.
2. (Bootstrap) Créer un utilisateur :
   ```bash
   curl -X POST http://localhost:3000/v1/internal/users \
     -H "x-admin-token: <ADMIN_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@boohpay.io","password":"Ch@ngeMe2025!","role":"ADMIN"}'
   ```
   Pour un marchand, ajouter `merchantId` et utiliser `role:"MERCHANT"`.
3. Configurer les credentials providers :

   ```bash
   curl -X PUT http://localhost:3000/v1/providers/stripe/credentials \
     -H "x-api-key: <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"secretKey":"sk_test_...","publishableKey":"pk_test_..."}'

   curl -X PUT http://localhost:3000/v1/providers/moneroo/credentials \
     -H "x-api-key: <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"secretKey":"moneroo_test_key"}'
   ```

4. Obtenir un lien d'onboarding Stripe Connect (Express) :
   ```bash
   curl -X POST http://localhost:3000/v1/providers/stripe/connect/link \
     -H "x-api-key: <API_KEY>"
   ```
   → le JSON retourne `url` (ouvrir dans le navigateur) et `accountId`.
5. Vérifier le statut Connect :
   ```bash
   curl http://localhost:3000/v1/providers/stripe/connect/status \
     -H "x-api-key: <API_KEY>"
   ```
6. Configurer eBilling (Mobile Money Gabon) :
   ```bash
   curl -X PUT http://localhost:3000/v1/providers/ebilling/credentials \
     -H "x-api-key: <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"username":"ebilling_user","sharedKey":"ebilling_shared","baseUrl":"https://stg.billing-easy.com/api/v1/merchant"}'
   ```
7. Configurer SHAP (payout Mobile Money Gabon) :
   ```bash
   curl -X PUT http://localhost:3000/v1/providers/shap/credentials \
     -H "x-api-key: <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{"apiId":"shap_api_id","apiSecret":"shap_api_secret","baseUrl":"https://test.billing-easy.net/shap/api/v1/merchant"}'
   ```

### Créer et suivre un paiement (tenant)

1. `stripe listen --forward-to localhost:3000/v1/webhooks/stripe`
2. `curl -X POST http://localhost:3000/v1/payments -H "x-api-key: <API_KEY>" -H "Content-Type: application/json" -d '{"orderId":"ORD-TEST","amount":5000,"currency":"USD","countryCode":"US","paymentMethod":"CARD"}'`
3. `stripe trigger payment_intent.succeeded --add "payment_intent:metadata[boohpay_payment_id]=<payment_id>"`
4. Vérifier le statut mis à jour : `curl http://localhost:3000/v1/payments/<payment_id> -H "x-api-key: <API_KEY>"`

### Tester les webhooks Stripe en local

(toujours penser à fournir `x-api-key` quand un merchant est créé).

### Créer un payout (SHAP)

1. Configurer les credentials SHAP via `PUT /v1/providers/shap/credentials`.
2. Créer un payout :
   ```bash
   curl -X POST http://localhost:3000/v1/payouts \
     -H "x-api-key: <API_KEY>" \
     -H "Content-Type: application/json" \
     -d '{
           "paymentSystemName": "airtelmoney",
           "payeeMsisdn": "+241070123456",
           "amount": 5000,
           "currency": "XAF",
           "externalReference": "PO-2025-0001",
           "payoutType": "WITHDRAWAL"
         }'
   ```
   Réponse → `status`, `providerReference` (payout_id SHAP) et historique des événements.
3. Simuler un callback SHAP (si webhooks configurés) :
   ```bash
   curl -X POST http://localhost:3000/v1/webhooks/shap/payout \
     -H "Content-Type: application/json" \
     -H "x-webhook-token: <SHAP_WEBHOOK_TOKEN>" \
     -d '{
           "shap_reference": "2220000141",
           "external_reference": "PO-2025-0001",
           "payment_system_name": "airtelmoney",
           "transaction_id": "disbursement-LX4LF36NIM-2220000141",
           "amount": 5000,
           "status": "success"
         }'
   ```
   Vérifier l’état actuel : `curl http://localhost:3000/v1/payouts/<payout_id> -H "x-api-key: <API_KEY>"`.

### Utilisateurs & Authentification JWT

1. **Connexion** :
   ```bash
   curl -X POST http://localhost:3000/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@boohpay.io","password":"Ch@ngeMe2025!"}'
   ```
   Réponse → `{ accessToken, refreshToken, user }`.
2. **Refresh / logout** :
   - `POST /v1/auth/refresh` avec `refreshToken` dans le corps.
   - `POST /v1/auth/logout` pour révoquer un refresh token.
3. **Politique de mots de passe** : minimum 12 caractères, incluant au moins une majuscule, une minuscule, un chiffre et un caractère spécial.
4. **Réinitialisation sécurisée** :
   - `POST /v1/auth/password/request` avec `{ "email": "user@example.com" }` (réponse générique, aucun leak sur l’existence du compte).
   - `POST /v1/auth/password/reset` avec `{ "token": "<jeton>", "newPassword": "<NouveauMotDePasse>" }` (révoque également tous les refresh tokens actifs).
   - En environnement de développement, le jeton est journalisé côté API pour faciliter les tests manuels.
5. **Accès Admin protégé JWT** :
   ```bash
   curl -X POST http://localhost:3000/v1/admin/merchants \
     -H "Authorization: Bearer <ACCESS_TOKEN>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Merchant Beta"}'
   ```

## Environnement Docker

1. Dupliquer `config/docker.env` si besoin et ajuster les clés (Stripe/Moneroo sandbox... ).
2. Lancer l’écosystème complet (API + Postgres + Redis) : `docker compose up --build`.
3. Appliquer les migrations (si nécessaire) : `docker compose run --rm app npm run prisma:migrate`.
4. L’API est exposée sur `http://localhost:3000/v1/health`.
5. Les services de données persistent dans des volumes Docker (`postgres_data`, `redis_data`).
6. Pour les commandes ponctuelles (ex: generate, tests) : `docker compose run --rm app npm run <commande>`.

> **Statut** : scaffolding et implémentation MVP en cours.

## Dashboard Next.js (portail admin & marchand)

1. `cd apps/dashboard`
2. `npm install`
3. Copier `.env.local.example` en `.env.local` et définir `NEXT_PUBLIC_API_BASE_URL` (ex. `http://localhost:3000/v1`).
4. `npm run dev -- --port 3001` puis ouvrir `http://localhost:3001`.
5. Connecte-toi via la page Login (utilise un compte créé via `POST /v1/internal/users`).
6. La vue **Admin** s’appuie sur les routes JWT (`/v1/admin/*`) pour créer des marchands/utilisateurs. La vue **Merchant** interroge `/v1/admin/transactions` et affiche le statut Stripe Connect (JWT) ; les API Keys restent disponibles pour les intégrations directes. Des écrans dédiés `/password/request` et `/password/reset` complètent désormais le flow de réinitialisation.
