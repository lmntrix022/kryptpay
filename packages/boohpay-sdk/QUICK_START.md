# Guide d'intégration rapide - BoohPay SDK

## Intégration en 5 minutes

### 1. Installation

```bash
npm install @boohpay/sdk
```

### 2. Obtenir votre clé publique

Connectez-vous à votre dashboard BoohPay et récupérez votre **Publishable Key** dans la section API.

### 3. Intégration basique

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';

function Checkout() {
  return (
    <BoohPayCheckout
      config={{
        publishableKey: 'bpk_your_api_key_here', // Obtenez votre clé API dans le Dashboard
        apiUrl: 'https://api.boohpay.com/api/v1', // Optionnel
      }}
      options={{
        amount: 10000,      // 100.00 XAF en unité mineure
        currency: 'XAF',
        countryCode: 'GA',  // Code pays ISO 3166-1 alpha-2
        orderId: 'order_123',
        returnUrl: 'https://yourstore.com/payment/return',
      }}
      onSuccess={(response) => {
        console.log('Payment created:', response);
      }}
    />
  );
}
```

### 4. Configurer les webhooks (Recommandé)

Pour recevoir les notifications de statut des paiements Mobile Money :

```javascript
// server.js (Express)
app.post('/webhooks/boohpay', async (req, res) => {
  const { paymentId, status, providerReference } = req.body;
  
  // Vérifier la signature du webhook (voir docs)
  // Mettre à jour votre base de données
  // Notifier le client
  
  res.status(200).send('OK');
});
```

Puis configurez l'URL dans votre dashboard BoohPay.

## Exemples de code

### Exemple React complet

```tsx
import { useState } from 'react';
import { BoohPayCheckout } from '@boohpay/sdk';

function PaymentPage() {
  const [orderId] = useState(`order_${Date.now()}`);
  
  return (
    <div className="checkout-container">
      <h1>Finaliser votre commande</h1>
      
      <BoohPayCheckout
        config={{
          publishableKey: process.env.NEXT_PUBLIC_BOOHPAY_KEY!,
          onStatusChange: (status, paymentId) => {
            console.log(`Payment ${paymentId}: ${status}`);
          },
          onError: (error) => {
            alert(`Erreur: ${error.message}`);
          },
        }}
        options={{
          amount: 25000,        // 250.00 XAF
          currency: 'XAF',
          countryCode: 'GA',    // Gabon
          orderId,
          customer: {
            email: 'client@example.com',
          },
          returnUrl: `${window.location.origin}/payment/return`,
          metadata: {
            cartId: 'cart_123',
            userId: 'user_456',
          },
        }}
        onSuccess={(response) => {
          // Redirection automatique gérée par le SDK
          if (response.checkoutUrl) {
            // Le SDK redirige automatiquement
          }
        }}
        theme={{
          primaryColor: '#your-brand-color',
        }}
      />
    </div>
  );
}
```

### Exemple sans React (Vanilla JS)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Checkout BoohPay</title>
  <script src="https://cdn.boohpay.com/sdk/v1/boohpay-sdk.min.js"></script>
</head>
<body>
  <button onclick="checkout()">Payer maintenant</button>

  <script>
    const boohpay = new BoohPaySDK({
      publishableKey: 'bpk_test_your_key',
      apiUrl: 'https://api.boohpay.com/api/v1',
    });

    async function checkout() {
      try {
        const response = await boohpay.checkout({
          amount: 10000,
          currency: 'XAF',
          countryCode: 'GA',
          orderId: 'order_' + Date.now(),
          customer: {
            phone: '+241074398524',
          },
        });
        
        console.log('Payment initiated:', response);
        // Redirection automatique si nécessaire
      } catch (error) {
        alert('Erreur: ' + error.message);
      }
    }
  </script>
</body>
</html>
```

## Configuration des environnements

### Test

```javascript
const config = {
  publishableKey: 'bpk_test_...',  // Clé de test
  apiUrl: 'https://api-test.boohpay.com/api/v1',
};
```

### Production

```javascript
const config = {
  publishableKey: 'bpk_live_...',  // Clé de production
  apiUrl: 'https://api.boohpay.com/api/v1',
};
```

## Dépannage

### Erreur "Invalid API Key"

Vérifiez que vous utilisez la **clé publique (Publishable Key)** et non la clé secrète.

### Les paiements ne fonctionnent pas

1. Vérifiez que votre compte marchand est activé
2. Vérifiez que les credentials des providers (Stripe, Moneroo, etc.) sont configurés
3. Consultez les logs dans votre dashboard BoohPay

### Webhooks non reçus

1. Vérifiez que l'URL du webhook est accessible publiquement
2. Vérifiez la signature du webhook
3. Consultez les logs de webhook dans le dashboard

## Support

- 📧 Email : support@boohpay.com
- 📖 Documentation complète : [docs.boohpay.com](https://docs.boohpay.com)
- 💬 Discord : [discord.gg/boohpay](https://discord.gg/boohpay)

