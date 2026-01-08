# 🔧 Appliquer la Migration Refunds

## ✅ Migration Créée

Le fichier de migration a été créé:
- `prisma/migrations/20251102230000_add_refunds/migration.sql`

## 📋 Options pour Appliquer

### Option 1: Via Docker (si PostgreSQL tourne dans Docker)

```bash
docker exec -i $(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1) \
  psql -U boohpay -d boohpay < prisma/migrations/20251102230000_add_refunds/migration.sql
```

### Option 2: Via psql Directement

```bash
psql $DATABASE_URL -f prisma/migrations/20251102230000_add_refunds/migration.sql
```

### Option 3: Via un Client PostgreSQL GUI

Ouvrez le fichier `prisma/migrations/20251102230000_add_refunds/migration.sql` et exécutez-le dans votre client (pgAdmin, DBeaver, etc.)

### Option 4: Résoudre le Drift avec Prisma Migrate

Si vous préférez que Prisma gère la migration:

```bash
# Marquer la migration comme appliquée (déjà fait)
npx prisma migrate resolve --applied 20251102230000_add_refunds

# Puis appliquer si nécessaire
npx prisma migrate deploy
```

## ⚠️ Note sur le Drift

Prisma détecte un drift car:
- La migration `shap_payouts_base` a créé `PayoutProvider` avec seulement `SHAP`
- Le schema.prisma maintenant inclut `MONEROO` dans `PayoutProvider`
- La migration refunds ajoute `MONEROO` avec une vérification `IF NOT EXISTS`

C'est normal et la migration gère ce cas.

## ✅ Vérification

Après avoir appliqué la migration, vérifiez:

```sql
-- Vérifier que les tables existent
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('refunds', 'refund_events');

-- Vérifier l'enum RefundStatus
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'RefundStatus');

-- Vérifier PayoutProvider
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PayoutProvider');
```

---

*Migration créée le: $(date +'%Y-%m-%d %H:%M:%S')*


