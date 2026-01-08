# 🧪 Guide de Test : Monitoring & Webhooks

## Prérequis

1. **Application démarrée** :
   ```bash
   npm run start:dev
   ```

2. **Services Docker actifs** :
   - PostgreSQL
   - Redis

3. **Migration appliquée** :
   ```bash
   npx prisma db push  # ou npx prisma migrate deploy
   ```

---

## Test 1 : Métriques Prometheus

### 1.1 Vérifier l'endpoint des métriques

```bash
curl http://localhost:3000/metrics
```

**Résultat attendu :**
- Métriques HTTP : `http_requests_total`, `http_request_duration_seconds`
- Métriques système : `process_cpu_user_seconds_total`, `process_resident_memory_bytes`
- Métriques custom BoohPay (initialisées à 0)

### 1.2 Créer un paiement pour générer des métriques

```bash
API_KEY="votre-api-key"
IDEMPOTENCY_KEY="test-$(date +%s)"
ORDER_ID="order-$(date +%s)"

curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"amount\": 5000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }"
```

### 1.3 Vérifier les métriques après paiement

```bash
curl http://localhost:3000/metrics | grep -E "payments_total|payments_by_gateway|http_requests_total"
```

**Résultat attendu :**
- `payments_total{gateway="STRIPE",status="PENDING"} 1`
- `payments_by_gateway_total{gateway="STRIPE"} 1`
- `http_requests_total{method="POST",route="/v1/payments",status="202"} 1`

---

## Test 2 : Webhooks aux Marchands

### 2.1 Configurer un webhook URL pour un marchand

Via SQL :
```sql
UPDATE merchants 
SET webhook_url = 'https://webhook.site/your-unique-id',
    webhook_secret = 'test-secret-123'
WHERE id = (SELECT id FROM merchants LIMIT 1);
```

Via API (si endpoint disponible) :
```bash
# À implémenter si nécessaire
```

### 2.2 Créer un paiement pour déclencher un webhook

```bash
API_KEY="votre-api-key"
IDEMPOTENCY_KEY="test-webhook-$(date +%s)"
ORDER_ID="order-webhook-$(date +%s)"

curl -X POST "http://localhost:3000/v1/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"amount\": 3000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }"
```

### 2.3 Simuler un changement de statut (webhook provider)

Pour tester la livraison, vous devez simuler un webhook d'un provider (Stripe, Moneroo) qui change le statut du paiement.

**Option 1 : Via Stripe CLI (si configuré)**
```bash
stripe trigger payment_intent.succeeded
```

**Option 2 : Via l'endpoint webhook Stripe**
```bash
# Utiliser le webhook secret pour signer
```

**Option 3 : Mettre à jour directement en DB (pour test)**
```sql
UPDATE transactions 
SET status = 'SUCCEEDED' 
WHERE id = 'payment-id';
```

### 2.4 Vérifier la queue de webhooks

Via SQL :
```sql
SELECT 
  id,
  merchant_id,
  event_type,
  status,
  attempts,
  created_at,
  next_retry_at
FROM webhook_deliveries
ORDER BY created_at DESC
LIMIT 10;
```

### 2.5 Attendre le traitement (30 secondes max)

Le scheduler cron traite les webhooks toutes les 30 secondes.

Vérifier à nouveau :
```sql
SELECT 
  id,
  status,
  attempts,
  http_status_code,
  delivered_at,
  error_message
FROM webhook_deliveries
WHERE status != 'PENDING'
ORDER BY created_at DESC;
```

### 2.6 Vérifier sur webhook.site

Si vous avez utilisé webhook.site, vérifiez que le webhook a été reçu avec :
- Header `X-BoohPay-Signature`
- Body avec `event`, `data`, `timestamp`

---

## Test 3 : Métriques Webhooks

### 3.1 Vérifier les métriques de webhooks

```bash
curl http://localhost:3000/metrics | grep -E "webhook|webhook_deliveries"
```

**Résultat attendu :**
- `webhooks_received_total{provider="STRIPE",type="payment_intent.succeeded"}`
- `webhook_deliveries_total{status="SUCCEEDED"}`
- `webhook_delivery_duration_seconds{merchant_id="..."}`

---

## Test 4 : Retry Logic

### 4.1 Configurer un webhook URL invalide

```sql
UPDATE merchants 
SET webhook_url = 'https://invalid-url-that-times-out.com/webhook'
WHERE id = (SELECT id FROM merchants LIMIT 1);
```

### 4.2 Déclencher un webhook

### 4.3 Vérifier les tentatives

```sql
SELECT 
  id,
  attempts,
  status,
  next_retry_at,
  error_message
FROM webhook_deliveries
WHERE status = 'PENDING'
ORDER BY attempts DESC;
```

**Attendu :**
- Maximum 5 tentatives
- Backoff exponentiel (1s, 2s, 4s, 8s, 16s)
- `next_retry_at` augmente progressivement

---

## Dépannage

### Métriques non accessibles

1. Vérifier que l'application est démarrée :
   ```bash
   curl http://localhost:3000/v1/health
   ```

2. Vérifier les logs pour erreurs :
   ```bash
   # Dans les logs de l'application
   ```

3. Vérifier que PrometheusModule est importé dans AppModule

### Webhooks non envoyés

1. Vérifier que le marchand a un `webhook_url` configuré :
   ```sql
   SELECT id, webhook_url FROM merchants;
   ```

2. Vérifier que le scheduler cron tourne :
   - Logs : `WebhookDeliveryScheduler` devrait s'exécuter toutes les 30 secondes

3. Vérifier Redis/Bull :
   ```bash
   docker exec booh-pay-redis-1 redis-cli PING
   ```

### Table webhook_deliveries manquante

```bash
npx prisma db push
# ou
npx prisma migrate deploy
```

---

## Checklist de Validation

- [ ] Endpoint `/metrics` accessible
- [ ] Métriques HTTP enregistrées après requêtes
- [ ] Métriques de paiement après création de paiement
- [ ] Table `webhook_deliveries` existe
- [ ] Colonnes `webhook_url` et `webhook_secret` dans `merchants`
- [ ] Webhook en queue après changement de statut
- [ ] Webhook traité par le scheduler (status change de PENDING à SUCCEEDED)
- [ ] Signature HMAC correcte dans le header
- [ ] Retry fonctionne (vérifier `attempts` et `next_retry_at`)
- [ ] Métriques webhooks enregistrées

---

## Exemples de Commandes Complètes

### Test complet end-to-end

```bash
#!/bin/bash

API_KEY="votre-api-key"
API_URL="http://localhost:3000/v1"
METRICS_URL="http://localhost:3000/metrics"

echo "1. Vérifier métriques initiales"
curl -s "$METRICS_URL" | grep "payments_total"

echo "2. Créer un paiement"
RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d "{
    \"orderId\": \"order-$(date +%s)\",
    \"amount\": 5000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }")

PAYMENT_ID=$(echo "$RESPONSE" | jq -r '.paymentId')
echo "Paiement créé: $PAYMENT_ID"

echo "3. Vérifier métriques après paiement"
sleep 2
curl -s "$METRICS_URL" | grep "payments_total"

echo "4. Vérifier webhooks en queue"
export PGPASSWORD=postgres
psql -h localhost -U postgres -d boohpay -c \
  "SELECT COUNT(*) as pending_webhooks FROM webhook_deliveries WHERE status = 'PENDING';"
```


