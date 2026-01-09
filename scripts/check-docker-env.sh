#!/bin/bash

# Script pour vérifier quelle clé Stripe est chargée dans Docker

echo "🔍 Vérification de la configuration Stripe dans Docker..."
echo ""

echo "1. Clé dans config/docker.env:"
grep "^STRIPE_SECRET_KEY=" config/docker.env | sed 's/\(sk_test_\).*\(.\{4\}\)$/\1...\2/' || echo "   ❌ Non trouvée"

echo ""
echo "2. Clé dans le conteneur Docker (si en cours d'exécution):"
docker-compose exec -T app printenv STRIPE_SECRET_KEY 2>/dev/null | sed 's/\(sk_test_\).*\(.\{4\}\)$/\1...\2/' || echo "   ⚠️  Conteneur non accessible ou variable non définie"

echo ""
echo "3. Fichiers .env à la racine (peuvent surcharger config/docker.env):"
if [ -f .env ]; then
  echo "   ⚠️  .env trouvé:"
  grep "^STRIPE_SECRET_KEY=" .env | sed 's/\(sk_test_\).*\(.\{4\}\)$/\1...\2/' || echo "      (pas de STRIPE_SECRET_KEY)"
else
  echo "   ✅ Pas de .env à la racine"
fi

if [ -f .env.local ]; then
  echo "   ⚠️  .env.local trouvé:"
  grep "^STRIPE_SECRET_KEY=" .env.local | sed 's/\(sk_test_\).*\(.\{4\}\)$/\1...\2/' || echo "      (pas de STRIPE_SECRET_KEY)"
else
  echo "   ✅ Pas de .env.local à la racine"
fi

echo ""
echo "4. Ordre de chargement NestJS (selon app.module.ts):"
echo "   1. .env.local (priorité la plus haute)"
echo "   2. .env"
echo "   3. Variables d'environnement système"
echo "   4. config/docker.env (via Docker env_file)"

echo ""
echo "💡 Solution:"
echo "   - Si un fichier .env ou .env.local existe, il surcharge config/docker.env"
echo "   - Supprimez ou mettez à jour ces fichiers, OU"
echo "   - Mettez la bonne clé dans .env/.env.local"
