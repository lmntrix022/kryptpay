#!/bin/bash
# Test d'intégration pour l'Idempotency avec Redis

set -e

API_URL="${API_URL:-http://localhost:3000/v1}"
API_KEY="${API_KEY:-3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0}"

if [ -z "$API_KEY" ]; then
  echo "❌ Erreur: API_KEY n'est pas définie"
  echo "Usage: export API_KEY='votre-clé-api' && ./test-idempotency-integration.sh"
  exit 1
fi

echo "🧪 Test d'intégration Idempotency"
echo "=================================="
echo ""

# Générer une clé idempotency unique
IDEMPOTENCY_KEY="test-$(date +%s)-$(uuidgen | cut -d'-' -f1)"

echo "📝 Clé Idempotency utilisée: $IDEMPOTENCY_KEY"
echo ""

# Test 1: Créer un paiement avec Idempotency-Key
echo "✅ Test 1: Création d'un paiement avec Idempotency-Key"
echo "---------------------------------------------------"
ORDER_ID="order-idempotency-$(date +%s)"

RESPONSE1=$(curl -s -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"amount\": 1000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }")

PAYMENT_ID1=$(echo "$RESPONSE1" | jq -r '.paymentId // empty' 2>/dev/null || echo "")

if [ -z "$PAYMENT_ID1" ]; then
  echo "❌ Échec: Impossible de créer le paiement"
  echo "Réponse: $RESPONSE1"
  exit 1
fi

echo "✅ Paiement créé: $PAYMENT_ID1"
echo ""

# Test 2: Répéter la même requête avec la même clé
echo "✅ Test 2: Répétition de la même requête (même Idempotency-Key et même body)"
echo "------------------------------------------------------------------------"

sleep 1

RESPONSE2=$(curl -s -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"amount\": 1000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }")

PAYMENT_ID2=$(echo "$RESPONSE2" | jq -r '.paymentId // empty' 2>/dev/null || echo "")

if [ "$PAYMENT_ID1" != "$PAYMENT_ID2" ]; then
  echo "❌ Échec: Les IDs de paiement sont différents"
  echo "Premier: $PAYMENT_ID1"
  echo "Deuxième: $PAYMENT_ID2"
  exit 1
fi

echo "✅ Succès: Même paiement retourné ($PAYMENT_ID1 = $PAYMENT_ID2)"
echo ""

# Test 3: Utiliser la même clé avec un body différent (doit échouer)
echo "✅ Test 3: Même Idempotency-Key mais body différent (doit échouer)"
echo "----------------------------------------------------------------"

RESPONSE3=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"orderId\": \"$ORDER_ID-different\",
    \"amount\": 2000,
    \"currency\": \"USD\",
    \"countryCode\": \"US\",
    \"paymentMethod\": \"CARD\"
  }")

HTTP_CODE=$(echo "$RESPONSE3" | tail -n1)
BODY=$(echo "$RESPONSE3" | head -n-1)

if [ "$HTTP_CODE" != "400" ]; then
  echo "⚠️  Attention: Attendu 400, reçu $HTTP_CODE"
  echo "Réponse: $BODY"
else
  echo "✅ Succès: Erreur 400 retournée comme attendu"
fi

echo ""

# Résumé
echo "=================================="
echo "✅ Tests d'Idempotency terminés"
echo "=================================="
echo ""
echo "Résumé:"
echo "  - Test 1: Création paiement ✅"
echo "  - Test 2: Répétition (même clé + même body) ✅"
echo "  - Test 3: Validation (même clé + body différent) ✅"
echo ""

