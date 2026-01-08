#!/bin/bash
# Script pour corriger automatiquement les erreurs de build TypeScript
# Ce script remplace les anciens noms de modèles Prisma par les noms corrects (snake_case)

set -e

SRC_DIR="src"

echo "🔧 Correction des erreurs de build TypeScript..."

# Remplacer this.prisma.merchant. par this.prisma.merchants.
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.merchant\./this.prisma.merchants./g' {} +

# Remplacer this.prisma.transaction. par this.prisma.transactions. (mais pas transaction_events)
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.transaction\.\([^_]\)/this.prisma.transactions.\1/g' {} +

# Remplacer this.prisma.payment. par this.prisma.transactions.
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.payment\./this.prisma.transactions./g' {} +

# Remplacer this.prisma.notificationHistory par this.prisma.notification_history
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.notificationHistory/this.prisma.notification_history/g' {} +

# Remplacer this.prisma.payout. par this.prisma.payouts.
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.payout\./this.prisma.payouts./g' {} +

# Remplacer this.prisma.refund. par this.prisma.refunds.
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.refund\./this.prisma.refunds./g' {} +

# Remplacer this.prisma.transactionEvent par this.prisma.transaction_events
find "$SRC_DIR" -name "*.ts" -type f ! -name "*.spec.ts" ! -name "*.test.ts" -exec sed -i '' 's/this\.prisma\.transactionEvent/this.prisma.transaction_events/g' {} +

echo "✅ Corrections automatiques terminées!"
