# 🔧 Fix des Erreurs de Credentials Providers

**Date** : 2025-01-27  
**Problèmes identifiés** : Erreurs d'authentification SHAP, eBilling et Moneroo

---

## 📋 Résumé des Erreurs

### 1. SHAP - `invalid_grant`
```
SHAP authentication failed: invalid_grant
```

**Cause probable** :
- Credentials invalides (api_id ou api_secret incorrects)
- Endpoint d'authentification incorrect
- Format de requête incorrect

### 2. eBilling - `Auth invalid`
```
eBilling test failed: Auth invalid
```

**Cause probable** :
- Username ou sharedKey incorrects
- Format Basic Auth incorrect
- Endpoint incorrect

### 3. Moneroo - Route introuvable
```
Moneroo error: The route v1/utils/payment/methods could not be found
```

**Cause** : L'endpoint `/v1/utils/payment/methods` n'existe pas dans l'API Moneroo.

---

## 🔍 Analyse du Code

### SHAP (`shap-onboarding.service.ts`)

**Endpoint actuel** : `${baseUrl}/auth`  
**Méthode** : POST  
**Body** : `{ api_id, api_secret }`

**Problème potentiel** : Le format de la requête ou l'endpoint peut être incorrect selon la documentation SHAP.

### eBilling (`ebilling-onboarding.service.ts`)

**Endpoint actuel** : `${baseUrl}/e_bills`  
**Méthode** : POST  
**Auth** : Basic Auth avec `username:sharedKey`

**Problème potentiel** : L'endpoint de test peut nécessiter un endpoint spécifique plutôt que de créer une facture.

### Moneroo (`moneroo-onboarding.service.ts`)

**Endpoint actuel** : `https://api.moneroo.io/v1/utils/payment/methods`  
**Problème** : ❌ Cette route n'existe pas dans l'API Moneroo

**Solution** : Utiliser un endpoint valide pour tester les credentials.

---

## ✅ Solutions Proposées

### Solution 1 : Moneroo - Utiliser un endpoint valide

L'endpoint `/v1/utils/payment/methods` n'existe pas. Utilisons plutôt un endpoint qui existe réellement dans l'API Moneroo.

**Options possibles** :
1. `/v1/wallets` - Liste des wallets (si disponible)
2. `/v1/account` - Informations du compte
3. `/v1/payments/initialize` - Endpoint de paiement (mais nécessite plus de paramètres)
4. Ne pas tester les credentials, juste les sauvegarder

**Recommandation** : Utiliser un endpoint simple qui nécessite uniquement l'authentification, ou désactiver le test automatique.

### Solution 2 : Améliorer la gestion des erreurs

Ajouter plus de détails dans les messages d'erreur pour faciliter le debugging.

### Solution 3 : Vérifier les endpoints avec la documentation

Vérifier la documentation officielle de chaque provider pour confirmer les endpoints corrects.

---

## 🛠️ Corrections à Apporter

### Correction 1 : Moneroo - Endpoint de test

**Fichier** : `src/modules/provider-credentials/moneroo-onboarding.service.ts`

**Option A** : Utiliser un endpoint qui existe (si disponible)
```typescript
// Essayer un endpoint plus simple
const testEndpoint = `${this.defaultBaseUrl}/v1/wallets`;
// ou
const testEndpoint = `${this.defaultBaseUrl}/v1/account`;
```

**Option B** : Désactiver le test automatique et juste valider le format
```typescript
async testCredentials(credentials: MonerooCredentials): Promise<MonerooTestResponse> {
  // Valider juste le format de la clé
  if (!credentials.secretKey || credentials.secretKey.length < 10) {
    return {
      success: false,
      message: 'Clé API secrète invalide (format incorrect)',
      credentialsValid: false,
    };
  }

  // Pour Moneroo, on ne peut pas vraiment tester sans créer un paiement
  // Donc on accepte si le format est correct
  return {
    success: true,
    message: 'Format de clé API valide. Les credentials seront testés lors du premier paiement.',
    credentialsValid: true,
  };
}
```

**Option C** : Utiliser l'endpoint de paiement avec des paramètres minimaux
```typescript
// Créer un paiement de test minimal
const testEndpoint = `${this.defaultBaseUrl}/v1/payments/initialize`;
// Mais cela nécessite plus de paramètres...
```

### Correction 2 : SHAP - Améliorer le diagnostic

**Fichier** : `src/modules/provider-credentials/shap-onboarding.service.ts`

Ajouter plus de détails dans les logs :
```typescript
if (!response.ok) {
  const errorText = await response.text().catch(() => '');
  this.logger.warn(`SHAP auth endpoint: ${authEndpoint}`);
  this.logger.warn(`SHAP response status: ${response.status}`);
  this.logger.warn(`SHAP response body: ${errorText}`);
  // ... reste du code
}
```

### Correction 3 : eBilling - Vérifier l'endpoint de test

**Fichier** : `src/modules/provider-credentials/ebilling-onboarding.service.ts`

Peut-être utiliser un endpoint de test spécifique plutôt que de créer une facture :
```typescript
// Option : Utiliser un endpoint de test si disponible
const testEndpoint = `${baseUrl}/test`; // ou `/health` ou `/status`
```

---

## 📝 Actions Immédiates

### Pour Moneroo (Priorité Haute)

1. **Vérifier la documentation Moneroo** pour trouver un endpoint de test valide
2. **Implémenter Option B** (validation de format) en attendant
3. **Ajouter un commentaire** expliquant que le test réel se fera lors du premier paiement

### Pour SHAP et eBilling

1. **Vérifier les credentials** dans les variables d'environnement
2. **Vérifier les URLs de base** (staging vs production)
3. **Tester manuellement** avec curl pour confirmer les endpoints

---

## 🧪 Tests à Effectuer

### Test SHAP
```bash
curl -X POST https://staging.billing-easy.net/shap/api/v1/merchant/auth \
  -H "Content-Type: application/json" \
  -d '{
    "api_id": "YOUR_API_ID",
    "api_secret": "YOUR_API_SECRET"
  }'
```

### Test eBilling
```bash
curl -X POST https://stg.billing-easy.com/api/v1/merchant/e_bills \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:sharedKey' | base64)" \
  -d '{
    "amount": "1",
    "payer_name": "Test",
    "payer_email": "test@test.com",
    "payer_msisdn": "061234567",
    "short_description": "Test",
    "external_reference": "TEST-123"
  }'
```

### Test Moneroo
```bash
# Tester avec un endpoint valide
curl -X GET https://api.moneroo.io/v1/wallets \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -H "Content-Type: application/json"
```

---

## 🔄 Plan d'Action

1. ✅ **Immédiat** : Corriger l'endpoint Moneroo (Option B recommandée)
2. ⏳ **Court terme** : Améliorer les messages d'erreur pour SHAP et eBilling
3. ⏳ **Moyen terme** : Vérifier la documentation officielle de chaque provider
4. ⏳ **Long terme** : Ajouter des tests unitaires pour chaque provider

---

## 📚 Documentation à Consulter

- **Moneroo API Docs** : https://docs.moneroo.io (vérifier les endpoints disponibles)
- **SHAP API Docs** : Documentation SHAP (vérifier le format d'authentification)
- **eBilling API Docs** : Documentation eBilling (vérifier les endpoints de test)

---

*Document créé le 2025-01-27*


























