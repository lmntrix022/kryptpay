#!/bin/bash

# Script de test pour l'intégration Moneroo
# Usage: ./test-moneroo.sh YOUR_BOOHPAY_API_KEY

if [ -z "$1" ]; then
    echo "Usage: $0 YOUR_BOOHPAY_API_KEY"
    exit 1
fi

API_KEY=$1
BASE_URL=${BASE_URL:-http://localhost:3000}

echo "🧪 Test d'intégration Moneroo"
echo "================================"
echo ""

# Test 1: Créer un paiement
echo "1️⃣ Test création paiement Moneroo..."
PAYMENT_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/payments" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-MONEROO-'$(date +%s)'",
    "amount": 10000,
    "currency": "XOF",
    "countryCode": "BJ",
    "paymentMethod": "MOBILE_MONEY",
    "returnUrl": "https://example.com/callback",
    "customer": {
      "email": "test@example.com",
      "phone": "229XXXXXXXXX"
    },
    "metadata": {
      "provider": "MONEROO",
      "description": "Test payment"
    }
  }')

echo "$PAYMENT_RESPONSE" | jq '.' 2>/dev/null || echo "$PAYMENT_RESPONSE"
PAYMENT_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.paymentId' 2>/dev/null)

if [ -z "$PAYMENT_ID" ] || [ "$PAYMENT_ID" = "null" ]; then
    echo "❌ Échec création paiement"
    exit 1
fi

echo "✅ Paiement créé: $PAYMENT_ID"
echo ""

# Test 2: Vérifier le statut du paiement
echo "2️⃣ Test vérification statut paiement..."
curl -s -X GET "$BASE_URL/v1/payments/$PAYMENT_ID" \
  -H "Authorization: Bearer $API_KEY" | jq '.' 2>/dev/null || echo "Réponse non-JSON"
echo ""

# Test 3: Créer un payout
echo "3️⃣ Test création payout Moneroo..."
PAYOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/v1/payouts" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentSystemName": "mtn_bj",
    "payeeMsisdn": "229XXXXXXXXX",
    "amount": 5000,
    "currency": "XOF",
    "payoutType": "WITHDRAWAL",
    "externalReference": "PAYOUT-TEST-'$(date +%s)'",
    "metadata": {
      "provider": "MONEROO",
      "customerEmail": "test@example.com",
      "customerName": "Test User",
      "description": "Test payout"
    }
  }')

echo "$PAYOUT_RESPONSE" | jq '.' 2>/dev/null || echo "$PAYOUT_RESPONSE"
PAYOUT_ID=$(echo "$PAYOUT_RESPONSE" | jq -r '.payoutId' 2>/dev/null)

if [ -z "$PAYOUT_ID" ] || [ "$PAYOUT_ID" = "null" ]; then
    echo "❌ Échec création payout"
    exit 1
fi

echo "✅ Payout créé: $PAYOUT_ID"
echo ""

# Test 4: Vérifier le statut du payout
echo "4️⃣ Test vérification statut payout..."
curl -s -X GET "$BASE_URL/v1/payouts/$PAYOUT_ID" \
  -H "Authorization: Bearer $API_KEY" | jq '.' 2>/dev/null || echo "Réponse non-JSON"
echo ""

# Test 5: Lister les payouts Moneroo
echo "5️⃣ Test liste payouts Moneroo..."
curl -s -X GET "$BASE_URL/v1/payouts?provider=MONEROO&limit=5" \
  -H "Authorization: Bearer $API_KEY" | jq '.' 2>/dev/null || echo "Réponse non-JSON"
echo ""

echo "✅ Tests terminés!"
