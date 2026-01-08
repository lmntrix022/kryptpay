# 🍎🤖 Apple Pay & Google Pay - Guide d'Intégration

## ✅ Implémentation Terminée !

Le SDK BoohPay supporte maintenant **Apple Pay** et **Google Pay** via Stripe !

---

## 🎯 Fonctionnalités

- ✅ **Détection automatique** des wallets disponibles
- ✅ **Apple Pay** sur iOS/macOS Safari
- ✅ **Google Pay** via Payment Request API
- ✅ **Intégration Stripe** pour la tokenisation
- ✅ **UX native** optimisée

---

## 🚀 Usage

### Détecter les Wallets Disponibles

```tsx
import { detectAvailableWallets, isApplePayAvailable, isGooglePayAvailable } from '@boohpay/sdk';

function CheckoutPage() {
  const wallets = detectAvailableWallets();
  
  return (
    <div>
      {wallets.applePay && <button onClick={handleApplePay}>🍎 Apple Pay</button>}
      {wallets.googlePay && <button onClick={handleGooglePay}>🤖 Google Pay</button>}
    </div>
  );
}
```

### Initier Apple Pay

```tsx
import { initiateApplePay } from '@boohpay/sdk';

async function handleApplePay() {
  try {
    const paymentRequest = await initiateApplePay({
      stripePublishableKey: 'pk_test_...',
      amount: 10000,
      currency: 'XAF',
      countryCode: 'GA',
      merchantDisplayName: 'My Store',
      requiredBillingContactFields: ['name', 'email', 'phone'],
    });
    
    paymentRequest.on('token', async (event) => {
      const { token } = event;
      
      // Envoyer le token au backend
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token.id,
          amount: 10000,
          currency: 'XAF',
        }),
      });
      
      event.complete('success');
    });
    
    paymentRequest.show();
  } catch (error) {
    console.error('Apple Pay error:', error);
  }
}
```

### Initier Google Pay

```tsx
import { initiateGooglePay } from '@boohpay/sdk';

async function handleGooglePay() {
  try {
    const paymentRequest = await initiateGooglePay({
      stripePublishableKey: 'pk_test_...',
      amount: 10000,
      currency: 'XAF',
      countryCode: 'GA',
      merchantDisplayName: 'My Store',
    });
    
    paymentRequest.on('token', async (event) => {
      const { token } = event;
      
      // Envoyer le token au backend
      const response = await fetch('/api/payments', {
        method: 'POST',
        body: JSON.stringify({ token: token.id }),
      });
      
      event.complete('success');
    });
    
    paymentRequest.show();
  } catch (error) {
    console.error('Google Pay error:', error);
  }
}
```

---

## 🔧 Configuration Stripe

### Pour Apple Pay

1. **Stripe Dashboard** : Connect > Settings > Apple Pay
2. **Créer un domaine** : `monsite.com`
3. **Télécharger** le fichier de vérification
4. **Uploader** dans `/apple-developer-merchantid-domain-association`

### Pour Google Pay

1. **Stripe Dashboard** : Google Pay
2. Activer Google Pay
3. Configurer les environnements TEST / PRODUCTION

---

## 📱 Support par Plateforme

| Plateforme | Apple Pay | Google Pay |
|------------|-----------|------------|
| iOS Safari | ✅ Oui | ❌ Non |
| macOS Safari | ✅ Oui | ❌ Non |
| Chrome (Desktop) | ❌ Non | ✅ Oui |
| Chrome (Android) | ❌ Non | ✅ Oui |
| Firefox | ❌ Non | ⚠️ Partiel |
| Edge | ❌ Non | ✅ Oui |

---

## 🎨 Exemple Complet

```tsx
import React, { useEffect, useState } from 'react';
import {
  BoohPayCheckoutSecure,
  detectAvailableWallets,
  initiateApplePay,
  initiateGooglePay,
} from '@boohpay/sdk';

export function CheckoutPage() {
  const [wallets, setWallets] = useState({
    applePay: false,
    googlePay: false,
    digitalWallets: false,
  });
  const [amount] = useState(10000);
  
  useEffect(() => {
    setWallets(detectAvailableWallets());
  }, []);
  
  const handleApplePay = async () => {
    try {
      const paymentRequest = await initiateApplePay({
        stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY!,
        amount,
        currency: 'XAF',
        countryCode: 'GA',
        merchantDisplayName: 'My Store',
      });
      
      paymentRequest.on('token', async (event) => {
        // Process payment
        event.complete('success');
      });
      
      paymentRequest.show();
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleGooglePay = async () => {
    try {
      const paymentRequest = await initiateGooglePay({
        stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_KEY!,
        amount,
        currency: 'XAF',
        countryCode: 'GA',
        merchantDisplayName: 'My Store',
      });
      
      paymentRequest.on('token', async (event) => {
        event.complete('success');
      });
      
      paymentRequest.show();
    } catch (error) {
      console.error(error);
    }
  };
  
  return (
    <div>
      {wallets.applePay && (
        <button onClick={handleApplePay}>
          🍎 Apple Pay
        </button>
      )}
      
      {wallets.googlePay && (
        <button onClick={handleGooglePay}>
          🤖 Google Pay
        </button>
      )}
      
      {/* Fallback: Formulaire classique */}
      <BoohPayCheckoutSecure
        config={{...}}
        options={{...}}
        stripePublishableKey={process.env.NEXT_PUBLIC_STRIPE_KEY}
        useStripeElements={true}
      />
    </div>
  );
}
```

---

## 🔒 Sécurité

✅ **Tokenisation automatique** via Stripe
✅ **Aucune donnée de carte** collectée
✅ **PCI Compliance** complète
✅ **Chiffrement end-to-end**

---

## 🧪 Tests

### Apple Pay (Simulator)

```bash
# Utiliser iOS Simulator avec carte de test
# Configuration > Wallet & Apple Pay > Ajouter une carte
```

### Google Pay (Chrome)

```bash
# Tester avec Chrome DevTools > Application > Service Workers
# Utiliser les cartes de test Google Pay
```

---

## ✅ Checklist Production

- [x] Détection automatique des wallets
- [x] Support Apple Pay
- [x] Support Google Pay
- [x] Intégration Stripe
- [ ] Configuration domaine Apple Pay
- [ ] Tests avec cartes réelles
- [ ] Monitoring des erreurs

---

**🍎🤖 Votre SDK supporte maintenant les wallets natifs ! 🎉**

