# 🔧 Fix Build - Types TypeScript Manquants

## 🔴 Problème

Le build échoue avec des erreurs comme :
```
error TS7016: Could not find a declaration file for module 'express'
```

**Cause** : Render installe les dépendances avec `npm ci` qui, si `NODE_ENV=production`, n'installe pas les `devDependencies`. Mais TypeScript et les `@types/*` sont nécessaires pour compiler.

## ✅ Solution

### Option 1 : Modifier la commande de build (Recommandée)

Changez `buildCommand` dans `render.yaml` pour installer les devDependencies :

```yaml
buildCommand: NODE_ENV= npm ci && npm run prisma:generate && npm run build
```

Ou encore mieux, utilisez la variable d'environnement uniquement après le build :

```yaml
buildCommand: npm ci && npm run prisma:generate && npm run build
```

Et définissez `NODE_ENV=production` **après** le build, ou laissez-le seulement dans les variables d'environnement du runtime.

### Option 2 : Déplacer TypeScript et types vers dependencies (Non recommandé)

Pas idéal car cela augmente la taille du runtime. Mais si nécessaire :

```json
"dependencies": {
  "typescript": "5.3.3",
  "@types/express": "^4.17.21",
  "@types/node": "^20.11.19",
  // ... autres @types nécessaires
}
```

### Option 3 : Utiliser un script de build personnalisé

Créer un script qui installe les devDependencies, build, puis nettoie :

```json
"scripts": {
  "build:render": "npm ci && npm run prisma:generate && npm run build && npm prune --production"
}
```

## 🎯 Solution Appliquée

La meilleure solution est de **ne pas définir `NODE_ENV=production` dans les envVars du service** (ou le définir seulement après le build). Render le définira automatiquement à l'exécution.

**Modification dans render.yaml** : La commande de build utilise simplement `npm ci` qui installera les devDependencies si `NODE_ENV` n'est pas `production` pendant le build.

## 📝 Note

Les `devDependencies` sont installées pendant le build mais ne sont pas utilisées à l'exécution. Cela est normal et ne pose pas de problème de sécurité ou de performance.
