#!/bin/bash

# Script de test pour les nouvelles fonctionnalités
# Usage: ./test-new-features.sh [TOKEN]

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/v1}"
TOKEN="${1:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ Erreur: Token JWT requis"
  echo "Usage: ./test-new-features.sh <JWT_TOKEN>"
  exit 1
fi

HEADERS=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

echo "🧪 Tests des Nouvelles Fonctionnalités BoohPay"
echo "=============================================="
echo ""

# Fonction helper pour tester un endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  
  echo "📋 Test: $description"
  echo "   $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" "$API_BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${HEADERS[@]}" -d "$data" "$API_BASE_URL$endpoint")
  fi
  
  http_code=$(echo "$response" | tail -1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo "   ✅ Succès ($http_code)"
    if [ -n "$body" ] && [ "$body" != "null" ] && [ "$body" != "[]" ]; then
      echo "   📄 Réponse: $(echo "$body" | head -c 100)..."
    fi
  else
    echo "   ❌ Échec ($http_code)"
    echo "   📄 Erreur: $body"
  fi
  echo ""
}

# 1. Tests Analytics
echo "📊 1. TESTS ANALYTICS"
echo "-------------------"
test_endpoint "GET" "/admin/analytics/payments" "Analytics paiements"
test_endpoint "GET" "/admin/analytics/payouts" "Analytics payouts"
test_endpoint "GET" "/admin/analytics/combined" "Analytics combinés"
test_endpoint "GET" "/admin/analytics/payments/export/csv" "Export CSV paiements"
test_endpoint "GET" "/admin/analytics/payments/export/pdf" "Export PDF paiements"
echo ""

# 2. Tests Subscriptions
echo "🔄 2. TESTS SUBSCRIPTIONS"
echo "----------------------"

# Créer une subscription de test
SUBSCRIPTION_DATA=$(cat <<EOF
{
  "customerEmail": "test@example.com",
  "customerPhone": "+237612345678",
  "amountMinor": 10000,
  "currency": "XAF",
  "billingCycle": "MONTHLY",
  "isTestMode": true
}
EOF
)

test_endpoint "POST" "/admin/subscriptions" "Créer subscription" "$SUBSCRIPTION_DATA"
test_endpoint "GET" "/admin/subscriptions?limit=10" "Lister subscriptions"
test_endpoint "GET" "/admin/subscriptions?status=ACTIVE" "Filtrer subscriptions par statut"
test_endpoint "GET" "/admin/subscriptions?customerEmail=test@example.com" "Filtrer subscriptions par email"
echo ""

# 3. Tests Sandbox
echo "🧪 3. TESTS SANDBOX"
echo "----------------"

# Obtenir les exemples
test_endpoint "GET" "/admin/sandbox/webhooks/examples" "Obtenir exemples de payloads"

# Simuler un webhook
WEBHOOK_DATA=$(cat <<EOF
{
  "endpoint": "https://example.com/webhook",
  "eventType": "payment_succeeded",
  "payload": {
    "id": "test_123",
    "type": "payment.succeeded",
    "data": {
      "payment_id": "pay_test_123",
      "amount": 10000,
      "currency": "XAF"
    }
  }
}
EOF
)

test_endpoint "POST" "/admin/sandbox/webhooks/simulate" "Simuler webhook" "$WEBHOOK_DATA"
test_endpoint "GET" "/admin/sandbox/webhooks/history?limit=10" "Historique simulations"
echo ""

# 4. Tests Filtres sauvegardés
echo "🔍 4. TESTS FILTRES SAUVEGARDÉS"
echo "----------------------------"

test_endpoint "GET" "/admin/filters/saved" "Lister filtres sauvegardés"

# Créer un filtre sauvegardé
FILTER_DATA=$(cat <<EOF
{
  "name": "Test Filter",
  "type": "payment",
  "filters": {
    "status": "SUCCEEDED",
    "gateway": "STRIPE"
  },
  "isDefault": false
}
EOF
)

test_endpoint "POST" "/admin/filters/saved" "Créer filtre sauvegardé" "$FILTER_DATA"
echo ""

# 5. Tests Notifications
echo "🔔 5. TESTS NOTIFICATIONS"
echo "----------------------"

test_endpoint "GET" "/admin/notifications/preferences" "Obtenir préférences notifications"

# Mettre à jour les préférences
NOTIF_DATA=$(cat <<EOF
{
  "paymentNotifications": true,
  "payoutNotifications": true,
  "refundNotifications": false,
  "emailEnabled": true,
  "smsEnabled": false
}
EOF
)

test_endpoint "PUT" "/admin/notifications/preferences" "Mettre à jour préférences" "$NOTIF_DATA"
echo ""

# 6. Tests Transactions avec nouvelles colonnes
echo "💳 6. TESTS TRANSACTIONS"
echo "---------------------"

test_endpoint "GET" "/admin/transactions?limit=10" "Lister transactions"
test_endpoint "GET" "/admin/transactions?isTestMode=true" "Filtrer transactions mode test"
test_endpoint "GET" "/admin/transactions?isTestMode=false" "Filtrer transactions production"
echo ""

echo "✅ Tests terminés!"
echo ""
echo "📝 Notes:"
echo "   - Vérifiez les réponses dans les logs ci-dessus"
echo "   - Testez manuellement les pages UI dans le navigateur"
echo "   - Vérifiez les exports CSV/PDF dans le navigateur"

