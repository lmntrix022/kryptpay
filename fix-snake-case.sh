#!/bin/bash
# Corriger tous les noms de champs snake_case vers camelCase

find src -type f -name "*.ts" -exec sed -i '' \
  -e 's/\.app_commission_rate/.appCommissionRate/g' \
  -e 's/\.app_commission_fixed/.appCommissionFixed/g' \
  -e 's/\.merchant_id/.merchantId/g' \
  -e 's/\.password_hash/.passwordHash/g' \
  -e 's/: user\.created_at/: user.createdAt/g' \
  -e 's/: user\.updated_at/: user.updatedAt/g' \
  -e 's/orderBy: { created_at/orderBy: { createdAt/g' \
  -e 's/orderBy: { updated_at/orderBy: { updatedAt/g' \
  {} +

echo "✅ Corrections appliquées"
