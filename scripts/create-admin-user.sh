#!/bin/bash

# Script rapide pour créer un utilisateur ADMIN
# Usage: ADMIN_TOKEN='token' API_URL='https://...' ./scripts/create-admin-user.sh

set -e

API_URL="${API_URL:-https://kryptpay-api.onrender.com}"
ADMIN_TOKEN="${ADMIN_TOKEN}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Erreur: ADMIN_TOKEN n'est pas défini"
  echo ""
  echo "Obtenez ADMIN_TOKEN depuis Render Dashboard:"
  echo "  Render Dashboard → kryptpay-api → Environment → ADMIN_TOKEN"
  exit 1
fi

echo "👤 Création d'un utilisateur ADMIN"
echo "📍 API: $API_URL"
echo ""

read -p "Email: " email
read -sp "Mot de passe: " password
echo ""

response=$(curl -s -X POST "$API_URL/internal/users" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d "{
    \"email\": \"$email\",
    \"password\": \"$password\",
    \"role\": \"ADMIN\"
  }")

user_id=$(echo $response | jq -r '.id // empty')

if [ -n "$user_id" ]; then
  echo "✅ Utilisateur ADMIN créé avec succès!"
  echo "   ID: $user_id"
  echo "   Email: $email"
  echo ""
  echo "🔑 Vous pouvez maintenant vous connecter au dashboard:"
  echo "   https://kryptpay-dashboard.onrender.com/login"
else
  echo "❌ Erreur lors de la création:"
  echo "$response" | jq '.'
  exit 1
fi
