#!/bin/bash

# Script de test complet pour toutes les fonctionnalités
# Usage: ./test-all-features.sh [TOKEN]
# Si pas de token, le script vous guidera pour en obtenir un

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/v1}"
TOKEN="${1:-}"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs de tests
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}🧪 Tests des Nouvelles Fonctionnalités BoohPay${NC}"
echo "=============================================="
echo ""

# Vérifier si le backend est accessible
echo -e "${YELLOW}📡 Vérification du backend...${NC}"
if ! curl -s "${API_BASE_URL%/v1}/v1/admin/transactions?limit=1" > /dev/null 2>&1; then
  echo -e "${RED}❌ Backend inaccessible sur ${API_BASE_URL}${NC}"
  echo "   Vérifiez que le serveur est en cours d'exécution : npm run start:dev"
  exit 1
fi
echo -e "${GREEN}✅ Backend accessible${NC}"
echo ""

# Si pas de token, demander à l'utilisateur
if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Token JWT requis pour les tests${NC}"
  echo ""
  echo "Pour obtenir un token :"
  echo "1. Ouvrez votre navigateur sur http://localhost:3001 (ou le port du frontend)"
  echo "2. Connectez-vous avec vos identifiants"
  echo "3. Ouvrez la console du navigateur (F12)"
  echo "4. Exécutez : localStorage.getItem('boohpay_auth')"
  echo "5. Copiez le token 'accessToken' du JSON"
  echo ""
  echo -e "${BLUE}Ou utilisez : ./test-all-features.sh VOTRE_TOKEN${NC}"
  echo ""
  read -p "Entrez votre token JWT (ou appuyez sur Entrée pour quitter) : " TOKEN
  
  if [ -z "$TOKEN" ]; then
    echo "Annulé."
    exit 0
  fi
fi

HEADERS=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

# Fonction helper pour tester un endpoint
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
  
  echo -e "${BLUE}📋 Test $TOTAL_TESTS: $description${NC}"
  echo "   $method $endpoint"
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "${HEADERS[@]}" "$API_BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "${HEADERS[@]}" -d "$data" "$API_BASE_URL$endpoint" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "   ${GREEN}✅ Succès ($http_code)${NC}"
    if [ -n "$body" ] && [ "$body" != "null" ] && [ "$body" != "[]" ]; then
      echo "   📄 Réponse: $(echo "$body" | head -c 150)..."
    fi
    PASSED_TESTS=$((PASSED_TESTS + 1))
  else
    echo -e "   ${RED}❌ Échec ($http_code)${NC}"
    echo "   📄 Erreur: $(echo "$body" | head -c 200)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
  fi
  echo ""
}

# 1. Tests Analytics
echo -e "${YELLOW}📊 1. TESTS ANALYTICS${NC}"
echo "-------------------"
test_endpoint "GET" "/admin/analytics/payments" "Analytics paiements"
test_endpoint "GET" "/admin/analytics/payouts" "Analytics payouts"
test_endpoint "GET" "/admin/analytics/combined" "Analytics combinés"

# Tests d'export (sans vérifier le contenu, juste le code HTTP)
echo -e "${BLUE}📋 Test export CSV (vérification du code HTTP)${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
csv_response=$(curl -s -w "\n%{http_code}" -o /tmp/analytics.csv "${HEADERS[@]}" "$API_BASE_URL/admin/analytics/payments/export/csv" 2>&1)
csv_code=$(echo "$csv_response" | tail -n1)
if [ "$csv_code" -ge 200 ] && [ "$csv_code" -lt 300 ]; then
  echo -e "   ${GREEN}✅ Export CSV réussi ($csv_code)${NC}"
  echo "   📄 Fichier sauvegardé dans /tmp/analytics.csv"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "   ${RED}❌ Export CSV échoué ($csv_code)${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

echo -e "${BLUE}📋 Test export PDF (vérification du code HTTP)${NC}"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
pdf_response=$(curl -s -w "\n%{http_code}" -o /tmp/analytics.pdf "${HEADERS[@]}" "$API_BASE_URL/admin/analytics/payments/export/pdf" 2>&1)
pdf_code=$(echo "$pdf_response" | tail -n1)
if [ "$pdf_code" -ge 200 ] && [ "$pdf_code" -lt 300 ]; then
  echo -e "   ${GREEN}✅ Export PDF réussi ($pdf_code)${NC}"
  echo "   📄 Fichier sauvegardé dans /tmp/analytics.pdf"
  PASSED_TESTS=$((PASSED_TESTS + 1))
else
  echo -e "   ${RED}❌ Export PDF échoué ($pdf_code)${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo ""

# 2. Tests Subscriptions
echo -e "${YELLOW}🔄 2. TESTS SUBSCRIPTIONS${NC}"
echo "----------------------"

test_endpoint "GET" "/admin/subscriptions?limit=10" "Lister subscriptions"

# Créer une subscription de test
SUBSCRIPTION_DATA=$(cat <<EOF
{
  "customerEmail": "test-subscription-$(date +%s)@example.com",
  "customerPhone": "+237612345678",
  "amountMinor": 10000,
  "currency": "XAF",
  "billingCycle": "MONTHLY",
  "isTestMode": true
}
EOF
)

test_endpoint "POST" "/admin/subscriptions" "Créer subscription" "$SUBSCRIPTION_DATA"
test_endpoint "GET" "/admin/subscriptions?status=ACTIVE" "Filtrer subscriptions par statut"
test_endpoint "GET" "/admin/subscriptions?customerEmail=test" "Filtrer subscriptions par email"
echo ""

# 3. Tests Sandbox
echo -e "${YELLOW}🧪 3. TESTS SANDBOX${NC}"
echo "----------------"

test_endpoint "GET" "/admin/sandbox/webhooks/examples" "Obtenir exemples de payloads"

# Simuler un webhook
WEBHOOK_DATA=$(cat <<EOF
{
  "endpoint": "https://example.com/webhook",
  "eventType": "payment_succeeded",
  "payload": {
    "id": "test_$(date +%s)",
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
echo -e "${YELLOW}🔍 4. TESTS FILTRES SAUVEGARDÉS${NC}"
echo "----------------------------"

test_endpoint "GET" "/admin/filters/saved" "Lister filtres sauvegardés"

# Créer un filtre sauvegardé
FILTER_DATA=$(cat <<EOF
{
  "name": "Test Filter $(date +%s)",
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
echo -e "${YELLOW}🔔 5. TESTS NOTIFICATIONS${NC}"
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
echo -e "${YELLOW}💳 6. TESTS TRANSACTIONS${NC}"
echo "---------------------"

test_endpoint "GET" "/admin/transactions?limit=10" "Lister transactions"
test_endpoint "GET" "/admin/transactions?isTestMode=true" "Filtrer transactions mode test"
test_endpoint "GET" "/admin/transactions?isTestMode=false" "Filtrer transactions production"
echo ""

# Résumé
echo "=============================================="
echo -e "${BLUE}📊 RÉSUMÉ DES TESTS${NC}"
echo "=============================================="
echo "Total de tests : $TOTAL_TESTS"
echo -e "${GREEN}Tests réussis : $PASSED_TESTS${NC}"
echo -e "${RED}Tests échoués : $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ Tous les tests sont passés !${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Certains tests ont échoué.${NC}"
  echo ""
  echo "📝 Notes:"
  echo "   - Vérifiez les logs du serveur pour plus de détails"
  echo "   - Certains tests peuvent échouer si les données de test n'existent pas"
  echo "   - Testez manuellement les pages UI dans le navigateur"
  exit 1
fi

