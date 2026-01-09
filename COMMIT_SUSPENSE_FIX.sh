#!/bin/bash
# Script pour commiter la correction Suspense

cd /Users/valerie/Desktop/booh-pay

# Ajouter le fichier avec guillemets pour zsh
git add "apps/dashboard/app/(auth)/password/reset/page.tsx"

# Commiter
git commit -m "fix: Wrap useSearchParams in Suspense boundary for password reset page"

echo "✅ Commit créé. Pousser avec: git push origin main"
