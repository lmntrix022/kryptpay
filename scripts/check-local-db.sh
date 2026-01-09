#!/bin/bash

# Script pour vérifier les utilisateurs dans la base de données Docker locale

echo "🔍 Vérification des utilisateurs dans la base de données Docker locale..."
echo ""

# Trouver le nom du conteneur PostgreSQL
POSTGRES_CONTAINER=$(docker ps --filter "name=postgres" --format "{{.Names}}" | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
  echo "❌ Aucun conteneur PostgreSQL trouvé"
  echo ""
  echo "Démarrez Docker Compose d'abord:"
  echo "  docker-compose up -d postgres"
  exit 1
fi

echo "📦 Conteneur PostgreSQL: $POSTGRES_CONTAINER"
echo ""

# Connexion à PostgreSQL
docker exec -it $POSTGRES_CONTAINER psql -U boohpay -d boohpay <<EOF

\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '👤 UTILISATEURS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
SELECT 
    id,
    email,
    role,
    merchant_id,
    created_at
FROM users
ORDER BY created_at DESC;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '📊 STATISTIQUES PAR RÔLE'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
SELECT 
    role,
    COUNT(*) as count
FROM users
GROUP BY role;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🏢 MARCHANDS'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
SELECT 
    id,
    name,
    created_at
FROM merchants
ORDER BY created_at DESC;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '🔑 CLÉS API'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
SELECT 
    id,
    label,
    merchant_id,
    created_at,
    last_used_at,
    status
FROM api_keys
ORDER BY created_at DESC;

\echo ''
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
\echo '💳 TRANSACTIONS (5 dernières)'
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
SELECT 
    id,
    "orderId",
    "amountMinor",
    currency,
    status,
    "merchant_id",
    "createdAt"
FROM transactions
ORDER BY "createdAt" DESC
LIMIT 5;

EOF

echo ""
echo "✅ Vérification terminée"
