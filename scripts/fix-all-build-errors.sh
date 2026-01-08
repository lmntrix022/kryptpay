#!/bin/bash
# Script pour corriger automatiquement toutes les erreurs de build TypeScript
# Remplace les champs camelCase par snake_case dans les fichiers TypeScript

set -e

SRC_DIR="src"

echo "🔧 Correction automatique des erreurs de build..."

# Fonction pour remplacer dans tous les fichiers .ts
replace_in_ts_files() {
  local pattern=$1
  local replacement=$2
  find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' "s/$pattern/$replacement/g" {} +
}

# Remplacements pour les champs Prisma (snake_case)
replace_in_ts_files '\.amountMinor' '.amount_minor'
replace_in_ts_files '\.externalReference' '.external_reference'
replace_in_ts_files '\.payoutType' '.payout_type'
replace_in_ts_files '\.providerReference' '.provider_reference'
replace_in_ts_files '\.merchantId' '.merchant_id'
replace_in_ts_files '\.billingCycle' '.billing_cycle'
replace_in_ts_files '\.sellerCountry' '.seller_country'
replace_in_ts_files '\.buyerCountry' '.buyer_country'
replace_in_ts_files 'merchantId:' 'merchant_id:'
replace_in_ts_files 'buyerCountry:' 'buyer_country:'
replace_in_ts_files 'sellerCountry:' 'seller_country:'

# Remplacements pour les includes Prisma
replace_in_ts_files "include:.*merchant:" "include: { merchants:"
replace_in_ts_files "include:.*events:" "include: { transaction_events:"
replace_in_ts_files "include:.*payments:" "include: { transactions:"

# Remplacements pour les select Prisma
replace_in_ts_files "select:.*merchantId" "select: { merchant_id"

echo "✅ Corrections automatiques terminées!"
