# 🔧 Fix package-lock.json - Sharp Dependencies

## 🔴 Problème

Le `package-lock.json` n'est pas synchronisé après l'ajout de `sharp` :

```
Missing: sharp@0.33.5 from lock file
Missing: @img/sharp-* from lock file
```

## ✅ Solution

### 1. Mettre à jour package-lock.json localement

Exécutez dans votre terminal :

```bash
cd /Users/valerie/Desktop/booh-pay/apps/dashboard
npm install
```

Cela mettra à jour le `package-lock.json` avec toutes les dépendances de `sharp` et ses sous-dépendances.

### 2. Commiter les changements

```bash
cd /Users/valerie/Desktop/booh-pay
git add apps/dashboard/package.json
git add apps/dashboard/package-lock.json
git commit -m "fix: Update package-lock.json with sharp dependencies"
git push origin main
```

### 3. Redéployer

Render redéploiera automatiquement après le push.

## ✅ Vérification

Après le redéploiement :
- ✅ `npm ci` devrait fonctionner sans erreur
- ✅ Le build devrait réussir
- ✅ Le dashboard devrait démarrer correctement

---

**Note** : `sharp` a de nombreuses dépendances natives (`@img/sharp-*`) pour différentes plateformes. C'est normal que `npm install` ajoute toutes ces dépendances au `package-lock.json`.
