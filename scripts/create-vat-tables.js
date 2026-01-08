const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('📦 Création des tables VAT...');
  
  const sqlFile = path.join(__dirname, '../prisma/migrations/20251129200000_add_vat_tables/migration.sql');
  let sql = fs.readFileSync(sqlFile, 'utf-8');
  
  // Exécuter le SQL complet en une seule fois
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log('✅ Tables VAT créées avec succès!');
  } catch (error) {
    // Si erreur, essayer de créer les tables une par une
    console.log('⚠️  Erreur lors de l\'exécution complète, tentative table par table...');
    console.log('Erreur:', error.message.substring(0, 200));
    
    // Extraire et exécuter les CREATE TABLE individuellement
    const createTableRegex = /CREATE TABLE IF NOT EXISTS "([^"]+)"[^;]+;/gs;
    const matches = [...sql.matchAll(createTableRegex)];
    
    for (const match of matches) {
      const tableName = match[1];
      const createStatement = match[0];
      try {
        await prisma.$executeRawUnsafe(createStatement);
        console.log(`✅ Table ${tableName} créée`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`⚠️  Table ${tableName} existe déjà`);
        } else {
          console.error(`❌ Erreur pour ${tableName}:`, err.message.substring(0, 100));
        }
      }
    }
    
    // Créer les enums
    const enumRegex = /DO \$\$ BEGIN[\s\S]*?END \$\$;/g;
    const enumMatches = [...sql.matchAll(enumRegex)];
    for (const match of enumMatches) {
      try {
        await prisma.$executeRawUnsafe(match[0]);
        console.log('✅ Enum créé');
      } catch (err) {
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('⚠️  Enum existe déjà');
        } else {
          console.error('❌ Erreur enum:', err.message.substring(0, 100));
        }
      }
    }
    
    // Créer les index
    const indexRegex = /CREATE (UNIQUE )?INDEX IF NOT EXISTS[^;]+;/g;
    const indexMatches = [...sql.matchAll(indexRegex)];
    for (const match of indexMatches) {
      try {
        await prisma.$executeRawUnsafe(match[0]);
      } catch (err) {
        // Ignorer les erreurs d'index
      }
    }
    
    // Ajouter les foreign keys (en ignorant les erreurs si les tables de base n'existent pas)
    const fkRegex = /ALTER TABLE[^;]+;/g;
    const fkMatches = [...sql.matchAll(fkRegex)];
    for (const match of fkMatches) {
      try {
        await prisma.$executeRawUnsafe(match[0]);
        console.log('✅ Foreign key ajoutée');
      } catch (err) {
        if (err.message.includes('does not exist') && (err.message.includes('merchants') || err.message.includes('payments') || err.message.includes('refunds'))) {
          console.log('⚠️  Foreign key ignorée (table de base manquante)');
        } else if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('⚠️  Foreign key existe déjà');
        } else {
          console.error('❌ Erreur FK:', err.message.substring(0, 100));
        }
      }
    }
  }
  
  console.log('✅ Processus terminé!');
}

main()
  .catch((e) => {
    console.error('Erreur fatale:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
