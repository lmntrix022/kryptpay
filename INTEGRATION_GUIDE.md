# Guide d'Intégration BoohPay ↔ SaaS E-commerce

## Vue d'ensemble

Ce guide explique comment intégrer BoohPay avec votre plateforme SaaS e-commerce pour permettre aux utilisateurs abonnés d'accepter des paiements sur leur boutique.

## Architecture proposée

```
SaaS E-commerce          BoohPay API
┌─────────────────┐     ┌──────────────────┐
│                 │     │                  │
│  User (vendor)  │────▶│   Merchant       │
│  Subscription   │     │   API Key        │
│                 │     │   Credentials    │
└─────────────────┘     └──────────────────┘
        │                        │
        │                        │
        └───────── Webhooks ─────┘
```

## Scénarios d'intégration

### 1. Création automatique d'un Merchant lors de l'abonnement

Quand un utilisateur souscrit à un abonnement dans votre SaaS, vous devez créer automatiquement un Merchant dans BoohPay.

### 2. Synchronisation des données utilisateur

Synchroniser les informations de l'utilisateur (email, nom, etc.) avec le Merchant.

### 3. Exposition des API Keys

Permettre aux utilisateurs de récupérer leur API Key BoohPay depuis votre plateforme.

### 4. Gestion des credentials de payment providers

Permettre aux utilisateurs de configurer leurs credentials Stripe/Moneroo depuis votre interface.

---

## Étapes d'intégration

### Étape 1 : Endpoint d'intégration pour créer un Merchant

BoohPay expose déjà un endpoint pour créer un merchant :
- `POST /v1/internal/merchants` (protégé par AdminTokenGuard)

Vous devez soit :
- A. Utiliser ce endpoint avec un token admin partagé
- B. Créer un endpoint dédié pour l'intégration (recommandé)

### Étape 2 : Synchronisation automatique

Quand un utilisateur s'abonne dans votre SaaS :
1. Créer un Merchant dans BoohPay via l'API
2. Générer une API Key pour ce Merchant
3. Stocker le `merchantId` et `apiKey` dans votre base de données utilisateur

### Étape 3 : Exposition dans l'interface utilisateur

Dans votre interface e-commerce, ajouter une section "Paiements" où l'utilisateur peut :
- Voir son API Key BoohPay
- Configurer ses credentials de payment providers
- Voir ses statistiques de paiements
- Gérer ses webhooks

---

## Endpoints BoohPay disponibles

### Création de Merchant
```
POST /v1/internal/merchants
Headers: Authorization: Bearer {ADMIN_TOKEN}
Body: {
  "name": "Nom du vendeur",
  "apiKeyLabel": "Auto-generated for SaaS user"
}
Response: {
  "merchantId": "mrc_xxx",
  "apiKey": "bpk_live_xxx"
}
```

### Génération d'une nouvelle API Key
```
POST /v1/internal/merchants/{merchantId}/api-keys
Headers: Authorization: Bearer {ADMIN_TOKEN}
Body: {
  "label": "New key label"
}
Response: {
  "apiKey": "bpk_live_xxx",
  "id": "key_xxx"
}
```

### Création d'un paiement (pour l'utilisateur)
```
POST /v1/payments
Headers: x-api-key: {API_KEY}
Body: {
  "orderId": "ORD-123",
  "amount": 12500,
  "currency": "XOF",
  "countryCode": "SN",
  "paymentMethod": "MOBILE_MONEY",
  ...
}
```

---

## Exemple d'implémentation

### Dans votre SaaS (Backend)

```typescript
// Quand un utilisateur s'abonne
async function onUserSubscription(userId: string, subscriptionData: any) {
  // 1. Créer le merchant dans BoohPay
  const boohpayResponse = await fetch('http://boohpay-api:3000/v1/internal/merchants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BOOHPAY_ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: subscriptionData.userName,
      apiKeyLabel: `SaaS User ${userId}`
    })
  });

  const { merchantId, apiKey } = await boohpayResponse.json();

  // 2. Stocker dans votre base de données
  await db.user.update({
    where: { id: userId },
    data: {
      boohpayMerchantId: merchantId,
      boohpayApiKey: apiKey, // À chiffrer !
      subscriptionStatus: 'active'
    }
  });

  // 3. Envoyer un email de bienvenue avec l'API Key
  await sendWelcomeEmail(userId, { merchantId, apiKey });
}

// Quand un utilisateur se désabonne
async function onUserUnsubscription(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  
  if (user.boohpayMerchantId) {
    // Optionnel : révoquer l'API Key ou marquer le merchant comme inactif
    // Note: BoohPay ne supprime pas les merchants pour conserver l'historique
  }
}
```

### Dans votre SaaS (Frontend - Interface utilisateur)

```typescript
// Section "Paiements" dans le dashboard utilisateur
async function fetchBoohPayInfo() {
  const user = await getCurrentUser();
  
  // Récupérer les stats depuis BoohPay
  const stats = await fetch(`http://boohpay-api:3000/v1/admin/transactions`, {
    headers: {
      'x-api-key': user.boohpayApiKey
    }
  });

  return stats.json();
}

// Afficher l'API Key (masquée par défaut)
function PaymentSettings() {
  const [apiKey, setApiKey] = useState('bpk_***');
  const [showKey, setShowKey] = useState(false);

  return (
    <div>
      <h2>Configuration des paiements</h2>
      <div>
        <label>API Key BoohPay</label>
        <input 
          type={showKey ? 'text' : 'password'} 
          value={apiKey}
          readOnly
        />
        <button onClick={() => setShowKey(!showKey)}>
          {showKey ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      
      <div>
        <h3>Instructions</h3>
        <p>Utilisez cette API Key dans votre e-commerce pour accepter les paiements.</p>
        <code>
          curl -X POST https://api.boohpay.com/v1/payments \\
            -H "x-api-key: {apiKey}" \\
            -H "Idempotency-Key: {unique-key}" \\
            -d '{"orderId": "ORD-123", ...}'
        </code>
      </div>
    </div>
  );
}
```

---

## Webhooks BoohPay → SaaS

BoohPay peut envoyer des webhooks à votre SaaS pour notifier les événements de paiement :

```typescript
// Dans votre SaaS, endpoint webhook
app.post('/webhooks/boohpay', async (req, res) => {
  // Vérifier la signature (si configurée)
  const signature = req.headers['x-boohpay-signature'];
  
  // Traiter l'événement
  const event = req.body;
  
  if (event.type === 'payment.succeeded') {
    // Mettre à jour la commande dans votre e-commerce
    await updateOrderStatus(event.payment.orderId, 'paid');
  }
  
  res.status(200).send('OK');
});
```

Configurer le webhook dans BoohPay :
```
PUT /v1/admin/merchants/{merchantId}/webhook
Body: {
  "webhookUrl": "https://your-saas.com/webhooks/boohpay",
  "webhookSecret": "your-secret"
}
```

---

## Sécurité

1. **API Keys** : Stockez les API Keys de manière chiffrée dans votre base de données
2. **Admin Token** : Gardez le `ADMIN_TOKEN` de BoohPay secret et utilisez-le uniquement côté serveur
3. **Webhooks** : Vérifiez toujours les signatures des webhooks
4. **HTTPS** : Utilisez toujours HTTPS pour les communications entre les services

---

## Prochaines étapes recommandées

1. **Créer un module d'intégration dédié** dans BoohPay pour simplifier l'intégration
2. **Ajouter un endpoint de synchronisation** pour mettre à jour les informations du merchant
3. **Créer un SDK** pour faciliter l'intégration depuis votre SaaS
4. **Documentation interactive** avec des exemples de code pour votre équipe

Souhaitez-vous que je crée ces endpoints d'intégration dédiés dans BoohPay ?

