#!/bin/bash

# Script pour appliquer la migration Prisma

echo "📦 Application de la migration Prisma..."
echo ""

# Vérifier que la base de données est accessible
echo "🔍 Vérification de la connexion à la base de données..."
if ! npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
  echo "⚠️  La base de données n'est pas accessible"
  echo ""
  echo "💡 Assurez-vous que PostgreSQL est démarré:"
  echo "   - Docker: docker-compose up -d postgres"
  echo "   - Local: Vérifiez que PostgreSQL est en cours d'exécution"
  echo ""
  exit 1
fi

echo "✅ Connexion à la base de données réussie"
echo ""

# Appliquer la migration
echo "📦 Application de la migration..."
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration appliquée avec succès !"
  echo ""
  
  # Régénérer le Prisma Client
  echo "🔄 Régénération du Prisma Client..."
  npx prisma generate
  
  echo ""
  echo "✅ Migration complète !"
  echo ""
  echo "📋 Tables créées:"
  echo "  ✅ subscriptions"
  echo "  ✅ dunning_attempts"
  echo "  ✅ saved_filters"
  echo "  ✅ sandbox_webhook_logs"
  echo ""
  echo "📋 Colonnes ajoutées:"
  echo "  ✅ payments.is_test_mode"
  echo "  ✅ payments.subscription_id"
  echo "  ✅ payouts.is_test_mode"
  echo ""
else
  echo ""
  echo "❌ Erreur lors de l'application de la migration"
  exit 1
fi


