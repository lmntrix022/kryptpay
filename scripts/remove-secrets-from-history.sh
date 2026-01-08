#!/bin/bash
# Script pour supprimer config/docker.env de tout l'historique Git

set -e

echo "🔒 Suppression de config/docker.env de l'historique Git"
echo "========================================================"
echo ""
echo "⚠️  ATTENTION: Cette opération va réécrire tout l'historique Git"
echo "   Assurez-vous que personne d'autre n'a cloné le repository"
echo ""

read -p "Voulez-vous continuer? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Opération annulée"
    exit 1
fi

echo ""
echo "🗑️  Suppression de config/docker.env de l'historique..."

# Méthode 1: Utiliser git filter-branch (méthode classique)
if command -v git-filter-branch &> /dev/null || git filter-branch --version &> /dev/null; then
    echo "📝 Utilisation de git filter-branch..."
    git filter-branch --force --index-filter \
      'git rm --cached --ignore-unmatch config/docker.env' \
      --prune-empty --tag-name-filter cat -- --all
    
    echo ""
    echo "✅ Historique réécrit avec git filter-branch"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Vérifiez l'historique: git log --oneline"
    echo "   2. Force push: git push origin --force --all"
    echo "   3. Force push tags: git push origin --force --tags"
    
# Méthode 2: Utiliser git filter-repo (plus moderne, mais nécessite installation)
elif command -v git-filter-repo &> /dev/null; then
    echo "📝 Utilisation de git filter-repo..."
    git filter-repo --path config/docker.env --invert-paths --force
    
    echo ""
    echo "✅ Historique réécrit avec git filter-repo"
    echo ""
    echo "📋 Prochaines étapes:"
    echo "   1. Vérifiez l'historique: git log --oneline"
    echo "   2. Force push: git push origin --force --all"
    echo "   3. Force push tags: git push origin --force --tags"

# Méthode 3: Alternative - créer un nouveau repository
else
    echo "⚠️  git filter-branch et git filter-repo ne sont pas disponibles"
    echo ""
    echo "💡 Solution alternative: Créer un nouveau commit initial"
    echo ""
    echo "   1. Créez une nouvelle branche sans l'historique:"
    echo "      git checkout --orphan new-main"
    echo "      git add ."
    echo "      git commit -m 'Initial commit: KryptPay (secrets removed)'"
    echo ""
    echo "   2. Supprimez l'ancienne branche et renommez:"
    echo "      git branch -D main"
    echo "      git branch -m main"
    echo ""
    echo "   3. Force push:"
    echo "      git push -f origin main"
    exit 1
fi
