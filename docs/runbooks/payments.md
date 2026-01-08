## Runbook – Traitement d’un paiement tenant (Stripe / Moneroo)

### Préparation
1. Merchant existant + API key (`x-api-key`).
2. Credentials configurés :
   - Stripe (payout automatique ou Connect)
   - Moneroo (clé API)
3. Stripe CLI en écoute (`stripe listen --forward-to localhost:3000/v1/webhooks/stripe`).

### Création d’un paiement carte (Stripe)
```bash
curl -X POST http://localhost:3000/v1/payments \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-001",
    "amount": 5000,
    "currency": "usd",
    "countryCode": "US",
    "paymentMethod": "CARD",
    "metadata": {"customer_id": "cus_demo"}
  }'
```
Réponse → récupérer `paymentId`.

### Confirmation (webhook Stripe)
```bash
stripe trigger payment_intent.succeeded \
  --add "payment_intent:metadata[boohpay_payment_id]=$PAYMENT_ID"
```

Vérification :
```bash
curl http://localhost:3000/v1/payments/$PAYMENT_ID \
  -H "x-api-key: $API_KEY"
```
→ `status: "SUCCEEDED"` / `events` contient `payment_intent.succeeded`.

### Dashboard / Agrégats
```bash
curl "http://localhost:3000/v1/admin/transactions?limit=20" \
  -H "x-api-key: $API_KEY"
```
Réponse : items, totals par passerelle & statut.

### Paiement Mobile Money (Moneroo – mock)
- Même endpoint `POST /v1/payments` avec `paymentMethod: "MOBILE_MONEY"` + `countryCode` Afrique.
- Status restera `PENDING` tant qu’aucun webhook Moneroo n’est reçu (mock à intégrer).

### Dépannage rapide
- `401 Unauthorized` → vérifier header `x-api-key`.
- `Stripe provider not configured` → `PUT /v1/providers/stripe/credentials`.
- `Webhook signature failed` → régénérer `STRIPE_WEBHOOK_SECRET` ou relancer `stripe listen`.
- Transaction bloquée `PENDING` → consulter `transaction_events` (via dashboard ou DB) pour comprendre l’étape.






