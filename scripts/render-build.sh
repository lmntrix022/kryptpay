#!/bin/bash
# Script de build pour Render
# Ce script s'assure que toutes les dépendances sont installées correctement

set -e  # Exit on any error

echo "🔨 Building KryptPay API for Render..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Generate Prisma Client
echo "🗄️  Generating Prisma Client..."
npm run prisma:generate

# Build the application
echo "🏗️  Building TypeScript..."
npm run build

# Verify build
if [ ! -d "dist" ]; then
  echo "❌ Build failed: dist directory not found"
  exit 1
fi

echo "✅ Build completed successfully!"
