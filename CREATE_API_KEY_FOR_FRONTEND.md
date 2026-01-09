# 🔑 Créer une clé API pour l'application frontend

## Problème

L'application frontend (boohPay) reçoit une erreur 401 (Unauthorized) car la clé API est invalide ou manquante.

## Solution : Créer une clé API

### Option 1 : Via le Dashboard KryptPay (Recommandé)

1. **Connectez-vous au dashboard KryptPay** :
   - Allez sur `https://kryptpay-dashboard.onrender.com`
   - Connectez-vous avec un compte marchand (ex: `quantin@miscoch-it.ga`)

2. **Allez dans la section API Keys** :
   - Cliquez sur **Integrations** dans le menu
   - Ou allez directement sur **Integrations > API Keys**

3. **Créez une nouvelle clé API** :
   - Cliquez sur **"Créer une clé API"** ou **"Generate API Key"**
   - Donnez un nom/label à la clé (ex: "boohPay Frontend")
   - **⚠️ IMPORTANT** : Copiez la clé API immédiatement car elle ne sera affichée qu'une seule fois !

4. **Copiez la clé API complète** :
   - La clé ressemble à : `bpk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ Ne copiez PAS l'ID (UUID), mais la clé complète qui commence par `bpk_`

### Option 2 : Via l'API (si vous avez déjà une clé API ou un token JWT)

```bash
# Avec un token JWT (après connexion au dashboard)
curl -X POST https://kryptpay-api.onrender.com/v1/admin/api-keys \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"label": "boohPay Frontend"}'

# La réponse contiendra :
# {
#   "apiKey": "bpk_live_...",
#   "id": "uuid-..."
# }
```

## Configurer la clé API dans l'application frontend

### 1. Trouver où la clé API est configurée

Dans votre application frontend (boohPay), cherchez où la clé API est définie. Cela peut être dans :
- Un fichier `.env` ou `.env.local`
- Un fichier de configuration (ex: `config.ts`, `constants.ts`)
- Le code du client BoohPay (ex: `boohpay.client.ts`)

### 2. Mettre à jour la configuration

Remplacez l'ancienne clé API par la nouvelle clé que vous venez de créer :

```typescript
// Exemple dans boohpay.client.ts ou config
const API_KEY = 'bpk_live_VOTRE_NOUVELLE_CLE_ICI';
```

Ou dans un fichier `.env` :
```bash
BOOHPAY_API_KEY=bpk_live_VOTRE_NOUVELLE_CLE_ICI
```

### 3. Vérifier l'en-tête HTTP

Assurez-vous que l'application frontend envoie la clé API dans l'en-tête `x-api-key` :

```typescript
fetch('https://kryptpay-api.onrender.com/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY, // ← Important : en-tête x-api-key
    'Idempotency-Key': 'unique-key-here', // ← Requis aussi
  },
  body: JSON.stringify(paymentData),
});
```

## Vérification

Après avoir configuré la clé API :

1. **Testez un paiement** depuis votre application frontend
2. **Vérifiez les logs** dans le dashboard KryptPay pour voir si la clé est utilisée
3. **Vérifiez que l'erreur 401 a disparu**

## Dépannage

### Erreur : "Invalid API key format. You are using the API key ID instead of the actual API key"

**Solution** : Vous utilisez l'ID (UUID) au lieu de la clé complète. Utilisez la clé qui commence par `bpk_`.

### Erreur : "Invalid API key. Please verify that you are using the complete API key"

**Solutions possibles** :
1. La clé a été révoquée → Créez une nouvelle clé
2. La clé n'a pas été copiée complètement → Recréez une nouvelle clé
3. La clé est pour un autre marchand → Utilisez la clé du bon marchand

### Comment vérifier quelle clé API est utilisée

Dans les logs de votre application frontend, vérifiez l'en-tête `x-api-key` envoyé dans les requêtes.

## Note importante

- ⚠️ Les clés API sont sensibles, ne les commitez JAMAIS dans Git
- ⚠️ Chaque clé API est liée à un marchand spécifique
- ⚠️ Les clés API peuvent être révoquées depuis le dashboard
- ⚠️ La clé complète n'est affichée qu'une seule fois lors de la création
