#!/bin/bash

# Script de test pour les notifications
# Nécessite un merchant ID et un token JWT valide

API_URL="${API_URL:-http://localhost:3000/v1}"
MERCHANT_ID="${MERCHANT_ID:-}"
ACCESS_TOKEN="${ACCESS_TOKEN:-}"

if [ -z "$MERCHANT_ID" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ ERREUR: MERCHANT_ID et ACCESS_TOKEN requis"
  echo "Usage: MERCHANT_ID=xxx ACCESS_TOKEN=xxx ./test-notifications.sh"
  exit 1
fi

echo "🧪 Test des notifications BoohPay"
echo "=================================="
echo ""

# 1. Récupérer les préférences de notification
echo "1️⃣  Récupération des préférences de notification..."
curl -s -X GET "${API_URL}/admin/notifications/preferences" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# 2. Mettre à jour les préférences
echo "2️⃣  Mise à jour des préférences (activer toutes les notifications)..."
curl -s -X PUT "${API_URL}/admin/notifications/preferences" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentNotifications": true,
    "payoutNotifications": true,
    "refundNotifications": true,
    "systemNotifications": true,
    "customerNotifications": true,
    "emailEnabled": true
  }' | jq '.'
echo ""
echo ""

# 3. Créer un payout pour tester les notifications
echo "3️⃣  Création d'un payout de test (déclenchera une notification)..."
PAYOUT_RESPONSE=$(curl -s -X POST "${API_URL}/admin/payouts" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"paymentSystemName\": \"airtelmoney\",
    \"payeeMsisdn\": \"074398524\",
    \"amount\": 1000,
    \"currency\": \"XAF\",
    \"payoutType\": \"WITHDRAWAL\",
    \"provider\": \"SHAP\"
  }")

echo "$PAYOUT_RESPONSE" | jq '.'
PAYOUT_ID=$(echo "$PAYOUT_RESPONSE" | jq -r '.payoutId // empty')
echo ""
echo ""

if [ -n "$PAYOUT_ID" ] && [ "$PAYOUT_ID" != "null" ]; then
  echo "✅ Payout créé: $PAYOUT_ID"
  echo "⏳ Attente de 3 secondes pour que la notification soit envoyée..."
  sleep 3
  echo ""
fi

# 4. Vérifier l'historique des notifications
echo "4️⃣  Vérification de l'historique des notifications..."
curl -s -X GET "${API_URL}/admin/notifications/history?limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# 5. Récupérer les statistiques
echo "5️⃣  Récupération des statistiques des notifications..."
curl -s -X GET "${API_URL}/admin/notifications/statistics" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

echo "✅ Tests terminés !"
echo ""
echo "💡 Vérifiez votre boîte email pour voir les notifications envoyées"
echo "💡 Consultez l'historique dans la réponse ci-dessus"


