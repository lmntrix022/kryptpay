/**
 * Script pour créer un marchand de test avec un utilisateur
 * Usage: npx ts-node scripts/create-test-merchant.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createTestMerchant() {
  const email = 'quantin@miscoch-it.ga';
  const password = 'Test123!@#'; // Mot de passe par défaut
  const merchantName = 'Miscoch IT';

  try {
    console.log('🔨 Création du marchand de test...');

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`⚠️  L'utilisateur ${email} existe déjà.`);
      const merchant = existingUser.merchant_id
        ? await prisma.merchants.findUnique({
            where: { id: existingUser.merchant_id },
          })
        : null;

      if (merchant) {
        console.log(`✅ Marchand existant:`);
        console.log(`   - ID: ${merchant.id}`);
        console.log(`   - Nom: ${merchant.name || 'N/A'}`);
        console.log(`   - Email utilisateur: ${email}`);
        console.log(`   - ID utilisateur: ${existingUser.id}`);
        return;
      }
    }

    // Créer le marchand
    const merchant = await prisma.merchants.create({
      data: {
        id: randomUUID(),
        name: merchantName,
        updated_at: new Date(),
      },
    });

    console.log(`✅ Marchand créé: ${merchant.id}`);

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    let user;
    if (existingUser) {
      // Mettre à jour l'utilisateur existant
      user = await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          merchant_id: merchant.id,
          password_hash: passwordHash,
        },
      });
      console.log(`✅ Utilisateur mis à jour: ${user.id}`);
    } else {
      // Créer un nouvel utilisateur
      user = await prisma.users.create({
        data: {
          id: randomUUID(),
          email,
          password_hash: passwordHash,
          role: 'MERCHANT',
          merchant_id: merchant.id,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Utilisateur créé: ${user.id}`);
    }

    // Afficher les informations
    console.log('\n📋 Informations de connexion:');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${password}`);
    console.log(`   Marchand ID: ${merchant.id}`);
    console.log(`   Utilisateur ID: ${user.id}`);
    console.log(`   Rôle: MERCHANT`);

    console.log('\n✅ Marchand de test créé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la création:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
createTestMerchant()
  .then(() => {
    console.log('\n✨ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erreur fatale:', error);
    process.exit(1);
  });

