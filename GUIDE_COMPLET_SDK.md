# 📚 Guide Complet - SDK BoohPay

## 🎯 Vue d'Ensemble

BoohPay dispose d'un **SDK JavaScript/TypeScript complet** pour l'intégration facile des paiements dans vos applications. Le SDK supporte React, Next.js, Vue.js, et le vanilla JavaScript.

---

## 📦 Le SDK BoohPay

### Localisation
Le SDK est situé dans `packages/boohpay-sdk/` et est utilisé localement dans le monorepo.

### Structure
```
packages/boohpay-sdk/
├── src/
│   ├── index.ts                    # Point d'entrée principal
│   ├── types/index.ts              # Types TypeScript
│   ├── components/
│   │   └── BoohPayCheckout.tsx    # Composant React
│   └── utils/
│       ├── api.ts                  # Client API
│       └── validation.ts           # Validation des données
├── package.json
├── README.md                       # Documentation complète
├── QUICK_START.md                  # Guide rapide
└── tsconfig.json
```

---

## 🚀 Comment Utiliser le SDK

### 1. Installation

Le SDK est importé localement dans le dashboard :

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';
import type { PaymentResponse } from '@boohpay/sdk/types';
```

La configuration est faite dans `apps/dashboard/tsconfig.json` et `next.config.mjs`.

### 2. Utilisation Basique (React)

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';

function CheckoutPage() {
  return (
    <BoohPayCheckout
      config={{
        publishableKey: 'YOUR_API_KEY',
        apiUrl: 'http://localhost:3000/v1',
      }}
      options={{
        amount: 10000,        // 100.00 XAF
        currency: 'XAF',
        countryCode: 'GA',    // Gabon
        orderId: 'order_123',
        returnUrl: 'https://monapp.com/success',
      }}
      onSuccess={(response) => console.log('Succès:', response)}
      onError={(error) => console.error('Erreur:', error)}
    />
  );
}
```

### 3. Utilisation Avancée

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';
import { useState } from 'react';

function AdvancedCheckout() {
  const [paymentResult, setPaymentResult] = useState(null);

  return (
    <BoohPayCheckout
      config={{
        publishableKey: 'YOUR_API_KEY',
        apiUrl: 'http://localhost:3000/v1',
        onStatusChange: (status, paymentId) => {
          console.log(`Payment ${paymentId}: ${status}`);
        },
        onError: (error) => {
          console.error('SDK Error:', error);
        },
      }}
      options={{
        amount: 10000,
        currency: 'XAF',
        countryCode: 'GA',
        orderId: `order_${Date.now()}`,
        customer: {
          email: 'client@example.com',
          phone: '+237612345678',
        },
        metadata: {
          source: 'web',
          campaign: 'summer2024',
        },
        returnUrl: `${window.location.origin}/payment/return`,
      }}
      defaultMethod="CARD"           // Forcer une méthode
      hideMethodTabs={false}         // Afficher les onglets
      onSuccess={(response) => {
        setPaymentResult(response);
        // Traiter le succès
      }}
      onError={(error) => {
        alert(`Erreur: ${error.message}`);
      }}
      theme={{
        primaryColor: '#8b5cf6',
        buttonColor: '#7c3aed',
      }}
    />
  );
}
```

---

## 🧪 Comment Tester le SDK

### 1. Via la Page Demo (Recommandé)

La **page demo intégrée** (`/demo`) permet de tester le SDK en temps réel :

1. **Démarrer le backend** :
   ```bash
   cd /Users/valerie/Desktop/booh-pay
   npm run start:dev
   ```

2. **Démarrer le frontend** :
   ```bash
   cd apps/dashboard
   npm run dev
   ```

3. **Accéder à la page demo** :
   - Ouvrir `http://localhost:3001/demo`
   - Se connecter avec un compte valide
   - Créer une clé API dans `/integrations`
   - Tester les différents providers

### 2. Script de Test Automatique

```bash
# Tester les endpoints API directement
cd /Users/valerie/Desktop/booh-pay
./test-webhooks-simple.sh
```

### 3. Test Manuel avec cURL

```bash
# Créer un paiement de test
curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test-123",
    "amount": 10000,
    "currency": "XAF",
    "countryCode": "GA",
    "paymentMethod": "CARD",
    "returnUrl": "https://example.com/success"
  }'
```

### 4. Test dans le Dashboard

Le SDK est intégré et testé dans :
- ✅ `/demo` - Page de démonstration complète
- ✅ `/admin` - Création de paiements
- ✅ `/sandbox` - Simulation de webhooks

---

## 📖 API du SDK

### Composant React `BoohPayCheckout`

#### Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `config` | `BoohPaySDKConfig` | ✅ | Configuration du SDK |
| `options` | `PaymentOptions` | ✅ | Options de paiement |
| `onSuccess` | `(response: PaymentResponse) => void` | ❌ | Callback de succès |
| `onError` | `(error: Error) => void` | ❌ | Callback d'erreur |
| `defaultMethod` | `'CARD' \| 'MOBILE_MONEY'` | ❌ | Méthode par défaut |
| `hideMethodTabs` | `boolean` | ❌ | Cacher les onglets |
| `theme` | `Theme` | ❌ | Personnalisation |

### Classes et Méthodes

```typescript
// Instance SDK pour non-React
import BoohPaySDK from '@boohpay/sdk';

const sdk = new BoohPaySDK({
  publishableKey: 'bpk_...',
  apiUrl: 'http://localhost:3000/v1',
  onStatusChange: (status, paymentId) => {},
  onError: (error) => {},
});

// Créer un paiement
const response = await sdk.checkout({
  amount: 10000,
  currency: 'XAF',
  countryCode: 'GA',
  orderId: 'order_123',
});
```

---

## 🎨 Personnalisation

### Thème

```tsx
<BoohPayCheckout
  theme={{
    primaryColor: '#your-color',
    buttonColor: '#your-button',
    fontFamily: 'Your Font, sans-serif',
  }}
  // ...
/>
```

### Méthodes de Paiement

Le SDK détecte automatiquement les méthodes disponibles selon le pays et le gateway configuré :

- **Carte** (CARD) → Stripe
- **Mobile Money** (MOBILE_MONEY) → Moneroo / eBilling
  - Airtel Money
  - Moov Money

---

## 🔍 Types TypeScript

```typescript
// Options de paiement
interface PaymentOptions {
  amount: number;              // Montant en unité mineure
  currency: string;            // Code devise ISO
  countryCode: string;         // Code pays ISO
  orderId: string;             // ID de commande unique
  customer?: {                 // Optionnel
    email?: string;
    phone?: string;
    name?: string;
  };
  metadata?: Record<string, unknown>;  // Optionnel
  returnUrl?: string;          // Optionnel
}

// Réponse
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

---

## 🔒 Sécurité

### Clés API

- **Publishable Key** : Utilisable côté client pour les paiements
- **Secret Key** : Jamais exposée côté client

### Obtenir une Clé API

1. Se connecter au dashboard : `http://localhost:3001/login`
2. Aller dans `/integrations`
3. Créer une nouvelle clé API
4. **Copier immédiatement** (visible uniquement à la création)

---

## 🌍 Méthodes de Paiement Supportées

| Méthode | Pays | Gateway | Description |
|---------|------|---------|-------------|
| 💳 Carte | Tous | Stripe | Visa, Mastercard avec 3DS |
| 📱 Airtel Money | GA, CM, etc. | eBilling/Moneroo | Mobile Money Airtel |
| 📱 Moov Money | GA, CI, etc. | eBilling/Moneroo | Mobile Money Moov |

---

## 🐛 Tests et Debugging

### Cartes de Test Stripe

- **Succès** : `4242 4242 4242 4242`
- **3D Secure** : `4000 0025 0000 3155`
- **Refus** : `4000 0000 0000 0002`

### Mobile Money (Test)

Utiliser n'importe quel numéro valide formaté :
- Gabon : `074456389` ou `062435467`
- Moneroo (sandbox) : `4149518161`

### Logs et Debugging

```typescript
// Activer les logs détaillés
config={{
  publishableKey: 'YOUR_KEY',
  onStatusChange: (status, paymentId) => {
    console.log(`[BoohPay] ${paymentId}: ${status}`);
  },
  onError: (error) => {
    console.error('[BoohPay Error]', error);
  },
}}
```

---

## 📚 Documentation Complète

- **SDK README** : `packages/boohpay-sdk/README.md`
- **Quick Start** : `packages/boohpay-sdk/QUICK_START.md`
- **API Docs** : `docs/sdk_integration.md`
- **Guide API** : `GUIDE_SDK_API.md`

---

## ✅ Checklist de Test

- [ ] Backend démarré sur `http://localhost:3000`
- [ ] Frontend démarré sur `http://localhost:3001`
- [ ] Connexion au dashboard réussie
- [ ] Clé API créée et copiée
- [ ] Page `/demo` accessible
- [ ] Test paiement Stripe réussi
- [ ] Test paiement Mobile Money réussi
- [ ] Webhooks reçus (si configurés)

---

## 🎉 Résumé

**Le SDK BoohPay est complètement fonctionnel et prêt à l'emploi !**

✅ **Implémenté** :
- Composant React `BoohPayCheckout`
- Client API complet
- Validation des données
- Gestion d'erreurs robuste
- Support multi-providers
- Personnalisation du thème

✅ **Testé** :
- Page `/demo` fonctionnelle
- Intégration avec le backend
- Paiements Stripe
- Paiements Mobile Money
- Webhooks

🚀 **Prêt pour** :
- Développement local
- Tests
- Intégration dans d'autres apps
- Publication npm (à faire)

---

**Pour tester maintenant** :
```bash
# 1. Démarrer le backend
cd /Users/valerie/Desktop/booh-pay
npm run start:dev

# 2. Démarrer le frontend (nouveau terminal)
cd apps/dashboard
npm run dev

# 3. Ouvrir dans le navigateur
open http://localhost:3001/demo
```

