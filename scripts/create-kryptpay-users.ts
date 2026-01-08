/**
 * Script pour créer les utilisateurs KryptPay
 * - Admin: admin@kryptpay.io
 * - Marchand: contact@kryptpay.io
 * Usage: npx ts-node scripts/create-kryptpay-users.ts
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createKryptPayUsers() {
  const defaultPassword = 'KryptPay2024!'; // Mot de passe par défaut
  const adminEmail = 'admin@kryptpay.io';
  const merchantEmail = 'contact@kryptpay.io';
  const merchantName = 'KryptPay';

  try {
    console.log('🚀 Création des utilisateurs KryptPay...\n');

    // ============================================
    // 1. Créer l'administrateur
    // ============================================
    console.log('👤 Création de l\'administrateur...');
    
    const existingAdmin = await prisma.users.findUnique({
      where: { email: adminEmail },
    });

    let admin;
    if (existingAdmin) {
      console.log(`⚠️  L'utilisateur admin ${adminEmail} existe déjà.`);
      admin = existingAdmin;
    } else {
      const passwordHash = await bcrypt.hash(defaultPassword, 12);
      admin = await prisma.users.create({
        data: {
          id: randomUUID(),
          email: adminEmail,
          password_hash: passwordHash,
          role: UserRole.ADMIN,
          merchant_id: null,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Administrateur créé: ${admin.id}`);
    }

    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Mot de passe: ${defaultPassword}`);
    console.log(`🆔 ID: ${admin.id}\n`);

    // ============================================
    // 2. Créer le marchand et son utilisateur
    // ============================================
    console.log('🏪 Création du marchand et son utilisateur...');

    const existingMerchantUser = await prisma.users.findUnique({
      where: { email: merchantEmail },
    });

    let merchant;
    let merchantUser;

    // Vérifier si le merchant existe déjà via l'utilisateur
    if (existingMerchantUser?.merchant_id) {
      merchant = await prisma.merchants.findUnique({
        where: { id: existingMerchantUser.merchant_id },
      });
      console.log(`⚠️  L'utilisateur marchand ${merchantEmail} existe déjà.`);
    }

    // Créer le marchand s'il n'existe pas
    if (!merchant) {
      merchant = await prisma.merchants.create({
        data: {
          id: randomUUID(),
          name: merchantName,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Marchand créé: ${merchant.id}`);
    } else {
      console.log(`ℹ️  Marchand existant: ${merchant.id}`);
    }

    // Créer ou mettre à jour l'utilisateur marchand
    const passwordHash = await bcrypt.hash(defaultPassword, 12);
    
    if (existingMerchantUser) {
      merchantUser = await prisma.users.update({
        where: { id: existingMerchantUser.id },
        data: {
          password_hash: passwordHash,
          merchant_id: merchant.id,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Utilisateur marchand mis à jour: ${merchantUser.id}`);
    } else {
      merchantUser = await prisma.users.create({
        data: {
          id: randomUUID(),
          email: merchantEmail,
          password_hash: passwordHash,
          role: UserRole.MERCHANT,
          merchant_id: merchant.id,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Utilisateur marchand créé: ${merchantUser.id}`);
    }

    console.log(`📧 Email: ${merchantEmail}`);
    console.log(`🔑 Mot de passe: ${defaultPassword}`);
    console.log(`🆔 ID utilisateur: ${merchantUser.id}`);
    console.log(`🏪 ID marchand: ${merchant.id}\n`);

    // ============================================
    // Résumé final
    // ============================================
    console.log('=' .repeat(60));
    console.log('✅ UTILISATEURS CRÉÉS AVEC SUCCÈS!');
    console.log('=' .repeat(60));
    console.log('\n📋 INFORMATIONS DE CONNEXION:\n');
    
    console.log('👤 ADMINISTRATEUR:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Mot de passe: ${defaultPassword}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   Rôle: ADMIN\n`);

    console.log('🏪 MARCHAND:');
    console.log(`   Email: ${merchantEmail}`);
    console.log(`   Mot de passe: ${defaultPassword}`);
    console.log(`   ID utilisateur: ${merchantUser.id}`);
    console.log(`   ID marchand: ${merchant.id}`);
    console.log(`   Rôle: MERCHANT\n`);

    console.log('⚠️  IMPORTANT: Changez ces mots de passe après la première connexion!\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
createKryptPayUsers()
  .then(() => {
    console.log('✨ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  });
