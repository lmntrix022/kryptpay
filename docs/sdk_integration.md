# Documentation SDK BoohPay

## Vue d'ensemble

Le SDK BoohPay est une bibliothèque JavaScript qui simplifie l'intégration des paiements dans votre application e-commerce. Il masque la complexité du routage multi-provider et offre une interface utilisateur unifiée.

## Architecture

```
┌─────────────────┐
│   E-Commerce    │
│    Frontend     │
└────────┬────────┘
         │
         │ BoohPay SDK
         ▼
┌─────────────────┐
│   API BoohPay   │
│  POST /payments │
└────────┬────────┘
         │
         │ Routage intelligent
         ├─────────┬─────────┬──────────┐
         ▼         ▼         ▼          ▼
    ┌──────┐ ┌─────────┐ ┌──────┐ ┌─────────┐
    │Stripe│ │Moneroo  │ │eBilling│ │ Direct │
    └──────┘ └─────────┘ └──────┘ └─────────┘
```

## Routage intelligent (Backend)

Le SDK envoie toujours les requêtes vers `POST /api/v1/payments`. Le backend BoohPay décide automatiquement du provider à utiliser selon :

1. **Méthode de paiement** : CARD → Stripe, MOBILE_MONEY → Moneroo/eBilling
2. **Pays** : Certains pays ont des providers privilégiés
3. **Métadonnées** : Le champ `metadata.mobileMoneyProvider` peut forcer un provider spécifique
4. **Règles métier** : Frais, taux de succès historique, disponibilité

### Exemple de routage

```javascript
// Requête SDK
{
  paymentMethod: "MOBILE_MONEY",
  countryCode: "GA",
  metadata: {
    mobileMoneyProvider: "AIRTEL_MONEY"  // Peut être utilisé pour le routage
  }
}

// Backend décide :
// - Si intégration directe Airtel Money disponible → Route directe
// - Sinon → Route via Moneroo (agrégateur)
```

## Sécurité

### Tokenisation des cartes

⚠️ **CRITIQUE** : Les données de carte ne doivent JAMAIS transiter directement.

Le SDK doit utiliser :
- **Stripe Elements** (si Stripe est le provider) pour tokeniser côté client
- Ou un service de tokenisation PCI-compliant similaire

Dans la version actuelle, le SDK collecte les données de carte mais devrait être étendu pour utiliser Stripe Elements dans une version future.

### Clés API

- **Publishable Key (bpk_)** : Sécurisée pour utilisation côté client
- **Secret Key (bsk_)** : JAMAIS côté client, uniquement backend

## Webhooks

### Configuration

1. Accédez à votre dashboard BoohPay
2. Section "Webhooks"
3. Ajoutez votre URL endpoint
4. Sélectionnez les événements à recevoir

### Signature du webhook

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

### Format du webhook

```json
{
  "event": "payment.status.changed",
  "paymentId": "pay_abc123",
  "status": "SUCCEEDED",
  "providerReference": "ref_xyz789",
  "amount": 10000,
  "currency": "XAF",
  "orderId": "order_123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Codes d'erreur

| Code | HTTP | Description | Action |
|------|------|-------------|--------|
| `INVALID_API_KEY` | 401 | Clé API invalide | Vérifier la clé |
| `MISSING_FIELDS` | 400 | Champs requis manquants | Vérifier les données |
| `INVALID_AMOUNT` | 400 | Montant invalide | Montant > 0 |
| `INVALID_CURRENCY` | 400 | Devise non supportée | Vérifier la devise |
| `GATEWAY_ERROR` | 502 | Erreur du provider | Réessayer plus tard |
| `PAYMENT_FAILED` | 402 | Paiement refusé | Informer l'utilisateur |
| `NETWORK_ERROR` | - | Erreur réseau | Vérifier la connexion |

## Test

### Cartes de test Stripe

- **Succès** : `4242 4242 4242 4242`
- **3D Secure** : `4000 0025 0000 3155`
- **Refus** : `4000 0000 0000 0002`

### Mobile Money (Mode test)

- Utilisez n'importe quel numéro valide
- Les paiements seront simulés
- Les webhooks seront envoyés avec un délai artificiel

## Limitations connues

1. **Tokenisation Stripe** : La version actuelle collecte les données de carte en clair. Intégration Stripe Elements requise pour la production.
2. **Redirections 3DS** : Gestion basique, peut nécessiter des ajustements selon la configuration Stripe.
3. **Webhooks** : Nécessitent une URL publique accessible.

## Roadmap

- [ ] Intégration complète Stripe Elements
- [ ] Support Vue.js / Angular
- [ ] Mode offline (localStorage cache)
- [ ] Internationalisation (i18n)
- [ ] Analytics intégrées
- [ ] SDK backend (Node.js, Python, PHP)


