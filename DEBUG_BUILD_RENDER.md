# 🔍 Debug Build Render - Erreur Status 2

## 🔴 Problème Actuel

Le déploiement échoue avec "Exited with status 2 while building your code".

## 📋 Vérifications à Faire

### 1. Vérifier les Logs de Build

Dans Render Dashboard → **kryptpay-api** → **Logs**, cherchez :
- Erreurs TypeScript
- Erreurs de dépendances manquantes
- Erreurs Prisma
- Erreurs de permissions

### 2. Tester le Build Localement

```bash
cd /Users/valerie/Desktop/booh-pay

# Nettoyer
rm -rf node_modules dist

# Installer les dépendances
npm ci

# Générer Prisma Client
npm run prisma:generate

# Build
npm run build
```

### 3. Erreurs Communes

#### Erreur Prisma
```
Error: P1001: Can't reach database server
```
**Solution** : Normal en local, mais vérifiez que DATABASE_URL est bien configuré dans Render

#### Erreur TypeScript
```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```
**Solution** : Corrigez les erreurs TypeScript avant de pousser

#### Erreur de Dépendances
```
npm ERR! peer dep missing: package@version
```
**Solution** : Vérifiez que toutes les dépendances sont dans package.json

## ✅ Actions Correctives

1. **Vérifiez les logs Render** et identifiez l'erreur exacte
2. **Testez localement** : `npm run build`
3. **Corrigez les erreurs** identifiées
4. **Commitez et poussez** les corrections
5. **Redéployez** sur Render

## 🔧 Commandes de Debug

```bash
# Vérifier les erreurs TypeScript
npm run build

# Vérifier Prisma
npm run prisma:generate

# Vérifier les dépendances
npm ci

# Vérifier la configuration
cat render.yaml
```

---

**Partagez les logs de build Render si besoin d'aide supplémentaire !**
