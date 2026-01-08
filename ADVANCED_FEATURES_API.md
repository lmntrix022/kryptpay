# 🚀 Documentation API - Fonctionnalités Avancées

## 📊 Analytics & Rapports

### Endpoints

#### GET `/v1/admin/analytics/payments`
Analytics détaillés pour les paiements.

**Query Parameters:**
- `startDate` (optional): Date de début (ISO 8601)
- `endDate` (optional): Date de fin (ISO 8601)
- `gateway` (optional): Filtrer par gateway (STRIPE, MONEROO, EBILLING)
- `currency` (optional): Filtrer par devise
- `countryCode` (optional): Filtrer par pays
- `isTestMode` (optional): true/false pour filtrer par mode test

**Response:**
```json
{
  "total": {
    "count": 1000,
    "volumeMinor": 50000000,
    "succeeded": 950,
    "failed": 40,
    "pending": 10
  },
  "byGateway": {
    "STRIPE": { "count": 500, "volumeMinor": 25000000, "succeeded": 480, "failed": 20 },
    "MONEROO": { "count": 300, "volumeMinor": 15000000, "succeeded": 285, "failed": 15 },
    "EBILLING": { "count": 200, "volumeMinor": 10000000, "succeeded": 185, "failed": 15 }
  },
  "byStatus": { ... },
  "byCurrency": { ... },
  "conversionRate": 95.0,
  "averageAmount": 50000,
  "trends": [
    { "date": "2025-01-01", "count": 50, "volumeMinor": 2500000, "succeeded": 48 }
  ]
}
```

#### GET `/v1/admin/analytics/payouts`
Analytics pour les payouts.

**Query Parameters:** Similaires aux paiements (sans gateway, avec provider)

#### GET `/v1/admin/analytics/combined`
Vue combinée paiements + payouts.

#### GET `/v1/admin/analytics/payments/export/:format`
Export des analytics (format: `csv` ou `pdf`).

---

## 💳 Subscriptions (Paiements Récurrents)

### Endpoints

#### POST `/v1/admin/subscriptions`
Créer une nouvelle subscription.

**Body:**
```json
{
  "customerEmail": "customer@example.com",
  "customerPhone": "+22912345678",
  "amountMinor": 10000,
  "currency": "XAF",
  "billingCycle": "MONTHLY",
  "startDate": "2025-01-15T00:00:00Z",
  "metadata": { "plan": "premium" },
  "isTestMode": false
}
```

**Billing Cycles:** `DAILY`, `WEEKLY`, `MONTHLY`, `QUARTERLY`, `YEARLY`

#### GET `/v1/admin/subscriptions`
Lister les subscriptions.

**Query Parameters:**
- `status`: ACTIVE, PAUSED, CANCELLED, EXPIRED, TRIALING
- `customerEmail`: Recherche par email
- `limit`: Nombre de résultats (défaut: 50)
- `offset`: Offset pour pagination

#### GET `/v1/admin/subscriptions/:id`
Obtenir une subscription spécifique.

#### PUT `/v1/admin/subscriptions/:id`
Mettre à jour une subscription.

**Body:**
```json
{
  "customerEmail": "newemail@example.com",
  "amountMinor": 15000,
  "billingCycle": "QUARTERLY"
}
```

#### POST `/v1/admin/subscriptions/:id/pause`
Mettre en pause une subscription.

#### POST `/v1/admin/subscriptions/:id/resume`
Reprendre une subscription en pause.

#### DELETE `/v1/admin/subscriptions/:id`
Annuler une subscription.

**Body (optional):**
```json
{
  "cancelAt": "2025-02-01T00:00:00Z"  // Annulation programmée
}
```

### Jobs Cron Automatiques

- **Facturation automatique**: Exécuté toutes les heures (`SubscriptionBillingService`)
  - Traite les subscriptions avec `nextBillingDate <= maintenant`
  - Crée automatiquement un paiement pour chaque subscription

- **Dunning (relances)**: Exécuté toutes les 6 heures (`DunningService`)
  - Détecte les paiements échoués
  - Crée des tentatives de relance avec backoff exponentiel (1, 3, 7, 14, 30 jours)
  - Annule automatiquement après 5 tentatives échouées

---

## 🧪 Sandbox - Simulateur de Webhooks

### Endpoints

#### POST `/v1/admin/sandbox/webhooks/simulate`
Simuler l'envoi d'un webhook.

**Body:**
```json
{
  "endpoint": "https://example.com/webhook",
  "eventType": "payment.succeeded",
  "payload": {
    "id": "pay_test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_123",
      "order_id": "order_123",
      "amount": 10000,
      "currency": "XAF",
      "status": "SUCCEEDED"
    }
  },
  "headers": {
    "X-Custom-Header": "value"
  }
}
```

**Response:**
```json
{
  "id": "webhook_log_id",
  "endpoint": "https://example.com/webhook",
  "payload": { ... },
  "headers": { ... },
  "response": {
    "status": 200,
    "statusText": "OK",
    "body": { "received": true }
  },
  "simulatedAt": "2025-01-03T12:00:00Z"
}
```

#### GET `/v1/admin/sandbox/webhooks/history`
Historique des webhooks simulés.

**Query Parameters:**
- `limit`: Nombre de résultats (défaut: 50)

#### GET `/v1/admin/sandbox/webhooks/examples`
Obtenir des exemples de payloads pour différents événements.

**Response:**
```json
{
  "payment_succeeded": { ... },
  "payment_failed": { ... },
  "payout_succeeded": { ... },
  "refund_created": { ... }
}
```

---

## 🔍 Recherche & Filtres Avancés

### Endpoints

#### POST `/v1/admin/filters/search`
Recherche avancée multi-critères.

**Body:**
```json
{
  "type": "payment",
  "search": "order_123",
  "status": ["SUCCEEDED", "PENDING"],
  "gateway": ["STRIPE", "MONEROO"],
  "currency": "XAF",
  "countryCode": ["BJ", "TG"],
  "amountMin": 1000,
  "amountMax": 100000,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-01-31T23:59:59Z",
  "isTestMode": false,
  "limit": 50,
  "offset": 0
}
```

**Types supportés:** `payment`, `payout`, `refund`

**Response:**
```json
{
  "items": [ ... ],
  "total": 150,
  "type": "payment"
}
```

#### GET `/v1/admin/filters/saved`
Lister les filtres sauvegardés.

**Query Parameters:**
- `type`: Filtrer par type (payment, payout, refund)

#### GET `/v1/admin/filters/saved/:id`
Obtenir un filtre sauvegardé.

#### POST `/v1/admin/filters/saved`
Sauvegarder un nouveau filtre.

**Body:**
```json
{
  "name": "Paiements réussis ce mois",
  "type": "payment",
  "filters": {
    "status": ["SUCCEEDED"],
    "startDate": "2025-01-01T00:00:00Z"
  },
  "isDefault": true
}
```

#### PUT `/v1/admin/filters/saved/:id`
Mettre à jour un filtre sauvegardé.

#### DELETE `/v1/admin/filters/saved/:id`
Supprimer un filtre sauvegardé.

#### GET `/v1/admin/filters/saved/default/:type`
Obtenir le filtre par défaut pour un type.

---

## 🔐 Authentification

Tous les endpoints nécessitent une authentification :
- **JWT Token** : Header `Authorization: Bearer <token>`
- **API Key** : Header `x-api-key: <api-key>`

---

## 📝 Notes

- Tous les montants sont en `amountMinor` (centimes/sous)
- Les dates sont au format ISO 8601
- Le mode test (`isTestMode`) isole complètement les données de test
- Les jobs cron sont automatiquement démarrés avec NestJS Schedule

---

## 🎯 Exemples d'utilisation

### Créer une subscription mensuelle
```bash
curl -X POST http://localhost:3000/v1/admin/subscriptions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "customer@example.com",
    "amountMinor": 10000,
    "currency": "XAF",
    "billingCycle": "MONTHLY"
  }'
```

### Simuler un webhook
```bash
curl -X POST http://localhost:3000/v1/admin/sandbox/webhooks/simulate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://example.com/webhook",
    "eventType": "payment.succeeded",
    "payload": { ... }
  }'
```

### Recherche avancée
```bash
curl -X POST http://localhost:3000/v1/admin/filters/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "payment",
    "gateway": ["STRIPE"],
    "status": ["SUCCEEDED"],
    "startDate": "2025-01-01T00:00:00Z"
  }'
```


