#!/usr/bin/env node

/**
 * Script pour exporter toutes les données de la base de données locale
 * Usage: node scripts/export-data.js [output-file.json]
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const outputFile = process.argv[2] || 'exported-data.json';

async function exportData() {
  try {
    console.log('📦 Export des données de la base de données...\n');

    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      users: [],
      merchants: [],
      apiKeys: [],
      transactions: [],
      payouts: [],
      refunds: [],
      subscriptions: [],
      webhookDeliveries: [],
      providerCredentials: [],
      notificationPreferences: [],
    };

    // Export users
    console.log('📤 Export des utilisateurs...');
    const users = await prisma.users.findMany({
      include: {
        merchants: true,
      },
    });
    data.users = users.map((u) => ({
      id: u.id,
      email: u.email,
      password_hash: u.password_hash,
      role: u.role,
      merchant_id: u.merchant_id,
      created_at: u.created_at.toISOString(),
      updated_at: u.updated_at.toISOString(),
    }));
    console.log(`   ✅ ${users.length} utilisateur(s) exporté(s)`);

    // Export merchants
    console.log('📤 Export des marchands...');
    const merchants = await prisma.merchants.findMany();
    data.merchants = merchants.map((m) => ({
      id: m.id,
      name: m.name,
      created_at: m.created_at?.toISOString() || null,
      updated_at: m.updated_at?.toISOString() || null,
      webhook_secret: m.webhook_secret,
      webhook_url: m.webhook_url,
      app_commission_rate: m.app_commission_rate,
      app_commission_fixed: m.app_commission_fixed,
    }));
    console.log(`   ✅ ${merchants.length} marchand(s) exporté(s)`);

    // Export API keys
    console.log('📤 Export des clés API...');
    const apiKeys = await prisma.api_keys.findMany();
    data.apiKeys = apiKeys.map((k) => ({
      id: k.id,
      merchant_id: k.merchant_id,
      name: k.name,
      key_hash: k.key_hash,
      status: k.status,
      last_used_at: k.last_used_at?.toISOString() || null,
      created_at: k.created_at?.toISOString() || null,
      updated_at: k.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${apiKeys.length} clé(s) API exportée(s)`);

    // Export transactions
    console.log('📤 Export des transactions...');
    const transactions = await prisma.transactions.findMany({
      take: 10000, // Limite pour éviter les fichiers trop gros
    });
    data.transactions = transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      amountMinor: t.amountMinor,
      currency: t.currency,
      countryCode: t.countryCode,
      paymentMethod: t.paymentMethod,
      gatewayUsed: t.gatewayUsed,
      status: t.status,
      providerReference: t.providerReference,
      failureCode: t.failureCode,
      checkoutPayload: t.checkoutPayload,
      metadata: t.metadata,
      merchant_id: t.merchant_id,
      subscription_id: t.subscription_id,
      is_test_mode: t.is_test_mode,
      platform_fee: t.platform_fee,
      boohpay_fee: t.boohpay_fee,
      app_commission: t.app_commission,
      booh_tax_fee: t.booh_tax_fee?.toString(),
      createdAt: t.createdAt?.toISOString() || null,
      updatedAt: t.updatedAt?.toISOString() || null,
    }));
    console.log(`   ✅ ${transactions.length} transaction(s) exportée(s)`);

    // Export payouts
    console.log('📤 Export des payouts...');
    const payouts = await prisma.payouts.findMany({
      take: 10000,
    });
    data.payouts = payouts.map((p) => ({
      id: p.id,
      merchant_id: p.merchant_id,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      payment_system: p.payment_system,
      payout_type: p.payout_type,
      msisdn: p.msisdn,
      provider_reference: p.provider_reference,
      external_reference: p.external_reference,
      metadata: p.metadata,
      created_at: p.created_at?.toISOString() || null,
      updated_at: p.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${payouts.length} payout(s) exporté(s)`);

    // Export refunds
    console.log('📤 Export des remboursements...');
    const refunds = await prisma.refunds.findMany({
      take: 10000,
    });
    data.refunds = refunds.map((r) => ({
      id: r.id,
      payment_id: r.payment_id,
      merchant_id: r.merchant_id,
      amountMinor: r.amountMinor,
      currency: r.currency,
      status: r.status,
      reason: r.reason,
      provider_reference: r.provider_reference,
      failure_code: r.failure_code,
      metadata: r.metadata,
      created_at: r.created_at?.toISOString() || null,
      updated_at: r.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${refunds.length} remboursement(s) exporté(s)`);

    // Export subscriptions
    console.log('📤 Export des abonnements...');
    const subscriptions = await prisma.subscriptions.findMany();
    data.subscriptions = subscriptions.map((s) => ({
      id: s.id,
      merchant_id: s.merchant_id,
      customer_email: s.customer_email,
      customer_phone: s.customer_phone,
      amountMinor: s.amountMinor,
      currency: s.currency,
      billingCycle: s.billingCycle,
      status: s.status,
      startDate: s.startDate?.toISOString() || null,
      nextBillingDate: s.nextBillingDate?.toISOString() || null,
      lastBillingDate: s.lastBillingDate?.toISOString() || null,
      cancelAt: s.cancelAt?.toISOString() || null,
      cancelledAt: s.cancelledAt?.toISOString() || null,
      metadata: s.metadata,
      isTestMode: s.isTestMode,
      created_at: s.created_at?.toISOString() || null,
      updated_at: s.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${subscriptions.length} abonnement(s) exporté(s)`);

    // Export webhook deliveries
    console.log('📤 Export des livraisons de webhooks...');
    const webhookDeliveries = await prisma.webhook_deliveries.findMany({
      take: 10000,
    });
    data.webhookDeliveries = webhookDeliveries.map((w) => ({
      id: w.id,
      merchant_id: w.merchant_id,
      event_type: w.event_type,
      payload: w.payload,
      status: w.status,
      attempts: w.attempts,
      last_attempt_at: w.last_attempt_at?.toISOString() || null,
      next_retry_at: w.next_retry_at?.toISOString() || null,
      http_status_code: w.http_status_code,
      error_message: w.error_message,
      delivered_at: w.delivered_at?.toISOString() || null,
      created_at: w.created_at?.toISOString() || null,
      updated_at: w.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${webhookDeliveries.length} livraison(s) de webhook exportée(s)`);

    // Export provider credentials
    console.log('📤 Export des credentials des providers...');
    const providerCredentials = await prisma.provider_credentials.findMany();
    data.providerCredentials = providerCredentials.map((c) => ({
      id: c.id,
      merchant_id: c.merchant_id,
      provider: c.provider,
      environment: c.environment,
      credentials: c.credentials,
      created_at: c.created_at?.toISOString() || null,
      updated_at: c.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${providerCredentials.length} credential(s) exporté(s)`);

    // Export notification preferences
    console.log('📤 Export des préférences de notifications...');
    const notificationPreferences = await prisma.merchant_notification_preferences.findMany();
    data.notificationPreferences = notificationPreferences.map((n) => ({
      merchant_id: n.merchant_id,
      email_enabled: n.email_enabled,
      sms_enabled: n.sms_enabled,
      push_enabled: n.push_enabled,
      payment_status_enabled: n.payment_status_enabled,
      payout_status_enabled: n.payout_status_enabled,
      refund_status_enabled: n.refund_status_enabled,
      system_alert_enabled: n.system_alert_enabled,
      webhook_failure_enabled: n.webhook_failure_enabled,
      created_at: n.created_at?.toISOString() || null,
      updated_at: n.updated_at?.toISOString() || null,
    }));
    console.log(`   ✅ ${notificationPreferences.length} préférence(s) exportée(s)`);

    // Sauvegarder dans un fichier
    const outputPath = path.resolve(process.cwd(), outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

    console.log(`\n✅ Export terminé !`);
    console.log(`   Fichier: ${outputPath}`);
    console.log(`   Taille: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

    // Résumé
    console.log('📊 Résumé de l\'export:');
    console.log(`   - ${data.users.length} utilisateur(s)`);
    console.log(`   - ${data.merchants.length} marchand(s)`);
    console.log(`   - ${data.apiKeys.length} clé(s) API`);
    console.log(`   - ${data.transactions.length} transaction(s)`);
    console.log(`   - ${data.payouts.length} payout(s)`);
    console.log(`   - ${data.refunds.length} remboursement(s)`);
    console.log(`   - ${data.subscriptions.length} abonnement(s)`);
    console.log(`   - ${data.webhookDeliveries.length} livraison(s) de webhook`);
    console.log(`   - ${data.providerCredentials.length} credential(s)`);
    console.log(`   - ${data.notificationPreferences.length} préférence(s) de notification\n`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'export:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

exportData();
