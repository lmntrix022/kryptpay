/**
 * Script pour corriger automatiquement les erreurs de types Prisma
 * Ce script remplace les anciens noms de modèles par les noms corrects (snake_case)
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(__dirname, '..', 'src');

// Mappings des corrections à effectuer
const REPLACEMENTS = [
  // Imports de types
  { from: "import { Merchant }", to: "import { merchants as Merchant }", exact: false },
  { from: "import { Merchant,", to: "import { merchants as Merchant,", exact: false },
  { from: "import type { Merchant }", to: "import type { merchants as Merchant }", exact: false },
  { from: "import type { Merchant,", to: "import type { merchants as Merchant,", exact: false },
  { from: "MerchantNotificationPreferences", to: "merchant_notification_preferences as MerchantNotificationPreferences", exact: false },
  
  // Types Prisma WhereInput
  { from: "Prisma.PaymentWhereInput", to: "Prisma.transactionsWhereInput", exact: false },
  { from: "Prisma.PayoutWhereInput", to: "Prisma.payoutsWhereInput", exact: false },
  { from: "Prisma.RefundWhereInput", to: "Prisma.refundsWhereInput", exact: false },
  { from: "Prisma.NotificationHistoryWhereInput", to: "Prisma.notification_historyWhereInput", exact: false },
  { from: "Prisma.PaymentUpdateInput", to: "Prisma.transactionsUpdateInput", exact: false },
  
  // Noms de modèles Prisma
  { from: "this.prisma.merchant.", to: "this.prisma.merchants.", exact: false },
  { from: "this.prisma.transaction.", to: "this.prisma.transactions.", exact: false },
  { from: "this.prisma.transactionEvent", to: "this.prisma.transaction_events", exact: false },
  { from: "this.prisma.payment.", to: "this.prisma.transactions.", exact: false },
  { from: "this.prisma.notificationHistory", to: "this.prisma.notification_history", exact: false },
  { from: "this.prisma.payout.", to: "this.prisma.payouts.", exact: false },
  { from: "this.prisma.refund.", to: "this.prisma.refunds.", exact: false },
];

function fixFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const replacement of REPLACEMENTS) {
    const regex = new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.match(regex)) {
      content = content.replace(regex, replacement.to);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function walkDir(dir: string): void {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist') {
      walkDir(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts') && !file.endsWith('.test.ts')) {
      fixFile(filePath);
    }
  }
}

console.log('🔧 Fixing Prisma type errors...\n');
walkDir(SRC_DIR);
console.log('\n✅ Done!');
