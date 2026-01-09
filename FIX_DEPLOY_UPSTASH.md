# 🔧 Correction du Déploiement avec Upstash Redis

## 📋 Problèmes Identifiés

1. ✅ **Corrigé** : Référence Redis dans render.yaml
2. ✅ **Corrigé** : Support TLS pour Upstash Redis
3. 🔍 **À vérifier** : Erreur de build (status 2)

## 🔴 Configuration Redis Upstash

D'après votre console Upstash, configurez dans **Render Dashboard** → **kryptpay-api** → **Environment** :

### Méthode 1 : URL avec TLS (Recommandée)

```
REDIS_URL=rediss://default:VOTRE_TOKEN@civil-cub-33071.upstash.io:6379
```

**⚠️ Important :** 
- Utilisez `rediss://` (avec deux 's') pour TLS
- Remplacez `VOTRE_TOKEN` par le token visible dans votre console Upstash

### Comment obtenir le Token Upstash

1. Dans https://console.upstash.com
2. Allez sur votre base Redis `kryptpay`
3. Onglet **"Details"**
4. Section **"Connect"** → Onglet **"TCP"**
5. Cliquez sur l'icône 👁️ pour révéler le token
6. Copiez le token complet (commence par `AX...` ou similaire)

### Méthode 2 : Variables séparées (Alternative)

Si l'URL ne fonctionne pas, utilisez :
```
REDIS_HOST=civil-cub-33071.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_TOKEN
```

## 🔍 Vérifier l'Erreur de Build

Le déploiement échoue avec "status 2". Pour voir l'erreur exacte :

1. Dans Render Dashboard → **kryptpay-api** → **Logs**
2. Cherchez les erreurs TypeScript ou de build
3. Les erreurs courantes :
   - Erreurs TypeScript (vérifiez avec `npm run build` localement)
   - Dépendances manquantes
   - Erreurs Prisma

## ✅ Corrections Apportées

1. **Support TLS pour Upstash** : Le code Redis a été mis à jour pour supporter `rediss://` (TLS)
2. **Configuration Render** : REDIS_URL est maintenant configurée comme `sync: false` (manuel)

## 📝 Actions Immédiates

1. **Configurer REDIS_URL dans Render** :
   - Allez dans Render Dashboard → kryptpay-api → Environment
   - Ajoutez `REDIS_URL` avec votre URL Upstash (format `rediss://`)

2. **Vérifier les logs de build** :
   - Regardez les logs dans Render pour voir l'erreur exacte
   - Partagez l'erreur si besoin d'aide

3. **Tester le build localement** :
   ```bash
   npm ci
   npm run prisma:generate
   npm run build
   ```

## 🚀 Prochaines Étapes

1. Ajoutez REDIS_URL dans Render avec votre URL Upstash
2. Vérifiez les logs de build pour l'erreur exacte
3. Redéployez après correction

---

**Note** : Le code a été mis à jour pour supporter TLS avec Upstash Redis. Assurez-vous d'utiliser `rediss://` dans l'URL.
