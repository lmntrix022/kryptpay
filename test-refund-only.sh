#!/bin/bash

# Test rapide d'un refund sur un paiement existant

API_URL="${API_URL:-http://localhost:3000/v1}"
API_KEY="${API_KEY:-test-key}"

if [ -z "$1" ]; then
  echo "Usage: PAYMENT_ID='payment-id' ./test-refund-only.sh"
  echo "   OU: ./test-refund-only.sh payment-id"
  exit 1
fi

PAYMENT_ID="${PAYMENT_ID:-$1}"

if [ -z "$API_KEY" ] || [ "$API_KEY" == "test-key" ]; then
  echo "❌ Erreur: API_KEY non définie"
  echo "Usage: export API_KEY='votre-clé-api' && ./test-refund-only.sh $PAYMENT_ID"
  exit 1
fi

echo "🧪 Test Refund - Payment ID: $PAYMENT_ID"
echo "========================================"
echo ""

# Vérifier le paiement
echo "1️⃣  Vérification du paiement..."
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/payments/$PAYMENT_ID" \
  -H "x-api-key: $API_KEY")

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/payments/$PAYMENT_ID" \
  -H "x-api-key: $API_KEY")

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Paiement non trouvé (Status: $HTTP_CODE)"
  exit 1
fi

PAYMENT_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
AMOUNT=$(echo "$STATUS_RESPONSE" | grep -o '"amount":[0-9]*' | cut -d':' -f2)

echo "   Statut: $PAYMENT_STATUS"
echo "   Montant: $AMOUNT"
echo ""

if [ "$PAYMENT_STATUS" != "SUCCEEDED" ] && [ "$PAYMENT_STATUS" != "AUTHORIZED" ]; then
  echo "❌ Le paiement doit être SUCCEEDED ou AUTHORIZED pour être remboursé"
  echo "   Statut actuel: $PAYMENT_STATUS"
  exit 1
fi

# Créer le refund
echo "2️⃣  Création du remboursement..."
REFUND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/payments/$PAYMENT_ID/refund" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test refund - '$(date +'%Y-%m-%d %H:%M:%S')'"
  }')

HTTP_CODE_REFUND=$(echo "$REFUND_RESPONSE" | tail -n1)
BODY_REFUND=$(echo "$REFUND_RESPONSE" | sed '$d')

echo "   Status: $HTTP_CODE_REFUND"

if [ "$HTTP_CODE_REFUND" == "201" ]; then
  REFUND_ID=$(echo "$BODY_REFUND" | grep -o '"refundId":"[^"]*' | cut -d'"' -f4)
  REFUND_STATUS=$(echo "$BODY_REFUND" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  REFUND_AMOUNT=$(echo "$BODY_REFUND" | grep -o '"amountMinor":[0-9]*' | cut -d':' -f2)
  
  echo ""
  echo "✅ REMBOURSEMENT RÉUSSI!"
  echo "   Refund ID: $REFUND_ID"
  echo "   Status: $REFUND_STATUS"
  echo "   Montant: $REFUND_AMOUNT minor units"
  echo ""
  echo "📧 Notification email devrait être envoyée (vérifier les logs)"
  echo ""
  echo "📋 Réponse complète:"
  echo "$BODY_REFUND" | jq '.' 2>/dev/null || echo "$BODY_REFUND"
else
  echo ""
  echo "❌ Échec du remboursement"
  echo "Response: $BODY_REFUND"
  exit 1
fi


