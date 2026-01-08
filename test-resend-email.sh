#!/bin/bash

# Script de test pour Resend
API_URL="${API_URL:-http://localhost:3000/v1}"
ADMIN_TOKEN="${ADMIN_TOKEN:-super-admin-secret-2025}"

echo "🧪 Test d'envoi d'email via Resend"
echo "==================================="
echo ""

# 1. Créer un marchand
echo "1️⃣  Création d'un marchand de test..."
MERCHANT_RESPONSE=$(curl -s -X POST "${API_URL}/internal/merchants" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Resend Email","apiKeyLabel":"test-resend"}')

MERCHANT_ID=$(echo "$MERCHANT_RESPONSE" | jq -r '.merchantId // empty')
API_KEY=$(echo "$MERCHANT_RESPONSE" | jq -r '.apiKey // empty')

if [ -z "$MERCHANT_ID" ] || [ "$MERCHANT_ID" = "null" ]; then
  echo "❌ Échec de la création du marchand"
  exit 1
fi

echo "✅ Marchand créé: ${MERCHANT_ID}"
echo ""

# 2. Créer un utilisateur avec email valide
TEST_EMAIL="test-resend-$(date +%s)@example.com"
echo "2️⃣  Création d'un utilisateur avec email: ${TEST_EMAIL}..."
USER_RESPONSE=$(curl -s -X POST "${API_URL}/internal/users" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"Test1234!@#\",
    \"role\": \"MERCHANT\",
    \"merchantId\": \"${MERCHANT_ID}\"
  }")

echo "$USER_RESPONSE" | jq '.'
echo ""

# 3. Créer un payout pour déclencher une notification
echo "3️⃣  Création d'un payout (déclenchera une notification email)..."
PAYOUT_RESPONSE=$(curl -s -X POST "${API_URL}/admin/payouts" \
  -H "x-api-key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentSystemName": "airtelmoney",
    "payeeMsisdn": "074398524",
    "amount": 1000,
    "currency": "XAF",
    "payoutType": "WITHDRAWAL",
    "provider": "SHAP"
  }')

PAYOUT_ID=$(echo "$PAYOUT_RESPONSE" | jq -r '.payoutId // empty')
STATUS=$(echo "$PAYOUT_RESPONSE" | jq -r '.status // empty')

echo "Payout ID: ${PAYOUT_ID}"
echo "Status: ${STATUS}"
echo ""

echo "⏳ Attente de 5 secondes pour traitement de la notification..."
sleep 5
echo ""

# 4. Vérifier l'historique des notifications
echo "4️⃣  Vérification de l'historique des notifications..."
HISTORY_RESPONSE=$(curl -s -X GET "${API_URL}/admin/notifications/history?limit=5" \
  -H "x-api-key: ${API_KEY}")

echo "$HISTORY_RESPONSE" | jq '{
  total,
  latest: .items[0] | {
    type,
    channel,
    status,
    recipient,
    subject,
    error: .errorMessage
  }
}'
echo ""

LATEST_STATUS=$(echo "$HISTORY_RESPONSE" | jq -r '.items[0].status // empty')

if [ "$LATEST_STATUS" = "SENT" ]; then
  echo "✅ Email envoyé avec succès via Resend !"
elif [ "$LATEST_STATUS" = "FAILED" ]; then
  echo "❌ Échec d'envoi. Vérifiez:"
  echo "   - Le domaine 'booh.ga' est vérifié dans Resend"
  echo "   - L'EMAIL_FROM correspond au domaine vérifié"
  echo "   - Les logs du serveur pour plus de détails"
else
  echo "⚠️  Statut: ${LATEST_STATUS}"
fi

echo ""
echo "💡 Vérifiez les logs du serveur pour plus de détails"
echo "💡 Si l'email n'est pas reçu, vérifiez le domaine dans Resend"


