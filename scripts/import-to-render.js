#!/usr/bin/env node

/**
 * Script pour importer les données dans la base de données Render
 * 
 * Usage: 
 *   DATABASE_URL="postgresql://..." node scripts/import-to-render.js [exported-data.json]
 * 
 * OU définissez DATABASE_URL dans votre .env pour Render
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Utiliser DATABASE_URL de l'environnement ou demander
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Erreur: DATABASE_URL n\'est pas défini');
  console.log('\nUsage:');
  console.log('  DATABASE_URL="postgresql://user:pass@host:port/db" node scripts/import-to-render.js [exported-data.json]');
  console.log('\nOu définissez DATABASE_URL dans votre .env');
  process.exit(1);
}

// Créer une instance Prisma avec la DATABASE_URL de Render
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

const inputFile = process.argv[2] || 'exported-data.json';

async function importData() {
  try {
    console.log('📥 Import des données vers Render...\n');
    console.log(`   Base de données: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

    // Lire le fichier d'export
    const inputPath = path.resolve(process.cwd(), inputFile);
    if (!fs.existsSync(inputPath)) {
      console.error(`❌ Fichier non trouvé: ${inputPath}`);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
    console.log(`✅ Fichier d'export chargé: ${inputFile}`);
    console.log(`   Exporté le: ${data.exportedAt}\n`);

    // Désactiver les contraintes de clés étrangères temporairement
    console.log('⚠️  Note: Les imports sont effectués avec gestion des conflits (ON CONFLICT DO NOTHING)\n');

    // Import merchants (doit être fait en premier car users y fait référence)
    // Utiliser SQL brut pour éviter les problèmes de schéma Prisma
    console.log('📥 Import des marchands...');
    let merchantsImported = 0;
    let merchantsSkipped = 0;
    
    for (const merchant of data.merchants) {
      try {
        // Utiliser SQL brut pour insérer seulement les colonnes de base
        // Cela évite les problèmes avec les colonnes qui n'existent pas encore
        await prisma.$executeRaw`
          INSERT INTO merchants (id, name, created_at, updated_at)
          VALUES (${merchant.id}::uuid, ${merchant.name}, ${new Date(merchant.created_at)}::timestamptz, ${new Date(merchant.updated_at)}::timestamptz)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = EXCLUDED.updated_at
        `;
        merchantsImported++;
      } catch (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already exists
          merchantsSkipped++;
        } else {
          console.error(`   ⚠️  Erreur pour marchand ${merchant.id}: ${error.message}`);
          // Essayer quand même de mettre à jour
          try {
            await prisma.$executeRaw`
              UPDATE merchants 
              SET name = ${merchant.name}, updated_at = ${new Date(merchant.updated_at)}::timestamptz
              WHERE id = ${merchant.id}::uuid
            `;
            merchantsImported++;
          } catch (updateError) {
            // Ignorer les erreurs de mise à jour
          }
        }
      }
    }
    console.log(`   ✅ ${merchantsImported} marchand(s) importé(s), ${merchantsSkipped} ignoré(s)\n`);

    // Import users
    console.log('📥 Import des utilisateurs...');
    let usersImported = 0;
    let usersSkipped = 0;
    for (const user of data.users) {
      try {
        await prisma.users.upsert({
          where: { id: user.id },
          update: {
            email: user.email,
            password_hash: user.password_hash,
            role: user.role,
            merchant_id: user.merchant_id,
            updated_at: new Date(user.updated_at),
          },
          create: {
            id: user.id,
            email: user.email,
            password_hash: user.password_hash,
            role: user.role,
            merchant_id: user.merchant_id,
            created_at: new Date(user.created_at),
            updated_at: new Date(user.updated_at),
          },
        });
        usersImported++;
      } catch (error) {
        if (error.code === 'P2002') {
          usersSkipped++;
        } else {
          throw error;
        }
      }
    }
    console.log(`   ✅ ${usersImported} utilisateur(s) importé(s), ${usersSkipped} ignoré(s)\n`);

    // Initialiser les compteurs pour les imports optionnels
    let keysImported = 0;
    let credsImported = 0;
    let prefsImported = 0;

    // Import API keys
    if (data.apiKeys && data.apiKeys.length > 0) {
      console.log('📥 Import des clés API...');
      for (const key of data.apiKeys) {
        try {
          await prisma.api_keys.upsert({
            where: { id: key.id },
            update: {
              merchant_id: key.merchant_id,
              name: key.name,
              key_hash: key.key_hash,
              status: key.status,
              last_used_at: key.last_used_at ? new Date(key.last_used_at) : null,
              updated_at: new Date(key.updated_at),
            },
            create: {
              id: key.id,
              merchant_id: key.merchant_id,
              name: key.name,
              key_hash: key.key_hash,
              status: key.status,
              last_used_at: key.last_used_at ? new Date(key.last_used_at) : null,
              created_at: new Date(key.created_at),
              updated_at: new Date(key.updated_at),
            },
          });
          keysImported++;
        } catch (error) {
          // Ignorer les erreurs de contrainte unique
        }
      }
      console.log(`   ✅ ${keysImported} clé(s) API importée(s)\n`);
    }

    // Import provider credentials
    if (data.providerCredentials && data.providerCredentials.length > 0) {
      console.log('📥 Import des credentials des providers...');
      for (const cred of data.providerCredentials) {
        try {
          await prisma.provider_credentials.upsert({
            where: { id: cred.id },
            update: {
              merchant_id: cred.merchant_id,
              provider: cred.provider,
              environment: cred.environment,
              credentials: cred.credentials,
              updated_at: new Date(cred.updated_at),
            },
            create: {
              id: cred.id,
              merchant_id: cred.merchant_id,
              provider: cred.provider,
              environment: cred.environment,
              credentials: cred.credentials,
              created_at: new Date(cred.created_at),
              updated_at: new Date(cred.updated_at),
            },
          });
          credsImported++;
        } catch (error) {
          // Ignorer les erreurs
        }
      }
      console.log(`   ✅ ${credsImported} credential(s) importé(s)\n`);
    }

    // Import notification preferences
    if (data.notificationPreferences && data.notificationPreferences.length > 0) {
      console.log('📥 Import des préférences de notifications...');
      for (const pref of data.notificationPreferences) {
        try {
          await prisma.merchant_notification_preferences.upsert({
            where: { merchant_id: pref.merchant_id },
            update: {
              email_enabled: pref.email_enabled,
              sms_enabled: pref.sms_enabled,
              push_enabled: pref.push_enabled,
              payment_status_enabled: pref.payment_status_enabled,
              payout_status_enabled: pref.payout_status_enabled,
              refund_status_enabled: pref.refund_status_enabled,
              system_alert_enabled: pref.system_alert_enabled,
              webhook_failure_enabled: pref.webhook_failure_enabled,
              updated_at: new Date(pref.updated_at),
            },
            create: {
              merchant_id: pref.merchant_id,
              email_enabled: pref.email_enabled,
              sms_enabled: pref.sms_enabled,
              push_enabled: pref.push_enabled,
              payment_status_enabled: pref.payment_status_enabled,
              payout_status_enabled: pref.payout_status_enabled,
              refund_status_enabled: pref.refund_status_enabled,
              system_alert_enabled: pref.system_alert_enabled,
              webhook_failure_enabled: pref.webhook_failure_enabled,
              created_at: new Date(pref.created_at),
              updated_at: new Date(pref.updated_at),
            },
          });
          prefsImported++;
        } catch (error) {
          // Ignorer les erreurs
        }
      }
      console.log(`   ✅ ${prefsImported} préférence(s) importée(s)\n`);
    }

    // Note: Les transactions, payouts, refunds, etc. sont optionnels
    // car ils peuvent être très nombreux. Décommentez si nécessaire.

    console.log('✅ Import terminé !\n');
    console.log('📊 Résumé:');
    console.log(`   - ${merchantsImported} marchand(s) importé(s)`);
    console.log(`   - ${usersImported} utilisateur(s) importé(s)`);
    console.log(`   - ${keysImported} clé(s) API importée(s)`);
    console.log(`   - ${credsImported} credential(s) importé(s)`);
    console.log(`   - ${prefsImported} préférence(s) importée(s)\n`);

    console.log('💡 Note: Les transactions, payouts et autres données volumineuses');
    console.log('   ne sont pas importées par défaut pour éviter les problèmes.');
    console.log('   Modifiez le script si vous souhaitez les importer.\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'import:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

importData();
