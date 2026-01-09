#!/usr/bin/env node

/**
 * Script pour vérifier les données importées dans Render
 */

const { PrismaClient } = require('@prisma/client');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Erreur: DATABASE_URL n\'est pas défini');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function verifyData() {
  try {
    console.log('🔍 Vérification des données dans Render...\n');

    // Utiliser SQL brut pour éviter les problèmes de schéma Prisma
    const users = await prisma.$queryRaw`
      SELECT u.id, u.email, u.role, u.merchant_id, m.name as merchant_name
      FROM users u
      LEFT JOIN merchants m ON u.merchant_id = m.id
      ORDER BY u.created_at ASC
    `;

    const merchants = await prisma.$queryRaw`
      SELECT id, name, created_at
      FROM merchants
      ORDER BY created_at ASC
    `;

    const apiKeysCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM api_keys
    `;

    const credentialsCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM provider_credentials
    `;

    console.log('📊 Données présentes dans Render:');
    console.log(`   - ${users.length} utilisateur(s)`);
    console.log(`   - ${merchants.length} marchand(s)`);
    console.log(`   - ${Number(apiKeysCount[0].count)} clé(s) API`);
    console.log(`   - ${Number(credentialsCount[0].count)} credential(s) de provider\n`);

    console.log('👑 Administrateurs:');
    users
      .filter((u) => u.role === 'ADMIN')
      .forEach((admin) => {
        console.log(`   - ${admin.email} (${admin.id})`);
      });

    console.log('\n🏪 Marchands:');
    users
      .filter((u) => u.role === 'MERCHANT')
      .forEach((merchant) => {
        console.log(`   - ${merchant.email} (${merchant.id})`);
        if (merchant.merchant_name) {
          console.log(`     → ${merchant.merchant_name}`);
        }
      });

    console.log('\n✅ Vérification terminée !\n');
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyData();
