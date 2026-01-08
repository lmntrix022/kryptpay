# 📚 Guide SDK & API BoohPay

## 🎯 Vue d'Ensemble

BoohPay fournit une **API REST complète** pour l'intégration des paiements. Actuellement, il n'y a pas de SDK client officiel publié, mais la documentation complète de l'API et des exemples d'intégration sont disponibles.

---

## 📋 Architecture

```
┌─────────────────┐
│   Application   │
│     Client      │
└────────┬────────┘
         │
         │ REST API
         ▼
┌─────────────────┐
│  BoohPay API    │
│  http://localhost:3000/v1  │
└────────┬────────┘
         │
         │ Routage intelligent
         ├─────────┬─────────┬──────────┐
         ▼         ▼         ▼          ▼
    ┌──────┐ ┌─────────┐ ┌──────┐ ┌─────────┐
    │Stripe│ │Moneroo  │ │eBilling│ │ Direct │
    └──────┘ └─────────┘ └──────┘ └─────────┘
```

---

## 🔐 Authentification

### API Keys

BoohPay utilise un système d'authentification par **clés API** :

1. **Clé API** : Pour les applications backend (`x-api-key`)
2. **Bearer Token** : Pour les utilisateurs connectés (`Authorization: Bearer`)

### Obtenir une Clé API

```bash
# Créer un marchand (Admin uniquement)
curl -X POST "http://localhost:3000/v1/internal/merchants" \
  -H "x-admin-token: super-admin-secret-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon E-Commerce",
    "apiKeyLabel": "production"
  }'

# Réponse :
# {
#   "merchantId": "xxx-xxx-xxx",
#   "apiKey": "dtAZ3MoL8dPlvNXC4yQWRfN9q_eMWGxNPBa6dlsnUwM"
# }
```

### Utiliser la Clé API

```bash
# Dans vos requêtes HTTP
curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

---

## 💳 Intégration Paiements

### 1. Créer un Paiement

**Endpoint** : `POST /v1/payments`

```bash
curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-12345" \
  -d '{
    "orderId": "order-123",
    "amount": 10000,
    "currency": "XAF",
    "countryCode": "CM",
    "paymentMethod": "CARD",
    "returnUrl": "https://monapp.com/success",
    "customer": {
      "email": "client@example.com",
      "phone": "+237612345678"
    },
    "metadata": {
      "productId": "prod-123"
    }
  }'
```

**Réponse** :

```json
{
  "paymentId": "pay_abc123",
  "merchantId": "merch_xyz",
  "orderId": "order-123",
  "gatewayUsed": "STRIPE",
  "status": "PENDING",
  "amount": 10000,
  "currency": "XAF",
  "checkout": {
    "type": "CLIENT_SECRET",
    "clientSecret": "pi_xxx_secret_xxx",
    "publishableKey": "pk_test_xxx"
  },
  "createdAt": "2025-01-15T10:30:00Z"
}
```

### Méthodes de Paiement

| Méthode | Description | Gateway |
|---------|-------------|---------|
| `CARD` | Carte bancaire | Stripe |
| `MOBILE_MONEY` | Mobile Money | Moneroo / eBilling |

### Devises Supportées

| Devise | Gateway | Code |
|--------|---------|------|
| CFA Franc | eBilling | XAF |
| Euro | Stripe | EUR |
| Dollar US | Stripe / Moneroo | USD |

---

## 🔍 Vérifier le Statut d'un Paiement

### Polling

```bash
curl "http://localhost:3000/v1/payments/CHECKOUT_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

**Réponse** :

```json
{
  "paymentId": "pay_abc123",
  "status": "SUCCEEDED",
  "providerReference": "pi_xxx"
}
```

### Webhooks (Recommandé)

Configurer un webhook pour recevoir les notifications automatiques :

**Endpoint** : `POST /v1/admin/webhooks` (configuration)

```bash
curl -X POST "http://localhost:3000/v1/admin/webhooks" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://monapp.com/webhooks/boohpay",
    "events": ["payment.status.changed"]
  }'
```

**Format du webhook** :

```json
{
  "event": "payment.status.changed",
  "paymentId": "pay_abc123",
  "status": "SUCCEEDED",
  "providerReference": "pi_xxx",
  "amount": 10000,
  "currency": "XAF",
  "orderId": "order-123",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

## 📊 Analytics & Rapports

### Analytics Paiements

```bash
curl "http://localhost:3000/v1/admin/analytics/payments?startDate=2025-01-01&endDate=2025-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse** :

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
    "STRIPE": { "count": 500, "volumeMinor": 25000000, "succeeded": 480 },
    "MONEROO": { "count": 300, "volumeMinor": 15000000, "succeeded": 285 },
    "EBILLING": { "count": 200, "volumeMinor": 10000000, "succeeded": 185 }
  },
  "byStatus": { ... },
  "conversionRate": 95.0,
  "averageAmount": 50000,
  "trends": [...]
}
```

### Exports

```bash
# CSV
curl "http://localhost:3000/v1/admin/analytics/payments/export/csv" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o analytics.csv

# PDF
curl "http://localhost:3000/v1/admin/analytics/payments/export/pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o analytics.html
```

---

## 🔄 Subscriptions (Paiements Récurrents)

### Créer une Subscription

```bash
curl -X POST "http://localhost:3000/v1/admin/subscriptions" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customerEmail": "client@example.com",
    "customerPhone": "+237612345678",
    "amountMinor": 10000,
    "currency": "XAF",
    "billingCycle": "MONTHLY",
    "isTestMode": true
  }'
```

**Cycles de facturation** :
- `DAILY`
- `WEEKLY`
- `MONTHLY`
- `QUARTERLY`
- `YEARLY`

### Lister les Subscriptions

```bash
curl "http://localhost:3000/v1/admin/subscriptions?status=ACTIVE&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Gérer une Subscription

```bash
# Mettre en pause
curl -X POST "http://localhost:3000/v1/admin/subscriptions/SUB_ID/pause" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reprendre
curl -X POST "http://localhost:3000/v1/admin/subscriptions/SUB_ID/resume" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Annuler
curl -X DELETE "http://localhost:3000/v1/admin/subscriptions/SUB_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🧪 Mode Test & Sandbox

### Créer un Paiement en Mode Test

```bash
curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-order-123",
    "amount": 10000,
    "currency": "XAF",
    "countryCode": "CM",
    "paymentMethod": "CARD",
    "isTestMode": true
  }'
```

### Simuler un Webhook

```bash
curl -X POST "http://localhost:3000/v1/admin/sandbox/webhooks/simulate" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "endpoint": "https://example.com/webhook",
    "eventType": "payment_succeeded",
    "payload": {
      "payment_id": "pay_test_123",
      "status": "SUCCEEDED"
    }
  }'
```

---

## 🧪 Comment Tester

### 1. Script de Test Automatique

Un script de test est disponible :

```bash
./test-webhooks-simple.sh
```

### 2. Page Demo dans le Dashboard

Une page de démonstration est accessible sur `/demo` dans le dashboard :

1. Connectez-vous au dashboard : `http://localhost:3001/login`
2. Naviguez vers `/demo`
3. Créez des paiements de test

### 3. Tests Manuels avec cURL

```bash
# 1. Obtenir un token
TOKEN=$(curl -s -X POST "http://localhost:3000/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"merchant-test@boohpay.io","password":"Ch@ngeMe2025!"}' \
  | jq -r '.accessToken')

# 2. Créer un paiement
curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "amount": 10000,
    "currency": "XAF",
    "countryCode": "CM",
    "paymentMethod": "CARD"
  }'

# 3. Vérifier le statut
curl "http://localhost:3000/v1/payments/PAYMENT_ID" \
  -H "x-api-key: YOUR_API_KEY"
```

---

## 📝 Exemples d'Intégration

### Node.js / TypeScript

```typescript
class BoohPayClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = 'http://localhost:3000/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async createPayment(params: {
    orderId: string;
    amount: number;
    currency: string;
    countryCode: string;
    paymentMethod: 'CARD' | 'MOBILE_MONEY';
    returnUrl?: string;
    customer?: { email: string; phone?: string };
    metadata?: Record<string, unknown>;
  }) {
    const response = await fetch(`${this.baseUrl}/payments`, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Idempotency-Key': `${params.orderId}-${Date.now()}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  async getPayment(paymentId: string) {
    const response = await fetch(`${this.baseUrl}/payments/${paymentId}`, {
      headers: { 'x-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
}

// Utilisation
const client = new BoohPayClient('YOUR_API_KEY');

const payment = await client.createPayment({
  orderId: 'order-123',
  amount: 10000,
  currency: 'XAF',
  countryCode: 'CM',
  paymentMethod: 'CARD',
  returnUrl: 'https://monapp.com/success',
});
```

### Python

```python
import requests
import time

class BoohPayClient:
    def __init__(self, api_key, base_url='http://localhost:3000/v1'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'x-api-key': api_key,
            'Content-Type': 'application/json'
        }
    
    def create_payment(self, order_id, amount, currency, country_code, 
                       payment_method, return_url=None, customer=None):
        idempotency_key = f"{order_id}-{int(time.time())}"
        
        data = {
            'orderId': order_id,
            'amount': amount,
            'currency': currency,
            'countryCode': country_code,
            'paymentMethod': payment_method
        }
        
        if return_url:
            data['returnUrl'] = return_url
        if customer:
            data['customer'] = customer
        
        response = requests.post(
            f"{self.base_url}/payments",
            headers={**self.headers, 'Idempotency-Key': idempotency_key},
            json=data
        )
        
        response.raise_for_status()
        return response.json()
    
    def get_payment(self, payment_id):
        response = requests.get(
            f"{self.base_url}/payments/{payment_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()

# Utilisation
client = BoohPayClient('YOUR_API_KEY')

payment = client.create_payment(
    order_id='order-123',
    amount=10000,
    currency='XAF',
    country_code='CM',
    payment_method='CARD'
)
```

---

## 🔒 Sécurité

### Signature des Webhooks

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}

app.post('/webhooks/boohpay', (req, res) => {
  const signature = req.headers['x-boohpay-signature'];
  const secret = process.env.BOOHPAY_WEBHOOK_SECRET;
  
  if (!verifyWebhookSignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Traiter le webhook
  const { paymentId, status, providerReference } = req.body;
  
  res.status(200).send('OK');
});
```

---

## 📚 Documentation Complète

- **API Avancée** : `docs/ADVANCED_FEATURES_API.md`
- **SDK Intégration** : `docs/sdk_integration.md`
- **MVP Payments** : `docs/mvp_payments_inbound.md`

---

## 🐛 Codes d'Erreur

| Code | HTTP | Description |
|------|------|-------------|
| `INVALID_API_KEY` | 401 | Clé API invalide |
| `MISSING_FIELDS` | 400 | Champs requis manquants |
| `INVALID_AMOUNT` | 400 | Montant invalide |
| `GATEWAY_ERROR` | 502 | Erreur du provider |
| `PAYMENT_FAILED` | 402 | Paiement refusé |

---

## 📞 Support

Pour toute question ou problème, consultez la documentation ou créez une issue sur le repository.

