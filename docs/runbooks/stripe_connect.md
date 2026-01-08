## Runbook – Onboarding Stripe Connect pour un marchand BoohPay

### Pré-requis
- Variables d’environnement configurées :
  - `STRIPE_SECRET_KEY` (clé plateforme)
  - `STRIPE_CONNECT_REFRESH_URL`, `STRIPE_CONNECT_RETURN_URL`
  - `DATA_ENCRYPTION_KEY`, `ADMIN_TOKEN`
- Stripe CLI ou accès au dashboard pour vérifier le compte connecté
- Merchant existant et API key générée

### Étapes
1. **Créer un marchand (si besoin)**
   ```bash
   curl -X POST http://localhost:3000/v1/internal/merchants \
     -H "x-admin-token: $ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"Merchant Demo","apiKeyLabel":"default"}'
   ```
   → Note `merchantId` & `apiKey`.

2. **Générer un lien d’onboarding**
   ```bash
   curl -X POST http://localhost:3000/v1/providers/stripe/connect/link \
     -H "x-api-key: $API_KEY"
   ```
   Réponse type :
   ```json
   {
     "accountId": "acct_1XXXX",
     "url": "https://connect.stripe.com/express/onboarding/...",
     "expiresAt": 1730442000
   }
   ```

3. **Compléter l’onboarding Stripe**
   - Ouvrir l’URL dans un navigateur (idéalement session privée)
   - Remplir les informations requises (adresse, compte bancaire, etc.)
   - Stripe redirige vers `STRIPE_CONNECT_RETURN_URL`

4. **Vérifier l’état du compte**
   ```bash
   curl http://localhost:3000/v1/providers/stripe/connect/status \
     -H "x-api-key: $API_KEY"
   ```
   - `connected: true` & `chargesEnabled: true` → prêt à encaisser
   - `payoutsEnabled: false` → Stripe n’a pas validé les virements (attente KYC)

5. **Fallback / erreurs**
   - Si `Invalid API key`: régénérer la clé via `/v1/internal/merchants/{id}/api-keys`
   - Si `Stripe provider not configured`: stocker `secretKey` / `publishableKey` via `PUT /v1/providers/stripe/credentials`
   - Si `account_link` expiré (> 24h) : relancer `POST /link`

### Révocation / rotation
- Pour déconnecter Stripe, supprimer le credential :
  ```bash
  curl -X PUT http://localhost:3000/v1/providers/stripe/credentials \
    -H "x-api-key: $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"secretKey":"","publishableKey":""}'
  ```
- Penser à invalider l’API key si compromission (`POST /internal/merchants/:id/api-keys` + suppression côté Prisma).






