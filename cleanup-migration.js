#!/usr/bin/env node

/**
 * Script pour nettoyer la migration en échec sur Render
 * 
 * Usage:
 *   DATABASE_URL="postgresql://user:password@host:port/database" node cleanup-migration.js
 * 
 * Ou utilisez la variable d'environnement depuis Render Dashboard
 */

const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Erreur: DATABASE_URL n\'est pas défini');
  console.log('\nUsage:');
  console.log('  DATABASE_URL="postgresql://user:password@host:port/database" node cleanup-migration.js');
  console.log('\nOu définissez DATABASE_URL dans votre environnement');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function cleanup() {
  try {
    console.log('🔌 Connexion à PostgreSQL...');
    await client.connect();
    console.log('✅ Connecté à PostgreSQL\n');
    
    // 1. Vérifier l'état des migrations
    console.log('📋 Vérification des migrations...');
    const migrations = await client.query(`
      SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
      FROM "_prisma_migrations" 
      ORDER BY started_at;
    `);
    console.log(`   Trouvé ${migrations.rows.length} migration(s)\n`);
    
    // 2. Chercher la migration en échec
    const failedMigration = migrations.rows.find(
      m => m.migration_name === '20251129200000_add_vat_tables'
    );
    
    if (failedMigration) {
      console.log('⚠️  Migration en échec trouvée:', failedMigration.migration_name);
      
      // 3. Vérifier les tables VAT existantes
      console.log('\n📋 Vérification des tables VAT...');
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'vat_%';
      `);
      
      if (tables.rows.length > 0) {
        console.log(`   ⚠️  ${tables.rows.length} table(s) VAT trouvée(s):`);
        tables.rows.forEach(row => console.log(`      - ${row.table_name}`));
        console.log('\n   ⚠️  ATTENTION: Des tables existent. Elles seront supprimées.');
      } else {
        console.log('   ✅ Aucune table VAT trouvée');
      }
      
      // 4. Demander confirmation (ou exécuter directement en mode non-interactif)
      console.log('\n🧹 Nettoyage en cours...');
      
      // Supprimer les tables VAT si elles existent
      if (tables.rows.length > 0) {
        await client.query(`
          DROP TABLE IF EXISTS "vat_audit_logs" CASCADE;
          DROP TABLE IF EXISTS "merchant_vat_settings" CASCADE;
          DROP TABLE IF EXISTS "vat_payments" CASCADE;
          DROP TABLE IF EXISTS "vat_reports" CASCADE;
          DROP TABLE IF EXISTS "vat_refund_adjustments" CASCADE;
          DROP TABLE IF EXISTS "vat_transactions" CASCADE;
          DROP TABLE IF EXISTS "vat_rates" CASCADE;
        `);
        console.log('   ✅ Tables VAT supprimées');
      }
      
      // Supprimer les types enum
      await client.query(`
        DROP TYPE IF EXISTS "VatPaymentStatus" CASCADE;
        DROP TYPE IF EXISTS "VatReportStatus" CASCADE;
      `);
      console.log('   ✅ Types enum supprimés');
      
      // Supprimer la migration en échec
      const result = await client.query(`
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251129200000_add_vat_tables'
        RETURNING migration_name;
      `);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ Migration '${result.rows[0].migration_name}' supprimée de l'historique\n`);
      } else {
        console.log('   ⚠️  Migration non trouvée dans l\'historique\n');
      }
    } else {
      console.log('✅ Aucune migration en échec trouvée\n');
    }
    
    // 5. Vérification finale
    console.log('✅ Vérification finale...');
    const remaining = await client.query(`
      SELECT migration_name FROM "_prisma_migrations" 
      WHERE migration_name = '20251129200000_add_vat_tables';
    `);
    
    if (remaining.rows.length === 0) {
      console.log('   ✅ Migration complètement nettoyée\n');
    } else {
      console.log('   ⚠️  La migration existe toujours\n');
    }
    
    await client.end();
    console.log('🎉 Nettoyage terminé avec succès!');
    console.log('\n📋 Prochaines étapes:');
    console.log('1. Commiter et pusher la correction de migration');
    console.log('2. Redéployer sur Render');
    console.log('3. Les migrations s\'appliqueront automatiquement');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

cleanup();
