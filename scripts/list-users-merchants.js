#!/usr/bin/env node

/**
 * Script pour lister les administrateurs et les marchands
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listUsersAndMerchants() {
  try {
    console.log('🔍 Récupération des utilisateurs et marchands...\n');

    // Récupérer tous les utilisateurs
    const users = await prisma.users.findMany({
      include: {
        merchants: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    // Séparer les admins et les marchands
    const admins = users.filter((u) => u.role === 'ADMIN');
    const merchants = users.filter((u) => u.role === 'MERCHANT');

    // Afficher les administrateurs
    console.log('═══════════════════════════════════════════════════════');
    console.log('👑 ADMINISTRATEURS');
    console.log('═══════════════════════════════════════════════════════');
    if (admins.length === 0) {
      console.log('   Aucun administrateur trouvé.\n');
    } else {
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ${admin.email}`);
        console.log(`   ID: ${admin.id}`);
        console.log(`   Créé le: ${admin.created_at.toLocaleString('fr-FR')}`);
        if (admin.merchant_id) {
          console.log(`   Marchand associé: ${admin.merchant_id}`);
          if (admin.merchants) {
            console.log(`   Nom du marchand: ${admin.merchants.name || 'N/A'}`);
          }
        } else {
          console.log(`   Marchand associé: Aucun`);
        }
      });
      console.log(`\n   Total: ${admins.length} administrateur(s)\n`);
    }

    // Afficher les marchands
    console.log('═══════════════════════════════════════════════════════');
    console.log('🏪 MARCHANDS');
    console.log('═══════════════════════════════════════════════════════');
    if (merchants.length === 0) {
      console.log('   Aucun marchand trouvé.\n');
    } else {
      merchants.forEach((merchant, index) => {
        console.log(`\n${index + 1}. ${merchant.email}`);
        console.log(`   ID: ${merchant.id}`);
        console.log(`   Créé le: ${merchant.created_at.toLocaleString('fr-FR')}`);
        if (merchant.merchant_id) {
          console.log(`   Marchand ID: ${merchant.merchant_id}`);
          if (merchant.merchants) {
            console.log(`   Nom du marchand: ${merchant.merchants.name || 'N/A'}`);
            console.log(`   Créé le: ${merchant.merchants.created_at?.toLocaleString('fr-FR') || 'N/A'}`);
          }
        } else {
          console.log(`   ⚠️  Aucun marchand associé (merchant_id est null)`);
        }
      });
      console.log(`\n   Total: ${merchants.length} marchand(s)\n`);
    }

    // Récupérer tous les marchands (de la table merchants)
    const allMerchants = await prisma.merchants.findMany({
      orderBy: {
        created_at: 'asc',
      },
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 TOUS LES MARCHANDS (table merchants)');
    console.log('═══════════════════════════════════════════════════════');
    if (allMerchants.length === 0) {
      console.log('   Aucun marchand dans la table merchants.\n');
    } else {
      allMerchants.forEach((merchant, index) => {
        console.log(`\n${index + 1}. ${merchant.name || 'Sans nom'}`);
        console.log(`   ID: ${merchant.id}`);
        console.log(`   Créé le: ${merchant.created_at?.toLocaleString('fr-FR') || 'N/A'}`);
      });
      console.log(`\n   Total: ${allMerchants.length} marchand(s) dans la table\n`);
    }

    // Résumé
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 RÉSUMÉ');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`   Administrateurs: ${admins.length}`);
    console.log(`   Utilisateurs marchands: ${merchants.length}`);
    console.log(`   Marchands (table): ${allMerchants.length}`);
    console.log(`   Total utilisateurs: ${users.length}\n`);
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

listUsersAndMerchants();
