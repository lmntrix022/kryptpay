#!/bin/bash
# Script pour commiter les corrections du dashboard

cd /Users/valerie/Desktop/booh-pay

# Ajouter les fichiers modifiés (avec guillemets pour zsh)
git add "apps/dashboard/next.config.mjs"
git add "apps/dashboard/app/(protected)/vat/settings/page.tsx"
git add apps/dashboard/package.json
git add apps/dashboard/package-lock.json

# Commiter
git commit -m "fix: Configure webpack for optional Stripe deps and fix TypeScript errors

- Externalize Stripe dependencies in webpack config (SDK handles them with try/catch)
- Add missing availableProviders and compatibleProviders to ReversementValidation
- Add Stripe dependencies to dashboard package.json"

echo "✅ Commit créé. Pousser avec: git push origin main"
