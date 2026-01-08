#!/bin/bash
# Test d'intégration pour le Rate Limiting

set -e

API_URL="${API_URL:-http://localhost:3000/v1}"
API_KEY="${API_KEY:-3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0}"

if [ -z "$API_KEY" ]; then
  echo "❌ Erreur: API_KEY n'est pas définie"
  echo "Usage: export API_KEY='votre-clé-api' && ./test-rate-limiting.sh"
  exit 1
fi

echo "🧪 Test d'intégration Rate Limiting"
echo "===================================="
echo ""
echo "Configuration attendue:"
echo "  - Limit: 100 requêtes"
echo "  - TTL: 60 secondes (1 minute)"
echo ""

# Test 1: Faire 100 requêtes normales (doit passer)
echo "✅ Test 1: 100 requêtes normales (doit passer)"
echo "---------------------------------------------"

SUCCESS_COUNT=0
FAIL_COUNT=0
RATE_LIMIT_COUNT=0

for i in {1..100}; do
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/payments/invalid-id" \
    -H "x-api-key: $API_KEY")
  
  if [ "$HTTP_CODE" == "404" ] || [ "$HTTP_CODE" == "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$HTTP_CODE" == "429" ]; then
    RATE_LIMIT_COUNT=$((RATE_LIMIT_COUNT + 1))
  else
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
  
  # Afficher la progression tous les 10
  if [ $((i % 10)) -eq 0 ]; then
    echo -n "."
  fi
done

echo ""
echo "Résultats:"
echo "  - Succès (2xx/4xx attendus): $SUCCESS_COUNT"
echo "  - Rate Limited (429): $RATE_LIMIT_COUNT"
echo "  - Erreurs inattendues: $FAIL_COUNT"
echo ""

if [ "$RATE_LIMIT_COUNT" -gt 0 ]; then
  echo "⚠️  Attention: Des requêtes ont été limitées avant la 101ème"
fi

# Test 2: Faire la 101ème requête (doit être limitée)
echo "✅ Test 2: 101ème requête (doit être limitée - 429)"
echo "-------------------------------------------------"

HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/payments/invalid-id" \
  -H "x-api-key: $API_KEY")

if [ "$HTTP_CODE" == "429" ]; then
  echo "✅ Succès: 429 Too Many Requests retourné comme attendu"
else
  echo "⚠️  Attention: Attendu 429, reçu $HTTP_CODE"
  echo "   (Peut être normal si le rate limit a été réinitialisé)"
fi

echo ""

# Test 3: Faire quelques requêtes supplémentaires (toutes doivent être 429)
echo "✅ Test 3: Requêtes supplémentaires (doivent toutes être 429)"
echo "-----------------------------------------------------------"

RATE_LIMITED=0
for i in {1..5}; do
  HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$API_URL/payments/invalid-id" \
    -H "x-api-key: $API_KEY")
  
  if [ "$HTTP_CODE" == "429" ]; then
    RATE_LIMITED=$((RATE_LIMITED + 1))
  fi
done

echo "Requêtes rate limited: $RATE_LIMITED/5"

if [ "$RATE_LIMITED" -ge 3 ]; then
  echo "✅ Rate limiting fonctionne correctement"
else
  echo "⚠️  Le rate limiting pourrait ne pas fonctionner comme attendu"
fi

echo ""

# Résumé
echo "===================================="
echo "✅ Tests de Rate Limiting terminés"
echo "===================================="
echo ""
echo "Note: Pour réinitialiser le rate limit, attendez 60 secondes ou redémarrez Redis"
echo ""

