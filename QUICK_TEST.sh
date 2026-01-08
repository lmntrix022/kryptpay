#!/bin/bash

# Script de test rapide pour Monitoring & Webhooks

API_KEY="${API_KEY:-3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0}"
API_URL="http://localhost:3000/v1"
METRICS_URL="http://localhost:3000/metrics"

echo "🧪 ========================================"
echo "🧪 TESTS MONITORING & WEBHOOKS"
echo "🧪 ========================================"
echo ""

# Test 1: Vérifier que l'API répond
echo "📋 Test 1: Vérification API"
if curl -s "$API_URL/health" > /dev/null 2>&1; then
    echo "✅ API accessible"
else
    echo "❌ API non accessible. Lancez: npm run start:dev"
    exit 1
fi
echo ""

# Test 2: Vérifier métriques Prometheus
echo "📋 Test 2: Métriques Prometheus"
METRICS_RESPONSE=$(curl -s "$METRICS_URL" 2>/dev/null)
if [ -n "$METRICS_RESPONSE" ]; then
    echo "✅ Endpoint /metrics accessible"
    echo "$METRICS_RESPONSE" | grep -q "http_requests_total" && echo "  ✅ Métriques HTTP présentes"
    echo "$METRICS_RESPONSE" | grep -q "payments_total" && echo "  ✅ Métriques paiements présentes"
else
    echo "❌ Endpoint /metrics non accessible"
fi
echo ""

# Test 3: Créer un paiement
echo "📋 Test 3: Création d'un paiement"
IDEMPOTENCY_KEY="test-$(date +%s)"
ORDER_ID="order-test-$(date +%s)"

PAYMENT_RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"amount\": 5000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }")

PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.paymentId // empty' 2>/dev/null)

if [ -n "$PAYMENT_ID" ]; then
    echo "✅ Paiement créé: $PAYMENT_ID"
    GATEWAY=$(echo "$PAYMENT_RESPONSE" | jq -r '.gatewayUsed' 2>/dev/null)
    STATUS=$(echo "$PAYMENT_RESPONSE" | jq -r '.status' 2>/dev/null)
    echo "   Gateway: $GATEWAY, Status: $STATUS"
else
    echo "❌ Échec création paiement"
    echo "$PAYMENT_RESPONSE" | jq '.' 2>/dev/null || echo "$PAYMENT_RESPONSE"
fi
echo ""

# Test 4: Vérifier métriques après paiement
echo "📋 Test 4: Métriques après paiement"
sleep 2
METRICS_AFTER=$(curl -s "$METRICS_URL" 2>/dev/null)

if [ -n "$METRICS_AFTER" ]; then
    PAYMENTS_TOTAL=$(echo "$METRICS_AFTER" | grep "payments_total" | grep -v "#" | head -1)
    if [ -n "$PAYMENTS_TOTAL" ]; then
        echo "✅ Métriques de paiement enregistrées:"
        echo "   $PAYMENTS_TOTAL"
    else
        echo "⚠️  Aucune métrique de paiement trouvée (peut prendre quelques secondes)"
    fi
fi
echo ""

# Test 5: Vérifier table webhook_deliveries
echo "📋 Test 5: Vérification table webhook_deliveries"
if command -v psql > /dev/null 2>&1 && [ -n "$PGPASSWORD" ]; then
    WEBHOOK_COUNT=$(psql -h localhost -U postgres -d boohpay -t -c "SELECT COUNT(*) FROM webhook_deliveries;" 2>/dev/null | tr -d ' ')
    if [ -n "$WEBHOOK_COUNT" ]; then
        echo "✅ Table webhook_deliveries accessible"
        echo "   Nombre de webhooks: $WEBHOOK_COUNT"
        
        if [ "$WEBHOOK_COUNT" -gt 0 ]; then
            echo ""
            echo "   Derniers webhooks:"
            psql -h localhost -U postgres -d boohpay -c \
              "SELECT id, event_type, status, attempts, created_at FROM webhook_deliveries ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
        fi
    else
        echo "⚠️  Impossible de vérifier la table (psql non disponible ou PGPASSWORD non défini)"
    fi
else
    echo "⚠️  psql non disponible ou PGPASSWORD non défini"
fi
echo ""

echo "========================================"
echo "✅ Tests terminés !"
echo "========================================"
echo ""
echo "📖 Pour plus de détails, voir: TEST_MONITORING_WEBHOOKS.md"


