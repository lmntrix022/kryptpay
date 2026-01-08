# 🌍 Guide i18n - Localisation Multi-Langues

## ✅ Implémentation Terminée !

Le SDK BoohPay supporte maintenant **7 langues** avec détection automatique !

---

## 🎯 Langues Supportées

| Code | Langue | Status |
|------|--------|--------|
| `en` | English | ✅ Complet |
| `fr` | Français | ✅ Complet |
| `es` | Español | ⚠️ Partiel |
| `de` | Deutsch | ⚠️ Partiel |
| `pt` | Português | ⚠️ Partiel |
| `it` | Italiano | ⚠️ Partiel |
| `ar` | العربية | ⚠️ Partiel |

---

## 🚀 Usage

### Détection Automatique

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';

// La locale est détectée automatiquement depuis le navigateur
<BoohPayCheckout
  config={{ ... }}
  options={{ ... }}
/>
```

### Forcer une Locale

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';

<BoohPayCheckout
  config={{ ... }}
  options={{ ... }}
  locale="fr"  // Forcer le français
/>
```

### Utiliser les Traductions Manuellement

```tsx
import { useTranslation, detectLocale } from '@boohpay/sdk';

function MyComponent() {
  const locale = detectLocale(); // 'en', 'fr', etc.
  const { t } = useTranslation(locale);
  
  return (
    <div>
      <h1>{t('method.card')}</h1>
      <button>{t('button.pay')}</button>
    </div>
  );
}
```

---

## 📝 Clés de Traduction

### Champs Formulaire

```typescript
t('card.number')      // "Card Number" / "Numéro de carte"
t('card.expiry')      // "Expiry Date" / "Date d'expiration"
t('card.cvc')         // "CVC"
t('card.name')        // "Cardholder Name" / "Nom du titulaire"

t('mobile.phone')     // "Phone Number" / "Numéro de téléphone"
t('mobile.email')     // "Email (optional)" / "Email (optionnel)"
```

### Méthodes de Paiement

```typescript
t('method.card')      // "💳 Credit Card" / "💳 Carte Bancaire"
t('method.airtel')    // "📱 Airtel Money"
t('method.moov')      // "📱 Moov Money"
t('method.mobile')    // "📱 Mobile Money"
```

### Erreurs de Validation

```typescript
t('error.required')           // "This field is required" / "Ce champ est requis"
t('error.card.number')        // "Invalid card number" / "Numéro de carte invalide"
t('error.card.expiry')        // "Invalid expiry date" / "Date d'expiration invalide"
t('error.card.cvc')           // "Invalid CVC" / "CVC invalide"
t('error.phone')              // "Invalid phone number" / "Numéro de téléphone invalide"
t('error.email')              // "Invalid email address" / "Adresse email invalide"
```

### Messages

```typescript
t('success.title')    // "Payment Successful" / "Paiement réussi"
t('success.message')  // "Your payment was processed..." / "Votre paiement..."
t('error.title')      // "Payment Error" / "Erreur de paiement"
t('loading')          // "Processing..." / "Traitement en cours..."
```

### Boutons

```typescript
t('button.pay')           // "Pay" / "Payer"
t('button.processing')    // "Processing..." / "Traitement en cours..."
```

### Détection Opérateur

```typescript
t('detected.airtel')  // "Airtel Money detected" / "Airtel Money détecté"
t('detected.moov')    // "Moov Money detected" / "Moov Money détecté"
```

### Formats

```typescript
t('format.phone')     // "e.g. 07XXXXXX..." / "ex: 07XXXXXX..."
t('format.card')      // "e.g. 1234 5678..." / "ex: 1234 5678..."
t('format.expiry')    // "MM/YY" / "MM/AA"
```

---

## 🔧 Configuration

### Fichiers de Traduction

Les traductions sont dans : `packages/boohpay-sdk/src/lib/i18n.ts`

### Ajouter une Nouvelle Langue

```typescript
export const translations: Record<Locale, Record<string, string>> = {
  // ... existing translations
  zh: {  // Nouvelle langue: Chinois
    'card.number': '卡号',
    'button.pay': '支付',
    // ... toutes les autres clés
  },
};
```

### Ajouter une Nouvelle Clé

```typescript
export const translations: Record<Locale, Record<string, string>> = {
  en: {
    // ... existing
    'my.new.key': 'My translation',
  },
  fr: {
    // ... existing
    'my.new.key': 'Ma traduction',
  },
};
```

---

## 🧪 Tests

```typescript
import { detectLocale, translate } from '@boohpay/sdk';

// Test détection automatique
console.log(detectLocale()); // 'fr' si navigateur en français

// Test traduction directe
console.log(translate('fr', 'button.pay')); // "Payer"
console.log(translate('en', 'button.pay')); // "Pay"
```

---

## 📱 Exemple Complet

```tsx
import { BoohPayCheckout } from '@boohpay/sdk';

export function CheckoutPage() {
  return (
    <div>
      <h1>Finaliser votre paiement</h1>
      
      {/* Français */}
      <BoohPayCheckout
        locale="fr"
        config={{
          publishableKey: 'bpk_...',
          apiUrl: 'http://localhost:3000/v1',
        }}
        options={{
          amount: 25000,
          currency: 'XAF',
          countryCode: 'GA',
          orderId: 'order_123',
        }}
      />
      
      {/* English */}
      <BoohPayCheckout
        locale="en"
        config={{
          publishableKey: 'bpk_...',
          apiUrl: 'http://localhost:3000/v1',
        }}
        options={{
          amount: 25000,
          currency: 'XAF',
          countryCode: 'GA',
          orderId: 'order_124',
        }}
      />
    </div>
  );
}
```

---

## 🎯 Améliorations Futures

- [ ] Compléter les traductions ES, DE, PT, IT, AR
- [ ] Ajouter des langues africaines : Swahili, Hausa, Yoruba
- [ ] Support RTL pour l'arabe
- [ ] Formates de date/nombre localisés
- [ ] Traductions de la devise

---

## ✅ Checklist Production

- [x] Détection automatique de locale
- [x] Support de 7 langues
- [x] Hook React `useTranslation`
- [x] Fonction utilitaire `translate`
- [x] Fallback sur l'anglais
- [ ] Tests de traduction
- [ ] Validation des traductions

---

**🌍 Votre SDK est maintenant international ! 🎉**

