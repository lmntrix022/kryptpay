#!/bin/bash

# Script pour ajouter des données réelles à l'application déployée
# Usage: ./scripts/seed-production-data.sh

set -e

# Configuration
API_URL="${API_URL:-https://kryptpay-api.onrender.com}"
ADMIN_TOKEN="${ADMIN_TOKEN}"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Erreur: ADMIN_TOKEN n'est pas défini"
  echo ""
  echo "Obtenez ADMIN_TOKEN depuis Render Dashboard:"
  echo "1. Render Dashboard → kryptpay-api → Environment"
  echo "2. Copiez la valeur de ADMIN_TOKEN"
  echo ""
  echo "Puis exécutez:"
  echo "  ADMIN_TOKEN='votre_token' ./scripts/seed-production-data.sh"
  exit 1
fi

echo "🚀 Ajout de données réelles à l'application..."
echo "📍 API URL: $API_URL"
echo ""

# Fonction pour créer un marchand
create_merchant() {
  local name=$1
  local api_key_label=$2
  
  echo "📦 Création du marchand: $name"
  
  response=$(curl -s -X POST "$API_URL/internal/merchants" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: $ADMIN_TOKEN" \
    -d "{
      \"name\": \"$name\",
      \"apiKeyLabel\": \"$api_key_label\"
    }")
  
  merchant_id=$(echo $response | jq -r '.merchant_id // empty')
  api_key=$(echo $response | jq -r '.apiKey // empty')
  
  if [ -n "$merchant_id" ]; then
    echo "  ✅ Marchand créé: $merchant_id"
    echo "  🔑 API Key: $api_key"
    echo ""
    echo "$merchant_id"
  else
    echo "  ❌ Erreur: $(echo $response | jq -r '.error.message // .message // "Erreur inconnue"')"
    echo ""
    echo ""
  fi
}

# Fonction pour créer un utilisateur
create_user() {
  local email=$1
  local password=$2
  local role=$3
  local merchant_id=$4
  
  echo "👤 Création de l'utilisateur: $email (role: $role)"
  
  body="{
    \"email\": \"$email\",
    \"password\": \"$password\",
    \"role\": \"$role\""
  
  if [ -n "$merchant_id" ]; then
    body="$body,
    \"merchantId\": \"$merchant_id\""
  fi
  
  body="$body
  }"
  
  response=$(curl -s -X POST "$API_URL/internal/users" \
    -H "Content-Type: application/json" \
    -H "x-admin-token: $ADMIN_TOKEN" \
    -d "$body")
  
  user_id=$(echo $response | jq -r '.id // empty')
  
  if [ -n "$user_id" ]; then
    echo "  ✅ Utilisateur créé: $user_id"
    echo ""
    echo "$user_id"
  else
    echo "  ❌ Erreur: $(echo $response | jq -r '.error.message // .message // "Erreur inconnue"')"
    echo ""
    echo ""
  fi
}

# 1. Créer un utilisateur ADMIN
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Création de l'utilisateur ADMIN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
read -p "Email admin: " admin_email
read -sp "Mot de passe admin: " admin_password
echo ""

ADMIN_USER_ID=$(create_user "$admin_email" "$admin_password" "ADMIN" "")

# 2. Créer des marchands
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Création des marchands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

read -p "Nombre de marchands à créer (défaut: 1): " num_merchants
num_merchants=${num_merchants:-1}

merchant_ids=()
for i in $(seq 1 $num_merchants); do
  read -p "Nom du marchand #$i: " merchant_name
  read -p "Label de la clé API (optionnel): " api_key_label
  
  merchant_id=$(create_merchant "$merchant_name" "$api_key_label")
  if [ -n "$merchant_id" ]; then
    merchant_ids+=("$merchant_id")
  fi
done

# 3. Créer des utilisateurs marchands
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Création des utilisateurs marchands"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for merchant_id in "${merchant_ids[@]}"; do
  read -p "Créer un utilisateur pour le marchand $merchant_id? (o/n): " create_user_merchant
  
  if [ "$create_user_merchant" = "o" ] || [ "$create_user_merchant" = "O" ]; then
    read -p "Email utilisateur: " user_email
    read -sp "Mot de passe: " user_password
    echo ""
    
    create_user "$user_email" "$user_password" "MERCHANT" "$merchant_id"
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Données ajoutées avec succès!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Résumé:"
echo "  - Utilisateur ADMIN créé: $admin_email"
echo "  - Marchands créés: ${#merchant_ids[@]}"
echo ""
echo "🔑 Prochaines étapes:"
echo "  1. Connectez-vous au dashboard avec: $admin_email"
echo "  2. Configurez les credentials des providers (Stripe, Moneroo, etc.)"
echo "  3. Testez les paiements"
