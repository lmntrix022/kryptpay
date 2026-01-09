# 🔌 Connexion à PostgreSQL Render - Options

## 🔴 Problème

`psql` n'est pas installé sur votre système. Voici plusieurs options pour se connecter à PostgreSQL Render.

## ✅ Option 1 : Installer psql (Recommandé)

### Sur macOS (Homebrew)

```bash
brew install postgresql@15
# Ou
brew install libpq
brew link --force libpq

# Vérifier l'installation
psql --version
```

### Sur Linux

```bash
sudo apt-get install postgresql-client
# Ou
sudo yum install postgresql
```

### Utiliser le chemin complet Homebrew

Si `psql` est installé mais pas dans le PATH :

```bash
# Trouver l'emplacement
brew --prefix libpq

# Utiliser le chemin complet (exemple)
/opt/homebrew/opt/libpq/bin/psql postgresql://...
```

## ✅ Option 2 : Utiliser Docker (Sans installation)

Si Docker est installé, vous pouvez utiliser un conteneur PostgreSQL :

```bash
# Obtenez la commande de connexion depuis Render Dashboard
# Format : postgresql://user:password@host:port/database

# Exécutez psql dans un conteneur Docker
docker run -it --rm postgres:15 psql "postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
```

Exemple avec les vraies valeurs depuis Render :
```bash
docker run -it --rm postgres:15 psql "postgresql://kryptpay_user:password@dpg-d5g50gv5r7bs73bqh100-a:5432/kryptpay_k4q0"
```

## ✅ Option 3 : Interface Web Render (Si disponible)

1. **Render Dashboard** → **kryptpay-db** → **Connect**
2. Cherchez une option "**Web Console**" ou "**SQL Editor**"
3. Si disponible, vous pouvez exécuter les commandes SQL directement

## ✅ Option 4 : Client PostgreSQL Graphique

### pgAdmin (Gratuit, Open Source)

1. Téléchargez : https://www.pgadmin.org/download/
2. Installez pgAdmin
3. Créez une nouvelle connexion :
   - **Host** : `dpg-d5g50gv5r7bs73bqh100-a` (depuis votre URL Render)
   - **Port** : `5432`
   - **Database** : `kryptpay_k4q0`
   - **Username** : (depuis vos credentials Render)
   - **Password** : (depuis vos credentials Render)

### TablePlus (Mac/Windows, Payant mais gratuit pour usage limité)

1. Téléchargez : https://tableplus.com/
2. Créez une nouvelle connexion PostgreSQL
3. Utilisez les credentials depuis Render Dashboard

### DBeaver (Gratuit, Open Source)

1. Téléchargez : https://dbeaver.io/download/
2. Créez une nouvelle connexion PostgreSQL
3. Utilisez les credentials depuis Render Dashboard

## ✅ Option 5 : Script Node.js (Temporaire)

Si vous préférez rester dans Node.js, vous pouvez créer un script temporaire :

```bash
npm install pg
```

Créer un fichier `cleanup-migration.js` :

```javascript
const { Client } = require('pg');

// Remplacez par vos credentials depuis Render Dashboard
const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://...',
  ssl: { rejectUnauthorized: false }
});

async function cleanup() {
  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL');
    
    // Supprimer la migration en échec
    const result = await client.query(`
      DELETE FROM "_prisma_migrations" 
      WHERE migration_name = '20251129200000_add_vat_tables'
      RETURNING migration_name;
    `);
    
    console.log('✅ Migration supprimée:', result.rows);
    
    // Vérifier les tables VAT
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'vat_%';
    `);
    
    console.log('📋 Tables VAT existantes:', tables.rows);
    
    if (tables.rows.length > 0) {
      console.log('⚠️  Des tables VAT existent. Supprimez-les manuellement si nécessaire.');
    }
    
    await client.end();
    console.log('✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanup();
```

Exécuter :
```bash
DATABASE_URL="postgresql://..." node cleanup-migration.js
```

## 📋 Commandes SQL à Exécuter

Quelle que soit l'option choisie, exécutez ces commandes :

```sql
-- 1. Vérifier l'état des migrations
SELECT migration_name, finished_at, applied_steps_count, rolled_back_at
FROM "_prisma_migrations" 
ORDER BY started_at;

-- 2. Supprimer la migration en échec
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251129200000_add_vat_tables';

-- 3. Vérifier si des tables VAT existent
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'vat_%';

-- 4. Si des tables existent, les supprimer (ATTENTION : Supprime les données !)
DROP TABLE IF EXISTS "vat_audit_logs" CASCADE;
DROP TABLE IF EXISTS "merchant_vat_settings" CASCADE;
DROP TABLE IF EXISTS "vat_payments" CASCADE;
DROP TABLE IF EXISTS "vat_reports" CASCADE;
DROP TABLE IF EXISTS "vat_refund_adjustments" CASCADE;
DROP TABLE IF EXISTS "vat_transactions" CASCADE;
DROP TABLE IF EXISTS "vat_rates" CASCADE;

-- 5. Supprimer les types enum si nécessaire
DROP TYPE IF EXISTS "VatPaymentStatus" CASCADE;
DROP TYPE IF EXISTS "VatReportStatus" CASCADE;

-- 6. Vérifier que tout est propre
SELECT migration_name FROM "_prisma_migrations" 
WHERE migration_name LIKE '%vat%';
```

## 🎯 Recommandation

**Pour macOS** : Utilisez **Option 1** (Homebrew) ou **Option 4** (TablePlus/pgAdmin) pour une solution durable.

**Solution rapide** : Utilisez **Option 2** (Docker) si Docker est installé.

---

**💡 Astuce** : Une fois connecté, sauvegardez la commande de connexion pour plus tard !
