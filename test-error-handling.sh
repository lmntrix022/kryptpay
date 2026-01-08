#!/bin/bash
# Test d'intégration pour l'Error Handling standardisé

set -e

API_URL="${API_URL:-http://localhost:3000/v1}"
API_KEY="${API_KEY:-3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0}"

if [ -z "$API_KEY" ]; then
  echo "❌ Erreur: API_KEY n'est pas définie"
  echo "Usage: export API_KEY='votre-clé-api' && ./test-error-handling.sh"
  exit 1
fi

echo "🧪 Test d'intégration Error Handling Standardisé"
echo "================================================"
echo ""

# Test 1: Requête invalide (validation error)
echo "✅ Test 1: Requête invalide (ValidationException)"
echo "------------------------------------------------"

RESPONSE1=$(curl -s -X POST "$API_URL/payments" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-error-$(date +%s)" \
  -d '{
    "orderId": "",
    "amount": -100
  }')

echo "Réponse:"
echo "$RESPONSE1" | jq '.' 2>/dev/null || echo "$RESPONSE1"
echo ""

# Vérifier le format
HAS_SUCCESS=$(echo "$RESPONSE1" | jq -r '.success // "not_found"' 2>/dev/null || echo "not_found")
HAS_ERROR=$(echo "$RESPONSE1" | jq -r '.error // "not_found"' 2>/dev/null || echo "not_found")
HAS_TIMESTAMP=$(echo "$RESPONSE1" | jq -r '.error.timestamp // "not_found"' 2>/dev/null || echo "not_found")
HAS_PATH=$(echo "$RESPONSE1" | jq -r '.error.path // "not_found"' 2>/dev/null || echo "not_found")

if [ "$HAS_SUCCESS" == "false" ] && [ "$HAS_ERROR" != "not_found" ]; then
  echo "✅ Format de réponse standardisé détecté"
else
  echo "⚠️  Le format de réponse pourrait ne pas être standardisé"
fi

echo ""

# Test 2: Ressource non trouvée (NotFoundException)
echo "✅ Test 2: Ressource non trouvée (NotFoundException)"
echo "--------------------------------------------------"

RESPONSE2=$(curl -s -X GET "$API_URL/payments/00000000-0000-0000-0000-000000000000" \
  -H "x-api-key: $API_KEY")

echo "Réponse:"
echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"
echo ""

# Test 3: Accès non autorisé (sans API key)
echo "✅ Test 3: Accès non autorisé (sans API key)"
echo "-------------------------------------------"

RESPONSE3=$(curl -s -X GET "$API_URL/payments/invalid-id")

echo "Réponse:"
echo "$RESPONSE3" | jq '.' 2>/dev/null || echo "$RESPONSE3"
echo ""

# Résumé
echo "================================================"
echo "✅ Tests d'Error Handling terminés"
echo "================================================"
echo ""
echo "Vérifiez manuellement que tous les formats de réponse contiennent:"
echo "  - success: false"
echo "  - error.code"
echo "  - error.message"
echo "  - error.statusCode"
echo "  - error.timestamp"
echo "  - error.path"
echo ""

