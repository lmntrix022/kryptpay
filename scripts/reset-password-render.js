#!/usr/bin/env node

/**
 * Script pour réinitialiser le mot de passe d'un utilisateur sur Render
 * 
 * Usage: 
 *   DATABASE_URL="..." node scripts/reset-password-render.js <email> <nouveau-mot-de-passe>
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const databaseUrl = process.env.DATABASE_URL;
const email = process.argv[2];
const newPassword = process.argv[3];

if (!databaseUrl) {
  console.error('❌ Erreur: DATABASE_URL n\'est pas défini');
  process.exit(1);
}

if (!email || !newPassword) {
  console.error('❌ Erreur: Email et mot de passe requis');
  console.log('\nUsage:');
  console.log('  DATABASE_URL="..." node scripts/reset-password-render.js <email> <nouveau-mot-de-passe>');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function resetPassword() {
  try {
    console.log(`🔐 Réinitialisation du mot de passe pour ${email}...\n`);

    // Vérifier si l'utilisateur existe
    const user = await prisma.$queryRaw`
      SELECT id, email, role, merchant_id
      FROM users
      WHERE email = ${email}
    `;

    if (!user || user.length === 0) {
      console.error(`❌ Utilisateur non trouvé: ${email}`);
      process.exit(1);
    }

    const userData = user[0];
    console.log(`✅ Utilisateur trouvé:`);
    console.log(`   - Email: ${userData.email}`);
    console.log(`   - Role: ${userData.role}`);
    console.log(`   - ID: ${userData.id}\n`);

    // Hasher le nouveau mot de passe (12 rounds comme dans auth.service.ts)
    console.log('🔒 Hachage du nouveau mot de passe...');
    const saltRounds = 12; // Même nombre de rounds que dans auth.service.ts
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    console.log('✅ Mot de passe hashé\n');

    // Mettre à jour le mot de passe dans la base de données
    console.log('📝 Mise à jour du mot de passe...');
    await prisma.$executeRaw`
      UPDATE users
      SET password_hash = ${passwordHash},
          updated_at = NOW()
      WHERE id = ${userData.id}::uuid
    `;

    console.log('✅ Mot de passe réinitialisé avec succès !\n');
    console.log('💡 Vous pouvez maintenant vous connecter avec:');
    console.log(`   Email: ${email}`);
    console.log(`   Mot de passe: ${newPassword}\n`);
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

resetPassword();
