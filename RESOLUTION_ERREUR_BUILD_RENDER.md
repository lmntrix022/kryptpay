# 🔧 Résolution Erreur Build Render (Status 2)

## ✅ Bonne Nouvelle

Le build fonctionne **localement** sans erreur ! Cela signifie que le problème est probablement lié à l'environnement Render.

## 🔍 Causes Possibles de l'Erreur Status 2

### 1. Variable DATABASE_URL manquante pendant le build

**Problème** : Prisma essaie peut-être de se connecter pendant `prisma:generate`

**Solution** : Normalement `prisma generate` ne nécessite pas de connexion DB, mais vérifiez les logs Render.

### 2. Dépendances manquantes

**Vérification** : Assurez-vous que `package-lock.json` est commité :
```bash
git ls-files | grep package-lock.json
```

### 3. Erreur de permissions

**Solution** : Vérifiez que Render peut exécuter les commandes de build.

## 📋 Actions Immédiates

### Étape 1 : Vérifier les Logs Render

1. Allez dans **Render Dashboard** → **kryptpay-api** → **Logs**
2. Faites défiler jusqu'au début du build
3. Cherchez l'erreur exacte (généralement en rouge)

**Partagez l'erreur exacte** pour une aide ciblée.

### Étape 2 : Configurer REDIS_URL

Même si Redis n'est pas critique pour le build, configurez-le :

1. Dans **Render Dashboard** → **kryptpay-api** → **Environment**
2. Ajoutez :
   ```
   REDIS_URL=rediss://default:VOTRE_TOKEN@civil-cub-33071.upstash.io:6379
   ```
   (Remplacez `VOTRE_TOKEN` par le token depuis Upstash)

### Étape 3 : Vérifier package-lock.json

Assurez-vous que `package-lock.json` est commité :
```bash
git add package-lock.json
git commit -m "chore: Add package-lock.json"
git push origin main
```

### Étape 4 : Redéployer

Après avoir configuré REDIS_URL et vérifié package-lock.json :
1. Dans Render Dashboard → **kryptpay-api** → **Manual Deploy**
2. Sélectionnez le commit le plus récent
3. Cliquez sur **Deploy**

## 🎯 Configuration REDIS_URL avec Upstash

D'après votre console Upstash :

### Option 1 : URL complète (Recommandée)

Dans Render Dashboard → kryptpay-api → Environment :
```
REDIS_URL=rediss://default:VOTRE_TOKEN_COMPLET@civil-cub-33071.upstash.io:6379
```

**Format complet** : `rediss://default:PASSWORD@HOST:6379`

### Option 2 : Variables séparées (Alternative)

Si l'URL ne fonctionne pas :
```
REDIS_HOST=civil-cub-33071.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_TOKEN_COMPLET
```

## 🔑 Obtenir le Token Upstash

1. Console Upstash → Redis `kryptpay` → **Details**
2. Section **Connect** → Onglet **TCP**
3. Cliquez sur l'icône 👁️ pour révéler le token
4. Copiez le token complet (pas juste les premiers caractères)

## ✅ Corrections Apportées au Code

1. ✅ **Support TLS pour Upstash** : Le code Redis supporte maintenant `rediss://`
2. ✅ **Configuration render.yaml** : REDIS_URL configurée correctement

## 🚀 Prochaines Étapes

1. ✅ **Configurer REDIS_URL** dans Render avec votre URL Upstash
2. 🔍 **Vérifier les logs Render** pour l'erreur exacte de build
3. ✅ **Vérifier package-lock.json** est commité
4. 🔄 **Redéployer** après configuration

---

**💡 Astuce** : Les logs Render sont très détaillés. L'erreur exacte sera visible dans les logs de build.
