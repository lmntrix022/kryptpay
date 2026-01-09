#!/bin/bash

# Script pour vérifier les utilisateurs dans la base de données Docker locale

echo "🔍 Vérification des utilisateurs dans la base de données Docker locale..."
echo ""

# Connexion à PostgreSQL via Docker
docker exec -it booh-pay-postgres-1 psql -U boohpay -d boohpay <<EOF

-- Voir tous les utilisateurs
SELECT 
    id,
    email,
    role,
    merchant_id,
    created_at
FROM users
ORDER BY created_at DESC;

-- Compter les utilisateurs par rôle
SELECT 
    role,
    COUNT(*) as count
FROM users
GROUP BY role;

-- Voir les marchands
SELECT 
    id,
    name,
    created_at
FROM merchants
ORDER BY created_at DESC;

-- Voir les clés API
SELECT 
    id,
    label,
    merchant_id,
    created_at,
    last_used_at,
    status
FROM api_keys
ORDER BY created_at DESC;

EOF

echo ""
echo "✅ Vérification terminée"
