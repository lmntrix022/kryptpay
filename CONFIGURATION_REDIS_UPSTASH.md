# 🔴 Configuration Redis Upstash pour Render

D'après votre console Upstash, voici comment configurer Redis :

## 📋 Informations Upstash

- **Endpoint** : `civil-cub-33071.upstash.io`
- **Port** : `6379`
- **TLS/SSL** : Enabled
- **Token** : (visible dans votre console Upstash)

## 🔧 Configuration dans Render Dashboard

Allez dans **Render Dashboard** → **kryptpay-api** → **Environment**

### Option 1 : URL Redis avec TLS (Recommandé)

Ajoutez la variable :
```
REDIS_URL=rediss://default:VOTRE_TOKEN@civil-cub-33071.upstash.io:6379
```

**⚠️ Important :** Utilisez `rediss://` (avec deux 's') pour TLS/SSL, pas `redis://`

### Option 2 : Variables séparées (Alternative)

Si l'URL ne fonctionne pas, utilisez :
```
REDIS_HOST=civil-cub-33071.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=VOTRE_TOKEN
```

**Note :** Vous devrez peut-être modifier le code pour supporter TLS avec les variables séparées.

## 🔑 Comment obtenir le Token

1. Dans votre console Upstash (https://console.upstash.com)
2. Allez sur votre base Redis `kryptpay`
3. Onglet **"Details"**
4. Section **"Connect"** → Onglet **"TCP"**
5. Le token est visible (cliquez sur l'icône 👁️ pour le révéler)
6. Copiez le token complet

## ✅ Vérification

Une fois configuré, redéployez le service et vérifiez les logs pour confirmer la connexion Redis.
