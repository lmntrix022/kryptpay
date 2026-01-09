#!/usr/bin/env node

/**
 * Script pour créer un marchand rapidement
 * 
 * Usage:
 *   ADMIN_TOKEN='token' API_URL='https://...' node scripts/create-merchant.js [nom] [label]
 */

const API_URL = process.env.API_URL || 'https://kryptpay-api.onrender.com';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ Erreur: ADMIN_TOKEN n\'est pas défini');
  process.exit(1);
}

const name = process.argv[2];
const apiKeyLabel = process.argv[3];

if (!name) {
  console.error('❌ Usage: ADMIN_TOKEN="token" node scripts/create-merchant.js <nom> [label]');
  console.log('');
  console.log('Exemple:');
  console.log('  ADMIN_TOKEN="token" node scripts/create-merchant.js "Bööh" "Clé API Production"');
  process.exit(1);
}

async function createMerchant() {
  try {
    console.log('📦 Création du marchand...');
    console.log(`📍 API: ${API_URL}`);
    console.log('');

    const body = { name };
    if (apiKeyLabel) {
      body.apiKeyLabel = apiKeyLabel;
    }

    const response = await fetch(`${API_URL}/internal/merchants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok && data.merchant_id) {
      console.log('✅ Marchand créé avec succès!');
      console.log(`   Merchant ID: ${data.merchant_id}`);
      console.log(`   API Key: ${data.apiKey}`);
      console.log('');
      console.log('⚠️  IMPORTANT: Sauvegardez l\'API Key, elle ne sera plus affichée!');
      console.log('');
      console.log('📋 Prochaines étapes:');
      console.log('  1. Sauvegardez l\'API Key dans un gestionnaire de mots de passe');
      console.log('  2. Configurez les credentials des providers (Stripe, Moneroo, etc.)');
      console.log('  3. Testez les paiements');
    } else {
      console.error('❌ Erreur lors de la création:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

createMerchant();
