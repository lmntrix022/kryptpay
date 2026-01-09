# 🔧 Fix Standalone Start Command

## 🔴 Problème

Next.js en mode `standalone` nécessite une commande de démarrage différente :

```
"next start" does not work with "output: standalone" configuration. 
Use "node .next/standalone/server.js" instead.
```

## ✅ Solution Appliquée

Modifié `render.yaml` pour utiliser la commande correcte :

**Avant** :
```yaml
startCommand: npm start
```

**Après** :
```yaml
startCommand: node .next/standalone/server.js
```

## 📋 Actions Requises

### 1. Commiter les Corrections

```bash
cd /Users/valerie/Desktop/booh-pay
git add render.yaml
git add apps/dashboard/package.json
git commit -m "fix: Add sharp dependency and fix standalone start command"
git push origin main
```

### 2. Mettre à jour package-lock.json

N'oubliez pas de mettre à jour le `package-lock.json` localement :

```bash
cd apps/dashboard
npm install
git add package-lock.json
git commit -m "chore: Update package-lock.json with sharp"
git push origin main
```

### 3. Redéployer

Render redéploiera automatiquement après le push.

## ✅ Vérification

Après le redéploiement :
- ✅ `sharp` sera installé
- ✅ La commande de démarrage utilisera le serveur standalone
- ✅ Le dashboard devrait démarrer sans erreur
- ✅ L'optimisation d'images fonctionnera

## 🔍 Note

Le mode `standalone` de Next.js crée un serveur autonome dans `.next/standalone/` qui contient toutes les dépendances nécessaires. C'est pourquoi il faut utiliser `node .next/standalone/server.js` au lieu de `npm start`.

---

**Référence** : https://nextjs.org/docs/pages/api-reference/next-config-js/output#standalone
