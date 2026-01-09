# 🔧 Fix package-lock.json - Dépendances Stripe

## 🔴 Problème

Le `package-lock.json` n'est pas synchronisé avec `package.json` après l'ajout des dépendances Stripe :

```
Missing: @stripe/react-stripe-js@5.4.1 from lock file
Missing: @stripe/stripe-js@8.6.1 from lock file
```

**Cause** : Les dépendances ont été ajoutées à `package.json` mais `package-lock.json` n'a pas été mis à jour.

## ✅ Solution

### 1. Mettre à jour package-lock.json localement

Exécutez cette commande dans votre terminal :

```bash
cd /Users/valerie/Desktop/booh-pay/apps/dashboard
npm install
```

Cela mettra à jour le `package-lock.json` avec les nouvelles dépendances Stripe.

### 2. Vérifier les changements

```bash
git status apps/dashboard/package-lock.json
```

Vous devriez voir que `package-lock.json` a été modifié.

### 3. Commiter les changements

```bash
cd /Users/valerie/Desktop/booh-pay
git add apps/dashboard/package.json
git add apps/dashboard/package-lock.json
git add apps/dashboard/app/(protected)/vat/settings/page.tsx
git commit -m "fix: Add Stripe dependencies and update package-lock.json"
git push origin main
```

### 4. Redéployer sur Render

Render redéploiera automatiquement après le push, ou :
- Render Dashboard → **kryptpay-dashboard** → **Manual Deploy**

## ✅ Vérification

Après le redéploiement :
- ✅ `npm ci` devrait fonctionner sans erreur
- ✅ Le build devrait réussir
- ✅ Le dashboard devrait démarrer correctement

---

**Note** : `npm ci` nécessite que `package.json` et `package-lock.json` soient parfaitement synchronisés. C'est pourquoi il faut toujours commiter le `package-lock.json` après avoir ajouté des dépendances.
