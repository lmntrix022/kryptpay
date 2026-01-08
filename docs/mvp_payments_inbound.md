## BoohPay – MVP Payments Inbound

### 1. Objectif MVP
Mettre en production un socle unique permettant aux marchands de créer des paiements entrants routés automatiquement entre Moneroo (mobile money/local) et Stripe (cartes), d’obtenir le statut des transactions et de visualiser l’activité clé dans un tableau de bord minimal.

### 2. Périmètre Fonctionnel
- **Créer un paiement** : endpoint unique `POST /v1/payments` acceptant montant, devise, pays, méthode de paiement, métadonnées ; renvoie `payment_id`, `gateway_used`, et information checkout (`client_secret` Stripe ou URL Moneroo).
- **Consulter un paiement** : endpoint `GET /v1/payments/{id}` pour récupérer le statut courant et l’historique des événements.
- **Webhooks** : endpoints distincts `/webhooks/stripe` & `/webhooks/moneroo` vérifiant les signatures, normalisant les payloads et mettant à jour les transactions.
- **Dashboard minimal** : liste des transactions récentes, filtres par passerelle/statut, totaux agrégés 24h/7j.

### 3. Architecture Cible MVP
- **API Gateway / Edge** : expose REST, applique JWT + rate limiting. Pour le MVP, API NestJS servie derrière un ALB.
- **Service Orchestrateur** (NestJS) : contient la logique de routage, les adapters fournisseurs, la persistance Postgres, la publication d’événements internes.
- **Adaptateurs Stripe & Moneroo** : classes dédiées encapsulant les SDK/REST clients, gestion des retries, mapping d’erreurs.
- **Worker Webhooks** : contrôleurs NestJS recevant les webhooks → file SQS → consumer NestJS worker qui applique les mutations.
- **Postgres** : schéma transactions/payouts/events. Redis pour idempotency et anti-replay webhooks.
- **Dashboard** : module interne (Next.js ou NestJS SSR) consommant les endpoints admin.

### 4. Flux Principaux
1. **Création paiement**
   - Client appelle `POST /v1/payments`
   - Orchestrateur applique `selectGateway(country_code, payment_method)`
   - Adapter Stripe : crée Payment Intent + renvoie `client_secret`
   - Adapter Moneroo : init paiement mobile money, renvoie `checkout_url`
   - Transaction enregistrée (`status = PENDING`), réponse envoyée au marchand
2. **Webhook**
   - Stripe/Moneroo envoie un événement → endpoint dédié
   - Vérification signature/HMAC + idempotency
   - Événement normalisé → SQS → worker → update transaction (`status = SUCCEEDED/FAILED`), log dans `transaction_events`
3. **Polling**
   - Marchand appelle `GET /v1/payments/{id}`
   - Orchestrateur renvoie statut courant et derniers événements ; si `PENDING` dépassant SLA, option de rafraîchir via `RefreshStatusService`

### 5. Modèle de Données (PostgreSQL)
- `transactions`
  - `id UUID PK`
  - `merchant_id UUID`
  - `order_id TEXT`
  - `amount_minor BIGINT`
  - `currency CHAR(3)`
  - `country_code CHAR(2)`
  - `payment_method TEXT`
  - `gateway_used ENUM('STRIPE','MONEROO')`
  - `status ENUM('PENDING','AUTHORIZED','SUCCEEDED','FAILED')`
  - `provider_reference TEXT`
  - `checkout_payload JSONB`
  - `failure_code TEXT`
  - `metadata JSONB`
  - `created_at TIMESTAMPTZ`
  - `updated_at TIMESTAMPTZ`
- `transaction_events`
  - `id UUID PK`
  - `transaction_id UUID FK`
  - `type TEXT`
  - `payload JSONB`
  - `provider_event_id TEXT`
  - `occurred_at TIMESTAMPTZ`
- `merchants`
  - `id UUID PK`
  - `name TEXT`
  - `created_at TIMESTAMPTZ`
  - `updated_at TIMESTAMPTZ`
- `api_keys`
  - `id UUID PK`
  - `merchant_id UUID FK`
  - `key_hash TEXT UNIQUE`
  - `label TEXT`
  - `last_used_at TIMESTAMPTZ`
- `provider_credentials`
  - `id UUID PK`
  - `merchant_id UUID FK`
  - `provider TEXT`
  - `environment TEXT`
  - `encrypted_data TEXT`
- `idempotency_keys`
  - `key TEXT PK`
  - `request_hash TEXT`
  - `response JSONB`
  - `created_at TIMESTAMPTZ`

### 6. APIs (Mock)
`POST /v1/payments` (header `x-api-key`)
```json
{
  "orderId": "ORD-2025-00123",
  "amount": 12500,
  "currency": "XOF",
  "countryCode": "SN",
  "paymentMethod": "MOBILE_MONEY",
  "customer": {
    "email": "client@example.com",
    "phone": "+221771234567"
  },
  "metadata": {
    "cart_id": "cart_123"
  },
  "returnUrl": "https://merchant.com/checkout/success"
}
```

Réponse
```json
{
  "paymentId": "pay_01HXYZ",
  "merchantId": "mrc_01M",
  "gatewayUsed": "MONEROO",
  "status": "PENDING",
  "checkout": {
    "type": "REDIRECT",
    "url": "https://moneroo.africa/pay/abc123"
  }
}
```

`GET /v1/payments/{id}` (header `x-api-key`)
```json
{
  "paymentId": "pay_01HXYZ",
  "merchantId": "mrc_01M",
  "gatewayUsed": "MONEROO",
  "status": "SUCCEEDED",
  "amount": 12500,
  "currency": "XOF",
  "checkout": {
    "type": "REDIRECT",
    "url": "https://moneroo.africa/pay/abc123"
  },
  "metadata": {
    "provider": "moneroo",
    "country": "SN"
  },
  "events": [
    { "type": "PAYMENT_INITIATED", "at": "2025-11-01T10:15:00Z" },
    { "type": "payment_intent.succeeded", "at": "2025-11-01T10:16:30Z" }
  ]
}
```

`POST /webhooks/stripe`
```json
{
  "id": "evt_123",
  "type": "payment_intent.succeeded",
  "data": {...}
}
```

`POST /webhooks/moneroo`
```json
{
  "id": "evt_777",
  "type": "payment.success",
  "data": {...}
}
```

`GET /v1/admin/transactions` (dashboard)
```json
{
  "items": [
    {
      "paymentId": "pay_01HXYZ",
      "merchantId": "mrc_01M",
      "gatewayUsed": "MONEROO",
      "status": "SUCCEEDED",
      "amount": 12500,
      "currency": "XOF",
      "createdAt": "2025-11-01T10:15:00Z"
    }
  ],
  "totals": {
    "volumeMinor": 320000,
    "transactions": 245,
    "byGateway": {
      "MONEROO": { "volumeMinor": 210000, "count": 170 },
      "STRIPE": { "volumeMinor": 110000, "count": 75 }
    },
    "byStatus": {
      "SUCCEEDED": { "volumeMinor": 280000, "count": 230 },
      "FAILED": { "volumeMinor": 40000, "count": 15 }
    }
  }
}
```

`POST /v1/providers/stripe/connect/link` (header `x-api-key`)
```json
{
  "accountId": "acct_1XXXX",
  "url": "https://connect.stripe.com/...",
  "expiresAt": 1730442000
}
```

`GET /v1/providers/stripe/connect/status`
```json
{
  "connected": true,
  "accountId": "acct_1XXXX",
  "chargesEnabled": true,
  "payoutsEnabled": false,
  "detailsSubmitted": true
}
```

### 7. Sécurité
- Authentification par API key (header `x-api-key`) ; `ADMIN_TOKEN` requis pour les routes internes.
- `Idempotency-Key` obligatoire sur `POST /v1/payments`.
- Webhooks : vérification signature Stripe (`stripe-signature`), HMAC Moneroo (`x-moneroo-signature`), protection anti-replay via Redis TTL (5 minutes).
- Journaux : structured logging (traceId, merchantId, gateway).

### 8. Backlog MVP (Sprints 1-3)
1. **Sprint 1**
   - Scaffolding NestJS, config CI, lint/test.
   - Modules core : `TransactionsModule`, `RoutingModule`, `StripeModule` (create intent), `MonerooModule` (init payment mock).
   - Postgres migrations via Prisma ou TypeORM.
2. **Sprint 2**
   - Implémentation webhooks + workers + SQS integration.
   - Idempotency & retries.
   - GET status + events timeline.
3. **Sprint 3**
   - Admin endpoints + dashboard UI (Next.js minimal).
   - Observability (logging, metrics), runbook.
   - End-to-end tests + load smoke tests.

### 9. Ouverts / Pré-requis
- Obtenir spécifications Moneroo (auth, webhook signature, sandbox endpoints).
- Provisionner Postgres (staging/prod) + Secrets Manager.
- Définir liste exhaustive des pays africains + mapping méthodes.
- Valider expérience dashboard (besoins internes vs marchands).




