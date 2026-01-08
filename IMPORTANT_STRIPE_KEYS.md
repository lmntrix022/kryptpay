# ⚠️ IMPORTANT : Configuration des clés Stripe

## Problème identifié

Les clés Stripe dans BoohPay ne correspondent pas à celles du frontend (booooh-main), ce qui cause l'erreur :
```
POST https://api.stripe.com/v1/payment_intents/pi_.../confirm 404 (Not Found)
```

## Solution

### 1. Récupérer les clés depuis Stripe Dashboard

1. Allez sur https://dashboard.stripe.com/test/apikeys
2. Vérifiez que vous êtes en mode **Test** (pas Live)
3. Vous devriez voir :
   - **Publishable key** : `pk_test_51SONpZEV1Rs...`
   - **Secret key** : `sk_test_51SONpZEV1Rs...` (cliquez sur "Reveal test key")

### 2. Mettre à jour BoohPay

Dans `/Users/valerie/Desktop/booh-pay/config/docker.env`, assurez-vous que :

```bash
STRIPE_SECRET_KEY=sk_test_51SONpZEV1Rs...  # La clé SECRÈTE correspondante
STRIPE_PUBLISHABLE_KEY=pk_test_51SONpZEV1Rs...  # La clé PUBLIQUE correspondante
```

**Important** : Les deux clés doivent provenir du même compte Stripe et commencer par le même préfixe (ici `51SONpZEV1Rs...`).

### 3. Vérifier le frontend

Dans `/Users/valerie/Desktop/booooh-main/.env`, vous devriez avoir :

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SONpZEV1Rs...
```

### 4. Redémarrer BoohPay

Après avoir mis à jour les clés :

```bash
cd /Users/valerie/Desktop/booh-pay
docker-compose restart
# ou si vous utilisez npm:
# npm run start:dev
```

## Vérification

Après redémarrage, testez la création d'un paiement. Vous devriez voir dans la console du navigateur :

```
🔑 BoohPay a retourné une clé publique Stripe: pk_test_51SONpZEV1Rs...
```

Et cette clé devrait correspondre à `VITE_STRIPE_PUBLISHABLE_KEY` du frontend.

## Note

- Les clés de **test** commencent par `pk_test_` et `sk_test_`
- Les clés de **production** commencent par `pk_live_` et `sk_live_`
- Ne mélangez jamais les clés de test et de production
- Les clés secrètes ne doivent jamais être commitées dans Git








