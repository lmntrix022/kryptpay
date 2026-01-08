# BoohPay SDK

SDK JavaScript officiel pour intégrer facilement les paiements BoohPay dans votre application e-commerce. Supporte les cartes bancaires (via Stripe), Airtel Money, Moov Money et autres méthodes Mobile Money via Moneroo.

## 🚀 Installation

### Via npm (recommandé)

```bash
npm install @boohpay/sdk
```

### Via CDN

```html
<script src="https://cdn.boohpay.com/sdk/v1/boohpay-sdk.min.js"></script>
```

## 📖 Utilisation

### Intégration React (Recommandé)

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';

function CheckoutPage() {
  const handleSuccess = (response) => {
    console.log('Payment initiated:', response);
    // Redirection automatique pour 3DS ou Mobile Money
  };

  const handleError = (error) => {
    console.error('Payment error:', error);
  };

  return (
    <BoohPayCheckout
      config={{
        publishableKey: 'bpk_your_api_key_here', // Votre clé API BoohPay
        apiUrl: 'https://api.boohpay.com/api/v1', // Optionnel
        onStatusChange: (status, paymentId) => {
          console.log(`Payment ${paymentId} status: ${status}`);
        },
        onError: handleError,
      }}
      options={{
        amount: 10000, // Montant en unité mineure (100.00 XAF)
        currency: 'XAF',
        countryCode: 'GA',
        orderId: 'order_12345',
        customer: {
          email: 'client@example.com',
        },
        returnUrl: 'https://yourstore.com/payment/return',
      }}
      onSuccess={handleSuccess}
      onError={handleError}
      theme={{
        primaryColor: '#8b5cf6',
        buttonColor: '#7c3aed',
        fontFamily: 'Inter, sans-serif',
      }}
    />
  );
}
```

### Utilisation sans React (Vanilla JavaScript)

```javascript
import BoohPaySDK from '@boohpay/sdk';

const boohpay = new BoohPaySDK({
  publishableKey: 'bpk_test_your_publishable_key',
  apiUrl: 'https://api.boohpay.com/api/v1',
  onStatusChange: (status, paymentId) => {
    console.log(`Payment ${paymentId} status: ${status}`);
  },
  onError: (error) => {
    console.error('Error:', error);
  },
});

// Créer un paiement
async function checkout() {
  try {
    const response = await boohpay.checkout({
      amount: 10000,
      currency: 'XAF',
      countryCode: 'GA',
      orderId: 'order_12345',
      customer: {
        phone: '+241074398524',
        email: 'client@example.com',
      },
    });
    console.log('Payment response:', response);
  } catch (error) {
    console.error('Payment failed:', error);
  }
}
```

### Intégration HTML simple

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.boohpay.com/sdk/v1/boohpay-sdk.min.js"></script>
</head>
<body>
  <div id="boohpay-checkout"></div>
  <script>
    // Le SDK sera disponible globalement sous window.BoohPaySDK
    const boohpay = new BoohPaySDK({
      publishableKey: 'bpk_test_your_publishable_key',
    });

    boohpay.checkout({
      amount: 10000,
      currency: 'XAF',
      countryCode: 'GA',
      orderId: 'order_12345',
    });
  </script>
</body>
</html>
```

## 🎨 Personnalisation

### Thème personnalisé

Le composant React `BoohPayCheckout` accepte une prop `theme` pour personnaliser l'apparence :

```tsx
<BoohPayCheckout
  theme={{
    primaryColor: '#your-color',    // Couleur principale
    buttonColor: '#your-button',     // Couleur du bouton
    fontFamily: 'Your Font, sans-serif', // Police de caractères
  }}
  // ... autres props
/>
```

## 📋 API Reference

### `BoohPayCheckout` (React Component)

#### Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `config` | `BoohPaySDKConfig` | ✅ | Configuration du SDK |
| `options` | `PaymentOptions` | ✅ | Options de paiement |
| `onSuccess` | `(response: PaymentResponse) => void` | ❌ | Callback de succès |
| `onError` | `(error: Error) => void` | ❌ | Callback d'erreur |
| `className` | `string` | ❌ | Classe CSS supplémentaire |
| `theme` | `Theme` | ❌ | Personnalisation du thème |

### `BoohPaySDK` (Class)

#### Constructor

```typescript
new BoohPaySDK(config: BoohPaySDKConfig)
```

#### Methods

##### `checkout(options: PaymentOptions): Promise<PaymentResponse>`

Crée un nouveau paiement et gère les redirections automatiques si nécessaire.

### Types

#### `PaymentOptions`

```typescript
interface PaymentOptions {
  amount: number;              // Montant en unité mineure
  currency: string;            // Code devise ISO 4217
  countryCode: string;         // Code pays ISO 3166-1 alpha-2
  orderId: string;             // ID unique de la commande
  customer?: CustomerInfo;     // Informations client (optionnel)
  metadata?: Record<string, unknown>; // Métadonnées (optionnel)
  returnUrl?: string;          // URL de retour (optionnel)
}
```

#### `PaymentResponse`

```typescript
interface PaymentResponse {
  paymentId: string;
  status: 'PENDING' | 'AUTHORIZED' | 'SUCCEEDED' | 'FAILED';
  checkoutUrl?: string;
  checkoutPayload?: {
    url?: string;
    stripeClientSecret?: string;
    stripeAccount?: string;
  };
  providerReference?: string;
  message?: string;
}
```

## 🔒 Sécurité

### Tokenisation des cartes

⚠️ **Important** : Pour les paiements par carte, le SDK utilise Stripe Elements (si disponible) pour tokeniser les données sensibles. Les informations de carte ne transitent jamais directement vers votre serveur ou BoohPay.

### Clés API

- **Clé API (bpk_...)** : Utilisée côté client pour authentifier les requêtes. Peut être exposée dans le code frontend, mais doit être limitée aux opérations autorisées.
- ⚠️ **Sécurité** : Même si la clé API peut être utilisée côté client, assurez-vous de limiter les permissions et surveillez son utilisation via le dashboard.

## 🌍 Méthodes de paiement supportées

| Méthode | Pays supportés | Routage |
|---------|---------------|---------|
| 💳 Carte Bancaire | Tous | Stripe (3D Secure) |
| 📱 Airtel Money | GA, CM, CI, etc. | Direct ou via Moneroo |
| 📱 Moov Money | GA, CI, TG, etc. | Direct ou via Moneroo |
| 📱 Mobile Money (Générique) | Multi-pays | Via Moneroo (agrégateur) |

## 🔄 Flux de paiement

### Paiement par carte

1. Client saisit ses informations de carte
2. Validation côté client (Luhn, format, etc.)
3. Appel API BoohPay avec token Stripe
4. Si 3D Secure requis → Redirection automatique
5. Retour sur `returnUrl` avec statut

### Paiement Mobile Money

1. Client sélectionne la méthode (Airtel/Moov)
2. Saisie du numéro de téléphone
3. Validation du format selon le pays
4. Appel API BoohPay
5. Redirection vers l'interface de confirmation (si nécessaire)
6. Webhook envoyé à votre serveur au statut final

## 📡 Webhooks

Pour les paiements asynchrones (Mobile Money), configurez un webhook sur votre serveur :

```javascript
// Exemple Express.js
app.post('/webhooks/boohpay', (req, res) => {
  const { paymentId, status, providerReference } = req.body;
  
  // Vérifier la signature du webhook
  // Mettre à jour votre base de données
  // Notifier le client si nécessaire
  
  res.status(200).send('OK');
});
```

## 🐛 Codes d'erreur

| Code | Description | Action recommandée |
|------|-------------|-------------------|
| `NETWORK_ERROR` | Impossible de se connecter à l'API | Vérifier la connexion internet |
| `INVALID_API_KEY` | Clé API invalide | Vérifier votre publishableKey |
| `VALIDATION_ERROR` | Données de paiement invalides | Vérifier les champs requis |
| `PAYMENT_FAILED` | Échec du paiement | Informer l'utilisateur |
| `GATEWAY_ERROR` | Erreur du provider | Réessayer plus tard |

## 📚 Exemples

Consultez le dossier `/examples` pour des exemples complets d'intégration :
- React avec TypeScript
- Next.js
- Vue.js
- HTML vanilla

## 🤝 Support

- 📧 Email : support@boohpay.com
- 📖 Documentation : https://docs.boohpay.com
- 🐛 Issues : https://github.com/boohpay/sdk/issues

## 📄 Licence

MIT © BoohPay

