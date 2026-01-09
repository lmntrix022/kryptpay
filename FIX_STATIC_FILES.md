# 🔧 Correction des fichiers statiques manquants (404)

## Problème

Les fichiers JavaScript, CSS et autres assets retournent 404 car Next.js en mode `standalone` ne copie pas automatiquement les fichiers statiques.

## Solution appliquée

J'ai mis à jour le `render.yaml` pour copier les fichiers statiques après le build :

```yaml
buildCommand: NODE_ENV=production npm ci && npm run build && cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public
startCommand: cd .next/standalone && node server.js
```

## Ce que fait cette commande

1. `npm ci` - Installe les dépendances
2. `npm run build` - Build Next.js en mode standalone
3. `cp -r .next/static .next/standalone/.next/static` - Copie les fichiers JS/CSS compilés
4. `cp -r public .next/standalone/public` - Copie les fichiers publics (favicon, images, etc.)

## Prochaines étapes

1. **Commitez et poussez les changements** :
   ```bash
   git add render.yaml
   git commit -m "fix: Copy static files for Next.js standalone build"
   git push
   ```

2. **Render redéploiera automatiquement** avec la nouvelle configuration

3. **Vérifiez** que les fichiers se chargent correctement après le déploiement

## Alternative : Script de build

Si vous préférez, vous pouvez créer un script `build-standalone.sh` dans `apps/dashboard/` :

```bash
#!/bin/bash
npm ci
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
```

Puis utiliser dans `render.yaml` :
```yaml
buildCommand: NODE_ENV=production bash build-standalone.sh
```
