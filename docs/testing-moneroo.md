# Guide de Test - Intégration Moneroo

Ce guide explique comment tester l'intégration Moneroo (paiements et payouts) dans BoohPay.

## Prérequis

1. **Credentials Moneroo** : Vous devez avoir une clé API secrète Moneroo (test ou production)
   - Obtenez-la depuis : https://moneroo.io/dashboard (section Développeurs)
   - Pour les tests, utilisez des clés sandbox

2. **API Key BoohPay** : Une clé API BoohPay valide pour votre merchant

## 1. Configuration dans le Dashboard

### 1.1 Onboarding Moneroo

1. Connectez-vous au dashboard BoohPay
2. Allez dans **Intégrations** (`/integrations`)
3. Cliquez sur **Configurer** sur la carte Moneroo
4. Entrez votre **Clé API secrète Moneroo**
5. Cliquez sur **Tester** pour valider les credentials
6. Si le test réussit, cliquez sur **Connecter**

### 1.2 Vérification

Vérifiez que Moneroo apparaît comme **"Connecté"** sur la page Intégrations.

## 2. Test des Paiements Moneroo

### 2.1 Créer un paiement via API

```bash
# Remplacez YOUR_BOOHPAY_API_KEY par votre clé API
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER-TEST-MONEROO-001",
    "amount": 10000,
    "currency": "XOF",
    "countryCode": "BJ",
    "paymentMethod": "MOBILE_MONEY",
    "returnUrl": "https://example.com/payment/callback",
    "customer": {
      "email": "test@example.com",
      "phone": "229XXXXXXXXX"
    },
    "metadata": {
      "provider": "MONEROO",
      "description": "Test payment Moneroo"
    }
  }'
```

**Réponse attendue :**
```json
{
  "paymentId": "uuid-here",
  "status": "PENDING",
  "checkoutPayload": {
    "type": "REDIRECT",
    "url": "https://checkout.moneroo.io/..."
  },
  "gatewayUsed": "MONEROO"
}
```

### 2.2 Tester avec différents pays

**Bénin (BJ) - MTN/Moov :**
```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER-BJ-001",
    "amount": 5000,
    "currency": "XOF",
    "countryCode": "BJ",
    "paymentMethod": "MOBILE_MONEY",
    "customer": {
      "email": "test@example.com",
      "phone": "229XXXXXXXXX"
    },
    "metadata": {
      "provider": "MONEROO"
    }
  }'
```

**Côte d'Ivoire (CI) :**
```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER-CI-001",
    "amount": 10000,
    "currency": "XOF",
    "countryCode": "CI",
    "paymentMethod": "MOBILE_MONEY",
    "customer": {
      "email": "test@example.com",
      "phone": "225XXXXXXXXX"
    },
    "metadata": {
      "provider": "MONEROO"
    }
  }'
```

### 2.3 Vérifier le statut d'un paiement

```bash
curl -X GET http://localhost:3000/v1/payments/PAYMENT_ID \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY"
```

## 3. Test des Payouts Moneroo

### 3.1 Créer un payout Moneroo

```bash
curl -X POST http://localhost:3000/v1/payouts \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentSystemName": "mtn_bj",
    "payeeMsisdn": "229XXXXXXXXX",
    "amount": 5000,
    "currency": "XOF",
    "payoutType": "WITHDRAWAL",
    "externalReference": "PAYOUT-TEST-001",
    "metadata": {
      "provider": "MONEROO",
      "customerEmail": "beneficiary@example.com",
      "customerName": "Jean DUPONT",
      "description": "Test payout Moneroo"
    }
  }'
```

**Réponse attendue :**
```json
{
  "payoutId": "uuid-here",
  "status": "PENDING",
  "providerReference": "moneroo-payout-id",
  "provider": "MONEROO"
}
```

### 3.2 Méthodes de paiement disponibles

**MTN MoMo Bénin :**
```json
{
  "paymentSystemName": "mtn_bj",
  "payeeMsisdn": "229XXXXXXXXX"
}
```

**Moov Money Bénin :**
```json
{
  "paymentSystemName": "moov_bj",
  "payeeMsisdn": "229XXXXXXXXX"
}
```

**MTN MoMo Côte d'Ivoire :**
```json
{
  "paymentSystemName": "mtn_ci",
  "payeeMsisdn": "225XXXXXXXXX"
}
```

**Orange Money Côte d'Ivoire :**
```json
{
  "paymentSystemName": "orange_ci",
  "payeeMsisdn": "225XXXXXXXXX"
}
```

### 3.3 Vérifier le statut d'un payout

```bash
curl -X GET http://localhost:3000/v1/payouts/PAYOUT_ID \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY"
```

### 3.4 Lister les payouts

```bash
# Lister tous les payouts
curl -X GET "http://localhost:3000/v1/payouts" \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY"

# Filtrer par provider
curl -X GET "http://localhost:3000/v1/payouts?provider=MONEROO" \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY"

# Filtrer par statut
curl -X GET "http://localhost:3000/v1/payouts?status=SUCCEEDED" \
  -H "Authorization: Bearer YOUR_BOOHPAY_API_KEY"
```

## 4. Test des Webhooks

### 4.1 Simuler un webhook Moneroo (Paiement)

Pour tester les webhooks, vous pouvez utiliser `ngrok` pour exposer votre serveur local :

```bash
# Installer ngrok si nécessaire
# https://ngrok.com/download

# Exposer le port 3000
ngrok http 3000
```

Ensuite, configurez l'URL webhook dans Moneroo : `https://your-ngrok-url.ngrok.io/webhooks/moneroo`

**Simulation manuelle d'un webhook :**

```bash
# Générer la signature (remplacez SECRET par votre MONEROO_WEBHOOK_SECRET)
PAYLOAD='{"event":"payment.success","data":{"id":"test_123","status":"success","metadata":{"boohpay_payment_id":"your-payment-id","order_id":"ORDER-001"}}}'
SECRET="your_webhook_secret"

# Calculer la signature HMAC-SHA256
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Envoyer le webhook
curl -X POST http://localhost:3000/webhooks/moneroo \
  -H "Content-Type: application/json" \
  -H "X-Moneroo-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### 4.2 Simuler un webhook Moneroo (Payout)

```bash
PAYLOAD='{"event":"payout.success","data":{"id":"payout_123","status":"success","metadata":{"boohpay_payout_id":"your-payout-id","external_reference":"PAYOUT-001"}}}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

curl -X POST http://localhost:3000/webhooks/moneroo/payout \
  -H "Content-Type: application/json" \
  -H "X-Moneroo-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

## 5. Test depuis le Dashboard

### 5.1 Tester les paiements

1. Allez sur la page **Démo** (`/demo`)
2. Configurez votre clé API
3. Sélectionnez **Moneroo** comme provider (via le gateway selector)
4. Créez un paiement de test

### 5.2 Tester les payouts

1. Allez sur la page **Paiements sortants** (`/payouts`)
2. Cliquez sur **Nouveau payout**
3. Remplissez le formulaire :
   - Système de paiement : `mtn_bj` (ou autre)
   - Numéro MSISDN : un numéro de test valide
   - Montant : ex. 1000 XOF
   - Métadonnées : ajoutez `"provider": "MONEROO"` dans le JSON

## 6. Numéros de Test Moneroo (Sandbox)

Selon la documentation Moneroo, pour tester en sandbox :

**Numéros de téléphone de test :**
- `(414)951-8161` - Transaction réussie (USD)
- `(414)951-8162` - Transaction en attente (USD)
- `(414)951-8163` - Transaction échouée (USD)

Pour les méthodes Mobile Money, consultez la documentation Moneroo pour les numéros de test spécifiques à chaque méthode.

## 7. Vérification des Logs

### Backend

Les logs Moneroo apparaîtront dans la console avec le préfixe :
```
[MonerooProviderService] ...
[MonerooPayoutProviderService] ...
```

### Dashboard

Ouvrez la console du navigateur (F12) pour voir les logs des appels API.

## 8. Erreurs Communes

### 8.1 "Moneroo credentials not configured"

**Solution :** Configurez les credentials depuis `/integrations` ou définissez `MONEROO_SECRET_KEY` dans les variables d'environnement.

### 8.2 "Invalid webhook signature"

**Solution :** Vérifiez que `MONEROO_WEBHOOK_SECRET` correspond au secret configuré dans Moneroo.

### 8.3 "Moneroo error: Invalid payment method"

**Solution :** Vérifiez que le `paymentSystemName` correspond à une méthode Moneroo valide (ex: `mtn_bj`, `moov_ci`, etc.).

### 8.4 Payout échoue avec "method not supported"

**Solution :** Vérifiez que la méthode de paiement existe dans la liste des méthodes Moneroo supportées. Consultez `moneroo-payout-provider.service.ts` pour la liste complète.

## 9. Checklist de Test

- [ ] Onboarding Moneroo réussi dans le dashboard
- [ ] Création d'un paiement Moneroo réussie
- [ ] Redirection vers checkout Moneroo fonctionne
- [ ] Webhook de paiement reçu et traité
- [ ] Création d'un payout Moneroo réussie
- [ ] Webhook de payout reçu et traité
- [ ] Statut des paiements/payouts mis à jour correctement
- [ ] Logs vérifiés sans erreur

## 10. Support

Pour plus d'informations :
- Documentation Moneroo : https://docs.moneroo.io
- Dashboard Moneroo : https://moneroo.io/dashboard
- Logs BoohPay : Vérifiez les logs NestJS pour plus de détails


