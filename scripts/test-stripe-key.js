#!/usr/bin/env node

/**
 * Script pour tester si la clé Stripe est valide
 * Usage: node scripts/test-stripe-key.js [STRIPE_SECRET_KEY]
 */

const Stripe = require('stripe');

const secretKey = process.argv[2] || process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  console.error('❌ Erreur: STRIPE_SECRET_KEY non fournie');
  console.log('\nUsage:');
  console.log('  node scripts/test-stripe-key.js sk_test_...');
  console.log('  ou');
  console.log('  STRIPE_SECRET_KEY=sk_test_... node scripts/test-stripe-key.js');
  process.exit(1);
}

if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
  console.error('❌ Erreur: La clé doit commencer par sk_test_ ou sk_live_');
  process.exit(1);
}

console.log('🔍 Test de la clé Stripe...');
console.log(`   Clé: ${secretKey.substring(0, 20)}...${secretKey.substring(secretKey.length - 4)}`);

const stripe = new Stripe(secretKey, {
  apiVersion: '2023-08-16',
});

async function testKey() {
  try {
    // Test simple: récupérer les informations du compte
    const account = await stripe.accounts.retrieve();
    
    console.log('\n✅ Clé Stripe VALIDE !');
    console.log(`   Account ID: ${account.id}`);
    console.log(`   Type: ${account.type || 'standard'}`);
    console.log(`   Country: ${account.country || 'N/A'}`);
    console.log(`   Email: ${account.email || 'N/A'}`);
    
    return true;
  } catch (error) {
    if (error.type === 'StripeAuthenticationError') {
      console.error('\n❌ Clé Stripe INVALIDE ou EXPIRÉE');
      console.error(`   Erreur: ${error.message}`);
      console.error('\n💡 Actions à effectuer:');
      console.error('   1. Allez sur https://dashboard.stripe.com/test/apikeys');
      console.error('   2. Vérifiez que la clé n\'est pas expirée');
      console.error('   3. Créez une nouvelle clé si nécessaire');
      console.error('   4. Mettez à jour STRIPE_SECRET_KEY dans config/docker.env');
      console.error('   5. Redémarrez Docker: docker-compose restart app');
    } else {
      console.error('\n❌ Erreur lors du test:');
      console.error(`   Type: ${error.type || 'Unknown'}`);
      console.error(`   Message: ${error.message}`);
    }
    return false;
  }
}

testKey()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Erreur inattendue:', error);
    process.exit(1);
  });
