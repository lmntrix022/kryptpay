#!/bin/bash
# Script pour retirer les secrets de l'historique Git

set -e

echo "🔒 Nettoyage des secrets de l'historique Git"
echo "=============================================="
echo ""

# Vérifier que nous sommes dans un repo Git
if [ ! -d .git ]; then
    echo "❌ Erreur: Ce n'est pas un repository Git"
    exit 1
fi

echo "📋 Fichiers à retirer de l'historique :"
echo "  - config/docker.env (contient des clés secrètes)"
echo ""

# Vérifier que config/docker.env est dans .gitignore
if ! grep -q "config/docker.env" .gitignore 2>/dev/null; then
    echo "⚠️  Attention: config/docker.env n'est pas dans .gitignore"
    echo "   Ajout automatique..."
    echo "" >> .gitignore
    echo "# Fichiers de configuration avec secrets" >> .gitignore
    echo "config/docker.env" >> .gitignore
    echo "✅ Ajouté au .gitignore"
fi

echo ""
echo "🗑️  Retrait de config/docker.env de l'index Git..."
git rm --cached config/docker.env 2>/dev/null || true

echo ""
echo "📝 Création d'un nouveau commit sans les secrets..."
git add .gitignore
git commit -m "chore: Remove secrets from repository (config/docker.env)"

echo ""
echo "✅ Fichier retiré du repository"
echo ""
echo "📌 Prochaines étapes :"
echo "   1. Vérifiez que config/docker.env est bien dans .gitignore"
echo "   2. Essayez de pousser à nouveau : git push -u origin main"
echo ""
echo "⚠️  Note: Le commit précédent contient encore le secret dans l'historique."
echo "   Si vous voulez le supprimer complètement, vous devrez réécrire l'historique :"
echo "   git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch config/docker.env' --prune-empty --tag-name-filter cat -- --all"
echo "   (⚠️  Attention: Cela réécrit tout l'historique Git)"
