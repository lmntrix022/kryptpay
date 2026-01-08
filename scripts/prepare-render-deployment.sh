#!/bin/bash
# Script de préparation pour le déploiement Render
# Ce script génère les clés secrètes et vérifie les prérequis

set -e

echo "🚀 Préparation du déploiement KryptPay sur Render"
echo "================================================"
echo ""

# Vérifier que openssl est installé
if ! command -v openssl &> /dev/null; then
    echo "❌ Erreur: openssl n'est pas installé"
    echo "   Installez-le avec: brew install openssl (macOS) ou apt-get install openssl (Linux)"
    exit 1
fi

echo "✅ OpenSSL détecté"
echo ""

# Créer le dossier pour les clés
KEYS_DIR="./.render-keys"
mkdir -p "$KEYS_DIR"

echo "🔑 Génération des clés secrètes..."
echo ""

# 1. JWT Secret
JWT_SECRET=$(openssl rand -hex 32)
echo "JWT_SECRET=$JWT_SECRET" > "$KEYS_DIR/jwt-secret.txt"
echo "✅ JWT_SECRET généré"

# 2. Admin Token
ADMIN_TOKEN=$(openssl rand -hex 32)
echo "ADMIN_TOKEN=$ADMIN_TOKEN" > "$KEYS_DIR/admin-token.txt"
echo "✅ ADMIN_TOKEN généré"

# 3. Data Encryption Key (32 bytes base64)
DATA_ENCRYPTION_KEY=$(openssl rand -base64 32)
echo "DATA_ENCRYPTION_KEY=$DATA_ENCRYPTION_KEY" > "$KEYS_DIR/data-encryption-key.txt"
echo "✅ DATA_ENCRYPTION_KEY généré"

# Vérifier la longueur de DATA_ENCRYPTION_KEY
KEY_LENGTH=$(echo -n "$DATA_ENCRYPTION_KEY" | base64 -d 2>/dev/null | wc -c | tr -d ' ')
if [ "$KEY_LENGTH" != "32" ]; then
    echo "⚠️  Attention: DATA_ENCRYPTION_KEY devrait être 32 bytes, actuellement: $KEY_LENGTH bytes"
else
    echo "✅ DATA_ENCRYPTION_KEY vérifié (32 bytes)"
fi

echo ""
echo "📝 Création du fichier récapitulatif..."
cat > "$KEYS_DIR/README.md" << EOF
# Clés Secrètes pour Render

⚠️ **IMPORTANT**: Ces clés sont sensibles. Ne les commitez JAMAIS dans Git.

## Clés générées

- **JWT_SECRET**: Pour l'authentification JWT
- **ADMIN_TOKEN**: Pour les endpoints d'administration
- **DATA_ENCRYPTION_KEY**: Pour le chiffrement des données (32 bytes)

## Utilisation

Ces clés doivent être ajoutées dans le Dashboard Render :
1. Allez dans votre service web (kryptpay-api)
2. Section "Environment"
3. Ajoutez chaque variable avec sa valeur correspondante

## Fichiers

- \`jwt-secret.txt\`: Contient JWT_SECRET
- \`admin-token.txt\`: Contient ADMIN_TOKEN
- \`data-encryption-key.txt\`: Contient DATA_ENCRYPTION_KEY

## Sécurité

Après avoir ajouté ces clés dans Render, vous pouvez supprimer ce dossier :
\`\`\`bash
rm -rf .render-keys
\`\`\`
EOF

echo "✅ Fichier README.md créé dans $KEYS_DIR"
echo ""

# Afficher un résumé
echo "📋 Résumé des clés générées:"
echo "=============================="
echo ""
echo "JWT_SECRET: $(cat $KEYS_DIR/jwt-secret.txt | cut -d'=' -f2 | head -c 20)..."
echo "ADMIN_TOKEN: $(cat $KEYS_DIR/admin-token.txt | cut -d'=' -f2 | head -c 20)..."
echo "DATA_ENCRYPTION_KEY: $(cat $KEYS_DIR/data-encryption-key.txt | cut -d'=' -f2 | head -c 20)..."
echo ""
echo "✅ Toutes les clés ont été générées et sauvegardées dans: $KEYS_DIR"
echo ""
echo "📌 Prochaines étapes:"
echo "   1. Vérifiez les clés dans: $KEYS_DIR/"
echo "   2. Créez votre compte Render (si pas déjà fait)"
echo "   3. Créez la base de données PostgreSQL sur Render"
echo "   4. Configurez Redis (Upstash recommandé)"
echo "   5. Créez le service web API avec les variables d'environnement"
echo ""
echo "📖 Consultez DEPLOIEMENT_ETAPE_PAR_ETAPE.md pour les instructions détaillées"
echo ""
