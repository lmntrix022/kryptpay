# 🔧 TVA et Reversement : Gestion des Providers Partiellement Configurés

## 📋 Vue d'ensemble

Un marchand peut avoir configuré **seulement certains providers** (par exemple : juste eBilling et Shap, ou juste Moneroo). Ce document explique comment le système gère ces cas pour le **calcul de TVA** et le **reversement**.

---

## 🎯 Principe Fondamental

### ✅ Calcul de TVA : Indépendant des Providers

Le **calcul de TVA** fonctionne **toujours**, peu importe les providers configurés. Il dépend uniquement :
- Du **pays du vendeur** (sellerCountry)
- Du **pays de l'acheteur** (buyerCountry)
- De la **catégorie du produit**

**Le provider utilisé pour recevoir le paiement n'affecte pas le calcul de TVA.**

### ⚠️ Reversement : Dépend des Providers Disponibles

Le **reversement** nécessite qu'au moins **un provider de versement** soit configuré pour transférer la TVA vers l'administration fiscale.

---

## 📊 Scénarios par Configuration

### Scénario 1 : Juste eBilling + Shap ✅

**Configuration** :
- ✅ eBilling configuré (pour recevoir paiements Mobile Money Gabon)
- ✅ Shap configuré (pour versements Mobile Money Gabon)
- ❌ Moneroo non configuré
- ❌ Stripe non configuré

**Recevoir des Paiements** :
- ✅ **Oui** : Paiements Mobile Money depuis le Gabon via eBilling
- ❌ **Non** : Paiements depuis autres pays (Cameroun, Côte d'Ivoire, etc.)

**Calcul TVA** :
- ✅ **Oui** : Fonctionne pour tous les paiements reçus
- Le calcul utilise le pays du client pour déterminer le taux

**Reversement TVA** :
- ✅ **Vers Mobile Money** : Oui, via Shap
- ❌ **Vers compte bancaire** : Non, Stripe non disponible
- ✅ **Vers compte fiscal local** : Peut fonctionner via Shap si le compte est Mobile Money

**Recommandation** :
- Configurer un compte de reversement **Mobile Money** dans les paramètres TVA
- Ou configurer Stripe si reversement vers compte bancaire nécessaire

---

### Scénario 2 : Juste Moneroo ✅

**Configuration** :
- ✅ Moneroo configuré (pour recevoir paiements Mobile Money)
- ❌ eBilling non configuré
- ❌ Shap non configuré
- ❌ Stripe non configuré

**Recevoir des Paiements** :
- ✅ **Oui** : Paiements Mobile Money depuis pays supportés par Moneroo
  - Cameroun, Côte d'Ivoire, Sénégal, Ouganda, Tanzanie, Rwanda, etc.
- ❌ **Non** : Paiements depuis Gabon (nécessite eBilling)

**Calcul TVA** :
- ✅ **Oui** : Fonctionne pour tous les paiements reçus

**Reversement TVA** :
- ❌ **Problème** : Aucun provider de versement configuré
- **Solutions possibles** :
  1. Configurer Stripe pour reversement vers compte bancaire
  2. Configurer Moneroo comme provider de versement (si supporté)
  3. Utiliser le reversement **manuel** (marchand effectue le virement)

**Recommandation** :
- **Option A** : Configurer Stripe pour permettre reversement vers comptes bancaires
- **Option B** : Désactiver reversement automatique, utiliser reversement manuel

---

### Scénario 3 : eBilling + Stripe ✅

**Configuration** :
- ✅ eBilling configuré (pour recevoir paiements Gabon)
- ✅ Stripe configuré (pour versements bancaires)
- ❌ Shap non configuré
- ❌ Moneroo non configuré

**Recevoir des Paiements** :
- ✅ **Oui** : Paiements Mobile Money depuis Gabon via eBilling
- ✅ **Oui** : Paiements cartes bancaires via Stripe
- ❌ **Non** : Paiements Mobile Money depuis autres pays

**Calcul TVA** :
- ✅ **Oui** : Fonctionne pour tous les paiements reçus

**Reversement TVA** :
- ✅ **Vers compte bancaire** : Oui, via Stripe
- ❌ **Vers Mobile Money** : Non, Shap non disponible

**Recommandation** :
- Configurer un compte de reversement **bancaire (IBAN)** dans les paramètres TVA
- Ou configurer Shap si reversement vers Mobile Money nécessaire

---

### Scénario 4 : Tous les Providers Configurés ✅✅✅

**Configuration** :
- ✅ eBilling configuré
- ✅ Moneroo configuré
- ✅ Stripe configuré
- ✅ Shap configuré

**Recevoir des Paiements** :
- ✅ **Oui** : Tous les pays et méthodes supportés

**Calcul TVA** :
- ✅ **Oui** : Fonctionne pour tous

**Reversement TVA** :
- ✅ **Vers compte bancaire** : Via Stripe
- ✅ **Vers Mobile Money** : Via Shap ou Moneroo
- ✅ **Flexibilité maximale** : Le système choisit automatiquement le meilleur provider

---

## 🔄 Logique de Sélection du Provider pour le Reversement

### Algorithme de Détection (À Implémenter)

```typescript
// Pseudo-code pour la sélection du provider de reversement
function selectReversementProvider(
  accountType: 'bank' | 'mobile_money',
  sellerCountry: string,
  availableProviders: Provider[]
): Provider | null {
  
  if (accountType === 'bank') {
    // Compte bancaire : préférer Stripe
    if (availableProviders.includes('STRIPE')) {
      return 'STRIPE';
    }
    // Fallback : partenaire bancaire local si disponible
    return findLocalBankPartner(sellerCountry, availableProviders);
  }
  
  if (accountType === 'mobile_money') {
    // Mobile Money : préférer Shap pour Gabon
    if (sellerCountry === 'GA' && availableProviders.includes('SHAP')) {
      return 'SHAP';
    }
    // Sinon : Moneroo si disponible
    if (availableProviders.includes('MONEROO')) {
      return 'MONEROO';
    }
    // Fallback : Shap si disponible
    if (availableProviders.includes('SHAP')) {
      return 'SHAP';
    }
  }
  
  // Aucun provider disponible
  return null;
}
```

### Vérification des Providers Disponibles

```typescript
async function checkAvailableProviders(merchantId: string): Promise<Provider[]> {
  const available: Provider[] = [];
  
  // Vérifier Stripe
  try {
    const stripeCreds = await getStripeCredentials(merchantId);
    if (stripeCreds) available.push('STRIPE');
  } catch (e) {
    // Stripe non configuré
  }
  
  // Vérifier Moneroo
  try {
    const monerooCreds = await getMonerooCredentials(merchantId);
    if (monerooCreds) available.push('MONEROO');
  } catch (e) {
    // Moneroo non configuré
  }
  
  // Vérifier Shap
  try {
    const shapCreds = await getShapCredentials(merchantId);
    if (shapCreds) available.push('SHAP');
  } catch (e) {
    // Shap non configuré
  }
  
  // Vérifier eBilling (pour info, pas pour reversement)
  try {
    const ebillingCreds = await getEbillingCredentials(merchantId);
    if (ebillingCreds) available.push('EBILLING'); // Info seulement
  } catch (e) {
    // eBilling non configuré
  }
  
  return available;
}
```

---

## 🚨 Gestion des Cas d'Erreur

### Cas 1 : Aucun Provider de Reversement Disponible

**Situation** : Le marchand veut activer le reversement automatique, mais aucun provider de versement n'est configuré.

**Comportement actuel** : Le reversement échouera avec une erreur.

**Recommandation** :
1. **Vérifier les providers disponibles** avant d'activer le reversement automatique
2. **Afficher un avertissement** dans l'interface si aucun provider n'est disponible
3. **Suggérer** de configurer un provider (Stripe, Shap, ou Moneroo)

**Exemple d'implémentation** :
```typescript
async validateReversementConfiguration(merchantId: string): Promise<{
  canAutoReverse: boolean;
  availableProviders: Provider[];
  suggestions: string[];
}> {
  const availableProviders = await checkAvailableProviders(merchantId);
  const reversementProviders = availableProviders.filter(
    p => p !== 'EBILLING' // eBilling ne fait pas de reversement
  );
  
  const canAutoReverse = reversementProviders.length > 0;
  const suggestions: string[] = [];
  
  if (!canAutoReverse) {
    suggestions.push('Configurez Stripe pour reversement vers comptes bancaires');
    suggestions.push('Configurez Shap pour reversement vers Mobile Money (Gabon)');
    suggestions.push('Configurez Moneroo pour reversement vers Mobile Money (autres pays)');
  }
  
  return {
    canAutoReverse,
    availableProviders: reversementProviders,
    suggestions,
  };
}
```

### Cas 2 : Provider Disponible mais Compte Destinataire Incompatible

**Situation** : Le marchand a configuré Shap (Mobile Money) mais le compte de reversement est un IBAN (bancaire).

**Comportement recommandé** :
1. **Détecter le type de compte** depuis le format (IBAN vs numéro de téléphone)
2. **Suggérer le provider approprié** ou changer le compte
3. **Avertir** si le provider n'est pas disponible pour ce type de compte

**Exemple** :
```typescript
function detectAccountType(account: string): 'bank' | 'mobile_money' | 'unknown' {
  // Détecter IBAN (commence par 2 lettres + chiffres)
  if (/^[A-Z]{2}\d{2}/.test(account.replace(/\s/g, ''))) {
    return 'bank';
  }
  
  // Détecter numéro de téléphone (format international ou local)
  if (/^\+?[0-9]{8,15}$/.test(account.replace(/\s/g, ''))) {
    return 'mobile_money';
  }
  
  return 'unknown';
}

async validateReversementAccount(
  account: string,
  merchantId: string
): Promise<{
  valid: boolean;
  accountType: 'bank' | 'mobile_money' | 'unknown';
  compatibleProviders: Provider[];
  warning?: string;
}> {
  const accountType = detectAccountType(account);
  const availableProviders = await checkAvailableProviders(merchantId);
  
  let compatibleProviders: Provider[] = [];
  
  if (accountType === 'bank') {
    compatibleProviders = availableProviders.filter(p => p === 'STRIPE');
    if (compatibleProviders.length === 0) {
      return {
        valid: false,
        accountType,
        compatibleProviders: [],
        warning: 'Aucun provider disponible pour reversement vers compte bancaire. Configurez Stripe.',
      };
    }
  }
  
  if (accountType === 'mobile_money') {
    compatibleProviders = availableProviders.filter(p => 
      p === 'SHAP' || p === 'MONEROO'
    );
    if (compatibleProviders.length === 0) {
      return {
        valid: false,
        accountType,
        compatibleProviders: [],
        warning: 'Aucun provider disponible pour reversement vers Mobile Money. Configurez Shap ou Moneroo.',
      };
    }
  }
  
  return {
    valid: compatibleProviders.length > 0,
    accountType,
    compatibleProviders,
  };
}
```

---

## 💡 Recommandations par Cas d'Usage

### Cas d'Usage 1 : Marchand Gabonais (seulement Gabon)

**Configuration optimale** :
- ✅ eBilling (recevoir paiements Mobile Money Gabon)
- ✅ Shap (reversement vers Mobile Money)
- ✅ Stripe (optionnel, pour cartes bancaires et reversement bancaire)

**Reversement** :
- Compte Mobile Money → Shap
- Compte bancaire → Stripe

---

### Cas d'Usage 2 : Marchand Multi-Pays Afrique

**Configuration optimale** :
- ✅ Moneroo (recevoir paiements Mobile Money multi-pays)
- ✅ Stripe (recevoir cartes bancaires + reversement bancaire)
- ✅ eBilling (optionnel, si clients au Gabon)
- ✅ Shap (optionnel, si reversement vers Mobile Money Gabon)

**Reversement** :
- Compte bancaire → Stripe
- Compte Mobile Money Gabon → Shap
- Compte Mobile Money autres pays → Moneroo

---

### Cas d'Usage 3 : Marchand International

**Configuration optimale** :
- ✅ Stripe (recevoir cartes bancaires + reversement)
- ✅ Moneroo (optionnel, si clients en Afrique)
- ✅ eBilling (optionnel, si clients au Gabon)

**Reversement** :
- Compte bancaire → Stripe (recommandé)

---

## 🔧 Améliorations à Implémenter

### 1. Validation avant Activation du Reversement Automatique

```typescript
// Dans VatSettingsService
async canEnableAutoReversement(merchantId: string): Promise<{
  canEnable: boolean;
  reason?: string;
  suggestions?: string[];
}> {
  const availableProviders = await checkAvailableProviders(merchantId);
  const reversementProviders = availableProviders.filter(
    p => ['STRIPE', 'SHAP', 'MONEROO'].includes(p)
  );
  
  if (reversementProviders.length === 0) {
    return {
      canEnable: false,
      reason: 'Aucun provider de versement configuré',
      suggestions: [
        'Configurez Stripe dans Dashboard > Integrations pour reversement vers comptes bancaires',
        'Configurez Shap pour reversement vers Mobile Money (Gabon)',
        'Configurez Moneroo pour reversement vers Mobile Money (autres pays)',
      ],
    };
  }
  
  return { canEnable: true };
}
```

### 2. Détection Automatique du Provider de Reversement

```typescript
// Dans VatPaymentsService
async selectReversementProvider(
  merchantId: string,
  recipientAccount: string
): Promise<{
  provider: Provider;
  accountType: 'bank' | 'mobile_money';
}> {
  const accountType = detectAccountType(recipientAccount);
  const availableProviders = await checkAvailableProviders(merchantId);
  
  if (accountType === 'bank') {
    if (availableProviders.includes('STRIPE')) {
      return { provider: 'STRIPE', accountType };
    }
    throw new Error(
      'Aucun provider disponible pour reversement vers compte bancaire. Configurez Stripe.'
    );
  }
  
  if (accountType === 'mobile_money') {
    // Préférer Shap pour Gabon
    const vatSettings = await this.getVatSettings(merchantId);
    if (vatSettings?.sellerCountry === 'GA' && availableProviders.includes('SHAP')) {
      return { provider: 'SHAP', accountType };
    }
    if (availableProviders.includes('MONEROO')) {
      return { provider: 'MONEROO', accountType };
    }
    if (availableProviders.includes('SHAP')) {
      return { provider: 'SHAP', accountType };
    }
    throw new Error(
      'Aucun provider disponible pour reversement vers Mobile Money. Configurez Shap ou Moneroo.'
    );
  }
  
  throw new Error('Type de compte non reconnu. Utilisez un IBAN ou un numéro de téléphone.');
}
```

### 3. Interface Utilisateur : Avertissements et Suggestions

Dans la page `/vat/settings`, afficher :

- ✅ **Si reversement automatique activé mais aucun provider** :
  ```
  ⚠️ Avertissement : Aucun provider de versement configuré
  Pour activer le reversement automatique, configurez au moins un provider :
  - Stripe : pour comptes bancaires
  - Shap : pour Mobile Money (Gabon)
  - Moneroo : pour Mobile Money (autres pays)
  [Configurer maintenant] → Lien vers /integrations
  ```

- ✅ **Si compte destinataire incompatible avec providers disponibles** :
  ```
  ⚠️ Le compte de reversement semble être un compte bancaire (IBAN),
  mais Stripe n'est pas configuré. Configurez Stripe pour activer le reversement.
  ```

---

## 📋 Tableau Récapitulatif

| Configuration | Recevoir Paiements | Calcul TVA | Reversement Bancaire | Reversement Mobile Money |
|--------------|-------------------|------------|---------------------|-------------------------|
| **eBilling + Shap** | ✅ Gabon Mobile Money | ✅ | ❌ | ✅ Gabon (Shap) |
| **Moneroo seul** | ✅ Multi-pays Mobile Money | ✅ | ❌ | ❌ (Provider reversement manquant) |
| **eBilling + Stripe** | ✅ Gabon Mobile Money + Cartes | ✅ | ✅ (Stripe) | ❌ |
| **Tous les providers** | ✅ Tous pays/méthodes | ✅ | ✅ (Stripe) | ✅ (Shap/Moneroo) |

---

## ✅ Checklist de Configuration

Avant d'activer le reversement automatique, vérifier :

- [ ] Au moins **un provider de versement** est configuré (Stripe, Shap, ou Moneroo)
- [ ] Le **type de compte de reversement** correspond au provider disponible
- [ ] Les **credentials** du provider sont valides et actifs
- [ ] Le **compte de reversement** est correctement formaté (IBAN ou numéro téléphone)

---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025











