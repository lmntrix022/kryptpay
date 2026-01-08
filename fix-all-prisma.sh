#!/bin/bash

echo "🔧 Correction complète du schema Prisma..."

# Sauvegarder le schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Corriger TOUS les usages snake_case dans le code TypeScript
find src -type f -name "*.ts" -not -path "*/node_modules/*" -exec sed -i '' \
  -e 's/this\.prisma\.merchants\./this.prisma.merchant./g' \
  -e 's/this\.prisma\.users\./this.prisma.user./g' \
  -e 's/this\.prisma\.apiKey\./this.prisma.apiKey./g' \
  -e 's/this\.prisma\.webhookDelivery\./this.prisma.webhookDelivery./g' \
  -e 's/this\.prisma\.payment\./this.prisma.transactions./g' \
  -e 's/this\.prisma\.payouts\./this.prisma.payouts./g' \
  -e 's/this\.prisma\.subscriptions\./this.prisma.subscriptions./g' \
  -e 's/this\.prisma\.refunds\./this.prisma.refunds./g' \
  {} +

echo "✅ Code TypeScript corrigé"
echo "✅ Backup du schema sauvegardé dans prisma/schema.prisma.backup"
