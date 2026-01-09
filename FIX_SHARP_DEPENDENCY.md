# 🔧 Fix Sharp Dependency - Image Optimization

## 🔴 Problème

Next.js en mode `standalone` nécessite `sharp` pour l'optimisation d'images :

```
Error: 'sharp' is required to be installed in standalone mode for the image optimization to function correctly.
```

**Cause** : Le mode `standalone` de Next.js nécessite `sharp` pour optimiser les images, mais il n'est pas installé dans les dépendances.

## ✅ Solution Appliquée

Ajouté `sharp` dans les dépendances de `apps/dashboard/package.json` :

```json
"dependencies": {
  ...
  "sharp": "^0.33.0",
  ...
}
```

## 📋 Actions Requises

### 1. Mettre à jour package-lock.json

Exécutez dans votre terminal :

```bash
cd /Users/valerie/Desktop/booh-pay/apps/dashboard
npm install
```

Cela mettra à jour le `package-lock.json` avec `sharp`.

### 2. Commiter les Corrections

```bash
cd /Users/valerie/Desktop/booh-pay
git add apps/dashboard/package.json
git add apps/dashboard/package-lock.json
git commit -m "fix: Add sharp dependency for Next.js standalone image optimization"
git push origin main
```

### 3. Redéployer

Render redéploiera automatiquement après le push.

## ✅ Vérification

Après le redéploiement :
- ✅ `sharp` sera installé
- ✅ L'optimisation d'images fonctionnera
- ✅ Le dashboard devrait démarrer sans erreur

## 🔍 Note

`sharp` est une bibliothèque native qui nécessite une compilation. Render devrait gérer cela automatiquement, mais si vous rencontrez des problèmes, vérifiez que :
1. `sharp` est dans `dependencies` (pas `devDependencies`)
2. Le `package-lock.json` est à jour
3. Render utilise Node.js 18+ (requis pour `sharp`)

---

**Référence** : https://nextjs.org/docs/messages/sharp-missing-in-production
