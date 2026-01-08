#!/bin/bash

# Script de test complet pour le système de webhooks

set -e

API_KEY="${API_KEY:-3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0}"
API_URL="http://localhost:3000/v1"
DB_CONTAINER="booh-pay-postgres-1"

echo "🧪 ========================================"
echo "🧪 TEST COMPLET : SYSTÈME DE WEBHOOKS"
echo "🧪 ========================================"
echo ""

# Étape 1: Récupérer ou créer un marchand
echo "📋 ÉTAPE 1: Configuration webhook URL pour un marchand"
echo "--------------------------------------------------------"
MERCHANT_ID=$(docker exec $DB_CONTAINER psql -U postgres -d boohpay -t -c "SELECT id FROM merchants LIMIT 1;" 2>/dev/null | xargs)

if [ -z "$MERCHANT_ID" ]; then
    echo "⚠️  Aucun marchand trouvé. Création d'un marchand de test..."
    MERCHANT_ID=$(docker exec $DB_CONTAINER psql -U postgres -d boohpay -t -c "INSERT INTO merchants (id, name) VALUES (gen_random_uuid(), 'Test Merchant') RETURNING id;" 2>/dev/null | xargs)
fi

if [ -n "$MERCHANT_ID" ]; then
    echo "✅ Merchant ID: $MERCHANT_ID"
    WEBHOOK_URL="https://webhook.site/$(openssl rand -hex 8)"
    echo "   Configuration webhook URL: $WEBHOOK_URL"
    
    docker exec $DB_CONTAINER psql -U postgres -d boohpay -c "UPDATE merchants SET webhook_url = '$WEBHOOK_URL', webhook_secret = 'test-secret-123' WHERE id = '$MERCHANT_ID';" > /dev/null 2>&1
    echo "✅ Webhook URL configuré avec succès"
    echo "   URL: $WEBHOOK_URL"
    echo "   Secret: test-secret-123"
else
    echo "❌ Impossible de récupérer/créer un marchand"
    exit 1
fi
echo ""

# Étape 2: Créer un paiement
echo "📋 ÉTAPE 2: Création d'un paiement"
echo "-----------------------------------"
IDEMPOTENCY_KEY="test-webhook-$(date +%s)"
ORDER_ID="order-webhook-$(date +%s)"

echo "   Order ID: $ORDER_ID"
echo "   Idempotency Key: $IDEMPOTENCY_KEY"

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
    STATUS=$(echo "$PAYMENT_RESPONSE" | jq -r '.status' 2>/dev/null)
    GATEWAY=$(echo "$PAYMENT_RESPONSE" | jq -r '.gatewayUsed' 2>/dev/null)
    echo "   Status: $STATUS"
    echo "   Gateway: $GATEWAY"
else
    echo "❌ Échec création paiement"
    echo "$PAYMENT_RESPONSE" | jq '.' 2>/dev/null || echo "$PAYMENT_RESPONSE"
    exit 1
fi
echo ""

# Étape 3: Créer un webhook delivery en PENDING
echo "📋 ÉTAPE 3: Création d'un webhook delivery en PENDING"
echo "------------------------------------------------------"
WEBHOOK_ID=$(docker exec $DB_CONTAINER psql -U postgres -d boohpay -t -c "INSERT INTO webhook_deliveries (id, merchant_id, event_type, payload, status, attempts, next_retry_at) VALUES (gen_random_uuid(), '$MERCHANT_ID', 'payment.succeeded', '{\"paymentId\":\"$PAYMENT_ID\",\"status\":\"SUCCEEDED\",\"amount\":5000,\"currency\":\"USD\"}'::jsonb, 'PENDING', 0, NOW()) RETURNING id;" 2>/dev/null | xargs)

if [ -n "$WEBHOOK_ID" ]; then
    echo "✅ Webhook delivery créé: $WEBHOOK_ID"
    echo "   Status: PENDING"
else
    echo "❌ Échec création webhook delivery"
    exit 1
fi
echo ""

# Étape 4: Vérifier que le webhook est en queue
echo "📋 ÉTAPE 4: Vérification que le webhook est en queue"
echo "-----------------------------------------------------"
echo "Webhooks en PENDING pour ce marchand:"
docker exec $DB_CONTAINER psql -U postgres -d boohpay -c "SELECT id, event_type, status, attempts, TO_CHAR(created_at, 'HH24:MI:SS') as created FROM webhook_deliveries WHERE merchant_id = '$MERCHANT_ID' AND status = 'PENDING' ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
echo ""

# Étape 5: Attendre le traitement automatique
echo "📋 ÉTAPE 5: Attente du traitement automatique (35 secondes)"
echo "-----------------------------------------------------------"
echo "Le scheduler cron traite les webhooks toutes les 30 secondes..."
echo ""
for i in {35..1}; do
    echo -ne "\r   ⏳ $i secondes restantes...  "
    sleep 1
done
echo -e "\r   ✅ Attente terminée                          "
echo ""

# Étape 6: Vérifier le résultat
echo "📋 ÉTAPE 6: Vérification du traitement"
echo "--------------------------------------"
echo "Statut des webhooks après traitement:"
docker exec $DB_CONTAINER psql -U postgres -d boohpay -c "SELECT id, event_type, status, attempts, http_status_code, TO_CHAR(delivered_at, 'HH24:MI:SS') as delivered, LEFT(error_message, 50) as error FROM webhook_deliveries WHERE merchant_id = '$MERCHANT_ID' ORDER BY created_at DESC LIMIT 3;" 2>/dev/null
echo ""

# Statistiques
echo "📊 STATISTIQUES FINALES"
echo "======================"
echo "Répartition par statut:"
docker exec $DB_CONTAINER psql -U postgres -d boohpay -c "SELECT status, COUNT(*) as count FROM webhook_deliveries GROUP BY status ORDER BY status;" 2>/dev/null
echo ""

# Résultat final
SUCCEEDED=$(docker exec $DB_CONTAINER psql -U postgres -d boohpay -t -c "SELECT COUNT(*) FROM webhook_deliveries WHERE merchant_id = '$MERCHANT_ID' AND status = 'SUCCEEDED';" 2>/dev/null | xargs)
PENDING=$(docker exec $DB_CONTAINER psql -U postgres -d boohpay -t -c "SELECT COUNT(*) FROM webhook_deliveries WHERE merchant_id = '$MERCHANT_ID' AND status = 'PENDING';" 2>/dev/null | xargs)
FAILED=$(docker exec $DB_CONTAINER psql -U postgres -d boohpay -t -c "SELECT COUNT(*) FROM webhook_deliveries WHERE merchant_id = '$MERCHANT_ID' AND status = 'FAILED';" 2>/dev/null | xargs)

echo "Résultats pour ce marchand:"
echo "  - SUCCEEDED: $SUCCEEDED"
echo "  - PENDING: $PENDING"
echo "  - FAILED: $FAILED"
echo ""

if [ "$SUCCEEDED" -gt 0 ]; then
    echo "✅ SUCCÈS: Webhooks livrés avec succès !"
elif [ "$FAILED" -gt 0 ]; then
    echo "⚠️  ATTENTION: Certains webhooks ont échoué (peut être normal si URL invalide)"
elif [ "$PENDING" -gt 0 ]; then
    echo "⏳ EN ATTENTE: Webhooks encore en queue"
    echo "   Le scheduler peut nécessiter plus de temps ou vérifier les logs de l'application"
else
    echo "ℹ️  Aucun webhook trouvé"
fi

echo ""
echo "✅ Test terminé !"


