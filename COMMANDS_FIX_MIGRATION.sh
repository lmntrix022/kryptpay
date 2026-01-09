#!/bin/bash
# Script pour fixer les migrations sur Render

echo "🔧 Fix des migrations - Préparation du commit..."

# Ajouter les nouvelles migrations renommées
git add prisma/migrations/20251102000000_add_notifications
git add prisma/migrations/20251102240000_advanced_features

# Supprimer les anciennes migrations
git rm prisma/migrations/20250103014430_add_notifications/migration.sql 2>/dev/null || true
git rm prisma/migrations/20250103020000_advanced_features/migration.sql 2>/dev/null || true

# Commiter
git commit -m "fix: Rename migrations to correct order (after merchants creation)

- Rename 20250103014430_add_notifications to 20251102000000_add_notifications
- Rename 20250103020000_advanced_features to 20251102240000_advanced_features
- These migrations now run after merchants table is created"

echo "✅ Commit créé. Pousser avec: git push origin main"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Se connecter à PostgreSQL Render"
echo "2. Exécuter: DELETE FROM \"_prisma_migrations\" WHERE migration_name = '20250103014430_add_notifications';"
echo "3. Redéployer sur Render"
