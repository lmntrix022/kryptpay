#!/usr/bin/env node

/**
 * Script pour créer un utilisateur ADMIN rapidement
 * 
 * Usage:
 *   ADMIN_TOKEN='token' API_URL='https://...' node scripts/create-admin.js
 * 
 * Ou définissez les variables d'environnement dans votre shell
 */

const API_URL = process.env.API_URL || 'https://kryptpay-api.onrender.com';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

if (!ADMIN_TOKEN) {
  console.error('❌ Erreur: ADMIN_TOKEN n\'est pas défini');
  console.log('');
  console.log('Obtenez ADMIN_TOKEN depuis Render Dashboard:');
  console.log('  Render Dashboard → kryptpay-api → Environment → ADMIN_TOKEN');
  console.log('');
  console.log('Puis exécutez:');
  console.log('  ADMIN_TOKEN=\'votre_token\' node scripts/create-admin.js');
  process.exit(1);
}

// Lire les entrées depuis les arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('❌ Usage: ADMIN_TOKEN="token" node scripts/create-admin.js <email> <password>');
  console.log('');
  console.log('Exemple:');
  console.log('  ADMIN_TOKEN="token" node scripts/create-admin.js admin@example.com "MonMotDePasse123!"');
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log('👤 Création de l\'utilisateur ADMIN...');
    console.log(`📍 API: ${API_URL}`);
    console.log('');

    const response = await fetch(`${API_URL}/internal/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': ADMIN_TOKEN,
      },
      body: JSON.stringify({
        email,
        password,
        role: 'ADMIN',
      }),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      console.log('✅ Utilisateur ADMIN créé avec succès!');
      console.log(`   ID: ${data.id}`);
      console.log(`   Email: ${data.email}`);
      console.log(`   Role: ${data.role}`);
      console.log('');
      console.log('🔑 Vous pouvez maintenant vous connecter au dashboard:');
      console.log('   https://kryptpay-dashboard.onrender.com/login');
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

createAdmin();
