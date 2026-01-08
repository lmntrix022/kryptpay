# 🏪 Guide d'Intégration pour les Marchands

## 🎯 Vue d'Ensemble

Le composant SDK `BoohPayCheckout` fournit une **interface de paiement complète** que les marchands intègrent dans leurs propres sites. Le design est **personnalisable** via les props `theme`.

---

## 📦 Ce que Reçoivent les Marchands

### 1. Le Composant SDK

Les marchands intègrent `<BoohPayCheckout />` qui contient :
- ✅ Formulaire de paiement complet
- ✅ Validation automatique
- ✅ Gestion des erreurs
- ✅ Redirections 3DS/Mobile Money
- ✅ Styles intégrés (personnalisables)

### 2. Ce qui est Inclus

```tsx
// Ce que les marchands importent
import { BoohPayCheckout } from '@boohpay/sdk';

// Le composant contient déjà :
- Inputs numéro de carte
- Champs CVV et expiration
- Champs téléphone pour Mobile Money
- Validation en temps réel
- Messages d'erreur
- Bouton de paiement
- États de chargement
- Gestion des redirections
```

---

## 🎨 Personnalisation du Design

### Option 1 : Via les Props `theme`

```tsx
<BoohPayCheckout
  theme={{
    primaryColor: '#your-brand-color',    // Couleur principale
    buttonColor: '#your-button-color',    // Couleur bouton
    fontFamily: 'Your Font, sans-serif',   // Police
  }}
  // ...
/>
```

### Option 2 : Via CSS Custom

Le composant utilise des variables CSS personnalisables :

```css
.boohpay-checkout {
  --boohpay-primary: #your-color;
  --boohpay-font: 'Your Font';
}

/* Override des styles spécifiques */
.boohpay-checkout .payment-button {
  background: your-color;
  border-radius: your-radius;
}
```

### Option 3 : Wrapper Personnalisé

Les marchands peuvent wrap le composant dans leur propre container :

```tsx
<div className="mon-conteneur-de-paiement">
  <MaMiseEnPage />
  <BoohPayCheckout config={...} options={...} />
  <MesInformationsAdditionnelles />
</div>
```

---

## 🔍 Différence entre /demo et Sites Marchands

### Page /demo (BoohPay)
Ce que VOUS voyez dans `/demo` :

```tsx
// Page complète avec tout le contexte BoohPay
<div className="dashboard-page">
  <HeroSection />
  <ConfigurationApiKey />
  <SelecteurProvider />
  <BoohPayCheckout /> {/* Composant SDK ici */}
  <ResultatsEtDebugging />
  <InstructionsEtDocs />
</div>
```

### Site d'un Marchand
Ce que le MARCHAND intègre :

```tsx
// Juste le composant de paiement dans leur page
<div className="checkout-page">
  <MonHeader />
  <MonPanier />
  <BoohPayCheckout config={...} options={...} />
  <MesConditions />
  <MonFooter />
</div>
```

---

## 📋 Exemples d'Intégration

### Exemple 1 : Boutique E-Commerce Simple

```tsx
// pages/checkout.tsx
import { BoohPayCheckout } from '@boohpay/sdk';

export default function CheckoutPage() {
  return (
    <div className="checkout-container">
      <h1>Finaliser votre commande</h1>
      
      <BoohPayCheckout
        config={{
          publishableKey: process.env.NEXT_PUBLIC_BOOHPAY_KEY!,
          apiUrl: 'https://api.boohpay.com/v1',
        }}
        options={{
          amount: 25000,
          currency: 'XAF',
          countryCode: 'GA',
          orderId: `order_${Date.now()}`,
          customer: {
            email: 'client@example.com',
          },
          returnUrl: 'https://monsite.com/success',
        }}
        onSuccess={(response) => {
          window.location.href = '/payment/success';
        }}
        theme={{
          primaryColor: '#your-brand-purple',
        }}
      />
    </div>
  );
}
```

### Exemple 2 : Personnalisation Avancée

```tsx
<div className="custom-payment-wrapper">
  <MyHeader />
  
  {/* Wrapper personnalisé autour du SDK */}
  <div className="payment-section">
    <h2>Méthode de paiement</h2>
    
    <BoohPayCheckout
      className="custom-boohpay-styles"
      config={{ /* ... */ }}
      options={{ /* ... */ }}
      theme={{
        primaryColor: '#custom-color',
        buttonColor: '#custom-button',
        fontFamily: 'Roboto, sans-serif',
      }}
    />
  </div>
  
  {/* Styles personnalisés additionnels */}
  <style jsx>{`
    .payment-section {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    .custom-boohpay-styles :global(.payment-button) {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `}</style>
</div>
```

### Exemple 3 : Multi-Step Checkout

```tsx
function MultiStepCheckout() {
  const [step, setStep] = useState(1);
  
  return (
    <div className="checkout-flow">
      {step === 1 && (
        <DeliveryForm onNext={() => setStep(2)} />
      )}
      
      {step === 2 && (
        <div className="payment-step">
          <h3>Paiement</h3>
          <BoohPayCheckout
            config={{ /* ... */ }}
            options={{ /* ... */ }}
            onSuccess={() => setStep(3)}
          />
        </div>
      )}
      
      {step === 3 && (
        <ConfirmationPage />
      )}
    </div>
  );
}
```

---

## 🎨 Personnalisation CSS Complète

### Variables CSS Disponibles

```css
.boohpay-checkout {
  --boohpay-primary: #8b5cf6;      /* Couleur principale */
  --boohpay-font: inherit;          /* Police */
}
```

### Classes CSS Customisables

```css
/* Container principal */
.boohpay-checkout { }

/* Onglets méthode de paiement */
.boohpay-checkout .method-tabs { }
.boohpay-checkout .method-tab { }

/* Formulaire */
.boohpay-checkout .payment-form { }
.boohpay-checkout .form-group { }
.boohpay-checkout .form-input { }

/* Bouton */
.boohpay-checkout .payment-button { }

/* États */
.boohpay-checkout .loading { }
.boohpay-checkout .error { }
.boohpay-checkout .success { }
```

### Exemple d'Override Complet

```css
/* Personnaliser complètement le style */
.boohpay-checkout {
  --boohpay-primary: #your-brand-color;
}

.boohpay-checkout .method-tab {
  border-radius: 8px 8px 0 0;
  font-weight: 600;
}

.boohpay-checkout .payment-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 12px;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.boohpay-checkout .payment-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.boohpay-checkout .form-input {
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  transition: all 0.2s ease;
}

.boohpay-checkout .form-input:focus {
  border-color: var(--boohpay-primary);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}
```

---

## 🔐 Sécurité et Intégration

### Clés API

Les marchands obtiennent leur clé API dans le dashboard BoohPay et l'utilisent côté client :

```tsx
// La clé API est publique et sécurisée pour usage client
const sdk = new BoohPaySDK({
  publishableKey: 'bpk_live_...', // ✅ Public, OK côté client
  // Secret Key : JAMAIS exposée côté client
});
```

### Webhooks

Les marchands configurent leurs webhooks dans le dashboard pour recevoir les notifications :

```javascript
// Sur leur serveur
app.post('/webhooks/boohpay', (req, res) => {
  const { paymentId, status } = req.body;
  
  // Vérifier la signature
  // Mettre à jour la commande
  // Notifier le client
  
  res.status(200).send('OK');
});
```

---

## 📊 Comparaison

| Aspect | Page /demo | Site Marchand |
|--------|------------|---------------|
| **Design** | Complet avec branding BoohPay | Le leur |
| **Composant SDK** | ✅ Oui | ✅ Oui |
| **Configuration** | Interface complète | Props React |
| **APl Keys** | Interface de gestion | Dashboard BoohPay |
| **Debugging** | Console, logs | Leur choix |
| **Context** | Tests, démo | Production |

---

## 🚀 Checklist d'Intégration Marchand

### Prêt à l'intégration
- [ ] SDK installé (`@boohpay/sdk`)
- [ ] Clé API obtenue (dashboard)
- [ ] Compte marchand configuré
- [ ] Providers configurés (Stripe, etc.)

### Intégration
- [ ] Composant importé et configuré
- [ ] Thème personnalisé appliqué
- [ ] Webhooks configurés
- [ ] Callbacks `onSuccess` et `onError` gérés
- [ ] Tests en mode test effectués

### Production
- [ ] Clé API production obtenue
- [ ] Mode test désactivé
- [ ] Webhooks en production configurés
- [ ] Monitoring mis en place

---

## 📖 Ressources

- **SDK README** : `packages/boohpay-sdk/README.md`
- **Quick Start** : `packages/boohpay-sdk/QUICK_START.md`
- **Guide Complet** : `GUIDE_COMPLET_SDK.md`
- **Guide API** : `GUIDE_SDK_API.md`

---

## 💡 Récapitulatif

**Les marchands n'intègrent QUE le composant `BoohPayCheckout`** :
- ✅ Design personnalisable via `theme`
- ✅ Wrappable dans leur propre layout
- ✅ CSS customisable
- ✅ API complète pour intégration custom

**La page `/demo` est une démo complète** pour :
- Tester le SDK
- Voir les fonctionnalités
- Comprendre l'intégration

---

**Les marchands ont le contrôle total du design !** 🎨

