#!/bin/bash

# Test simplifié du système de webhooks
# Utilise l'API et vérifie via les logs/endpoints

API_KEY="${API_KEY:-3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0}"
API_URL="http://localhost:3000/v1"

echo "🧪 TEST SYSTÈME DE WEBHOOKS"
echo "============================"
echo ""

echo "📋 ÉTAPE 1: Vérification que l'application fonctionne"
if curl -s "$API_URL/health" > /dev/null; then
    echo "✅ API accessible"
else
    echo "❌ API non accessible"
    exit 1
fi
echo ""

echo "📋 ÉTAPE 2: Création d'un paiement"
IDEMPOTENCY_KEY="test-webhook-$(date +%s)"
ORDER_ID="order-wh-$(date +%s)"

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
    echo "   Order ID: $ORDER_ID"
else
    echo "❌ Échec création paiement"
    exit 1
fi
echo ""

echo "📋 ÉTAPE 3: Vérification des métriques"
echo "   Les métriques devraient montrer le paiement créé"
sleep 2
METRICS=$(curl -s "http://localhost:3000/metrics" | grep "payments_total" | grep -v "#" | head -1)
if [ -n "$METRICS" ]; then
    echo "✅ Métriques: $METRICS"
else
    echo "⚠️  Aucune métrique trouvée"
fi
echo ""

echo "📋 ÉTAPE 4: Note sur les webhooks"
echo "   Pour tester complètement les webhooks:"
echo "   1. Configurer un webhook_url pour un marchand (via API ou DB)"
echo "   2. Simuler un changement de statut de paiement"
echo "   3. Vérifier que le webhook est en queue dans webhook_deliveries"
echo "   4. Attendre 30 secondes pour le traitement automatique"
echo ""

echo "✅ Test de base terminé !"
echo ""
echo "💡 Pour un test complet des webhooks, utilisez:"
echo "   - L'interface admin pour configurer webhook_url"
echo "   - Ou modifiez directement en base de données"
echo "   - Puis créez un paiement qui change de statut"


