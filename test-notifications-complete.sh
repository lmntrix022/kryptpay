#!/bin/bash

# Script de test complet pour les notifications
API_URL="${API_URL:-http://localhost:3000/v1}"
ADMIN_TOKEN="${ADMIN_TOKEN:-super-admin-secret-2025}"

echo "🧪 Test complet du système de notifications BoohPay"
echo "=================================================="
echo ""

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Créer ou récupérer un marchand
echo "1️⃣  Création/récupération d'un marchand de test..."
MERCHANT_RESPONSE=$(curl -s -X POST "${API_URL}/internal/merchants" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Merchant Notifications","apiKeyLabel":"test-notifications"}')

MERCHANT_ID=$(echo "$MERCHANT_RESPONSE" | jq -r '.merchantId // empty')
API_KEY=$(echo "$MERCHANT_RESPONSE" | jq -r '.apiKey // empty')

if [ -z "$MERCHANT_ID" ] || [ "$MERCHANT_ID" = "null" ]; then
  echo -e "${RED}❌ Échec de la création du marchand${NC}"
  echo "$MERCHANT_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Marchand créé: ${MERCHANT_ID}${NC}"
echo ""

# 2. Créer un utilisateur pour ce marchand
TEST_EMAIL="test-notifications-$(date +%s)@boohpay.test"
TEST_PASSWORD="Test1234!@#"

echo "2️⃣  Création d'un utilisateur de test..."
USER_RESPONSE=$(curl -s -X POST "${API_URL}/internal/users" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\",
    \"role\": \"MERCHANT\",
    \"merchantId\": \"${MERCHANT_ID}\"
  }")

if echo "$USER_RESPONSE" | jq -e '.error' > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Utilisateur peut-être déjà existant, on continue...${NC}"
else
  echo -e "${GREEN}✅ Utilisateur créé: ${TEST_EMAIL}${NC}"
fi
echo ""

# 3. Se connecter pour obtenir un token
echo "3️⃣  Connexion pour obtenir un token JWT..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"${TEST_PASSWORD}\"
  }")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Échec de la connexion${NC}"
  echo "$LOGIN_RESPONSE" | jq '.'
  exit 1
fi

echo -e "${GREEN}✅ Token obtenu avec succès${NC}"
echo ""

# 4. Récupérer les préférences de notification (création automatique)
echo "4️⃣  Récupération des préférences de notification..."
PREFERENCES_RESPONSE=$(curl -s -X GET "${API_URL}/admin/notifications/preferences" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "$PREFERENCES_RESPONSE" | jq '.'
echo ""

# 5. Mettre à jour les préférences
echo "5️⃣  Mise à jour des préférences (activer toutes les notifications)..."
UPDATE_RESPONSE=$(curl -s -X PUT "${API_URL}/admin/notifications/preferences" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentNotifications": true,
    "payoutNotifications": true,
    "refundNotifications": true,
    "systemNotifications": true,
    "customerNotifications": true,
    "emailEnabled": true,
    "smsEnabled": false,
    "pushEnabled": false
  }')

echo "$UPDATE_RESPONSE" | jq '.'
echo ""

# 6. Créer un payout pour déclencher une notification
echo "6️⃣  Création d'un payout de test (déclenchera une notification)..."
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

PAYOUT_ID=$(echo "$PAYOUT_RESPONSE" | jq -r '.payoutId // empty')

if [ -n "$PAYOUT_ID" ] && [ "$PAYOUT_ID" != "null" ]; then
  echo -e "${GREEN}✅ Payout créé: ${PAYOUT_ID}${NC}"
  echo "$PAYOUT_RESPONSE" | jq '.payoutId, .status'
else
  echo -e "${YELLOW}⚠️  Échec de la création du payout (peut être normal si SHAP n'est pas configuré)${NC}"
  echo "$PAYOUT_RESPONSE" | jq '.'
fi
echo ""

# 7. Attendre que la notification soit envoyée
echo "7️⃣  Attente de 3 secondes pour que la notification soit traitée..."
sleep 3
echo ""

# 8. Vérifier l'historique des notifications
echo "8️⃣  Vérification de l'historique des notifications..."
HISTORY_RESPONSE=$(curl -s -X GET "${API_URL}/admin/notifications/history?limit=10" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "$HISTORY_RESPONSE" | jq '.'
HISTORY_COUNT=$(echo "$HISTORY_RESPONSE" | jq -r '.total // 0')

if [ "$HISTORY_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✅ ${HISTORY_COUNT} notification(s) trouvée(s) dans l'historique${NC}"
else
  echo -e "${YELLOW}⚠️  Aucune notification dans l'historique (peut être normal si EMAIL_ENABLED=false)${NC}"
fi
echo ""

# 9. Récupérer les statistiques
echo "9️⃣  Récupération des statistiques des notifications..."
STATS_RESPONSE=$(curl -s -X GET "${API_URL}/admin/notifications/statistics" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "$STATS_RESPONSE" | jq '.'
echo ""

# 10. Test avec filtres
echo "🔟 Test de l'historique avec filtres (payout notifications uniquement)..."
FILTERED_RESPONSE=$(curl -s -X GET "${API_URL}/admin/notifications/history?limit=5&type=PAYOUT_STATUS" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

echo "$FILTERED_RESPONSE" | jq '.items[0] | {type, channel, status, recipient, subject}'
echo ""

echo -e "${GREEN}✅ Tests terminés !${NC}"
echo ""
echo "📋 Résumé:"
echo "  • Marchand ID: ${MERCHANT_ID}"
echo "  • Email test: ${TEST_EMAIL}"
echo "  • Payout créé: ${PAYOUT_ID:-N/A}"
echo "  • Notifications dans l'historique: ${HISTORY_COUNT}"
echo ""
echo "💡 Note: Les notifications email ne seront envoyées que si EMAIL_ENABLED=true"
echo "💡 Vérifiez votre configuration email dans le .env"


