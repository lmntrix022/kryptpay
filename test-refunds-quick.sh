#!/bin/bash

# Script de test rapide pour les Refunds

API_URL="${API_URL:-http://localhost:3000/v1}"
API_KEY="${API_KEY:-test-key}"

echo "🧪 Test Rapide - Refunds"
echo "========================"
echo ""

if [ -z "$API_KEY" ] || [ "$API_KEY" == "test-key" ]; then
  echo "❌ Erreur: API_KEY non définie ou invalide"
  echo "Usage: export API_KEY='votre-clé-api' && ./test-refunds-quick.sh"
  exit 1
fi

# Test 1: Vérifier que le serveur répond
echo "1️⃣  Vérification du serveur..."
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/../health" 2>/dev/null)
if [ "$HEALTH" != "200" ]; then
  echo "❌ Serveur non accessible (HTTP $HEALTH)"
  echo "   Assurez-vous que le serveur tourne: npm run start:dev"
  exit 1
fi
echo "✅ Serveur accessible"
echo ""

# Test 2: Créer un paiement test
echo "2️⃣  Création d'un paiement de test..."
PAYMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Idempotency-Key: test-quick-$(date +%s)" \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORD-TEST-QUICK-'$(date +%s)'",
    "amount": 5000,
    "currency": "EUR",
    "countryCode": "FR",
    "paymentMethod": "CARD"
  }')

HTTP_CODE=$(echo "$PAYMENT_RESPONSE" | tail -n1)
BODY=$(echo "$PAYMENT_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "202" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Échec de création du paiement (Status: $HTTP_CODE)"
  echo "Response: $BODY"
  exit 1
fi

PAYMENT_ID=$(echo "$BODY" | grep -o '"paymentId":"[^"]*' | cut -d'"' -f4)
if [ -z "$PAYMENT_ID" ]; then
  echo "❌ Impossible d'extraire le Payment ID"
  echo "Response: $BODY"
  exit 1
fi

echo "✅ Paiement créé: $PAYMENT_ID"
echo ""

# Test 3: Vérifier le statut
echo "3️⃣  Vérification du statut du paiement..."
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/payments/$PAYMENT_ID" \
  -H "x-api-key: $API_KEY")

PAYMENT_STATUS=$(echo "$STATUS_RESPONSE" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
echo "   Statut actuel: $PAYMENT_STATUS"

if [ "$PAYMENT_STATUS" != "SUCCEEDED" ] && [ "$PAYMENT_STATUS" != "AUTHORIZED" ]; then
  echo ""
  echo "⚠️  ATTENTION: Le paiement doit être SUCCEEDED ou AUTHORIZED pour être remboursé"
  echo "   Statut actuel: $PAYMENT_STATUS"
  echo ""
  echo "   Pour tester avec Stripe:"
  echo "   1. Utilisez la carte de test: 4242 4242 4242 4242"
  echo "   2. Complétez le paiement via le client_secret retourné"
  echo "   3. Attendez que le webhook mette à jour le statut"
  echo ""
  echo "   OU utilisez un Payment ID existant avec statut SUCCEEDED:"
  echo "   PAYMENT_ID='votre-payment-id-succès' ./test-refund-only.sh"
  exit 0
fi

# Test 4: Créer un refund
echo ""
echo "4️⃣  Création d'un remboursement..."
REFUND_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/payments/$PAYMENT_ID/refund" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Test refund rapide"
  }')

HTTP_CODE_REFUND=$(echo "$REFUND_RESPONSE" | tail -n1)
BODY_REFUND=$(echo "$REFUND_RESPONSE" | sed '$d')

echo "   Status: $HTTP_CODE_REFUND"

if [ "$HTTP_CODE_REFUND" == "201" ]; then
  REFUND_ID=$(echo "$BODY_REFUND" | grep -o '"refundId":"[^"]*' | cut -d'"' -f4)
  REFUND_STATUS=$(echo "$BODY_REFUND" | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  REFUND_AMOUNT=$(echo "$BODY_REFUND" | grep -o '"amountMinor":[0-9]*' | cut -d':' -f2)
  
  echo "✅ Remboursement créé avec succès!"
  echo "   Refund ID: $REFUND_ID"
  echo "   Status: $REFUND_STATUS"
  echo "   Montant: $REFUND_AMOUNT minor units"
  echo ""
  echo "📧 Vérifiez les logs du serveur pour la notification email"
  echo ""
  echo "✅ TEST RÉUSSI!"
else
  echo "❌ Échec du remboursement"
  echo "Response: $BODY_REFUND"
  exit 1
fi


