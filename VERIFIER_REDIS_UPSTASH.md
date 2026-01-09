# 🔍 Vérifier le Contenu de Redis Upstash

## 📋 Ce que Contient Redis Upstash

Votre Redis Upstash (`kryptpay` sur Upstash.com) contient **uniquement des données temporaires** :

### 1. Cache (Données Temporaires)
- Cache des requêtes fréquentes
- Cache des taux de change
- Cache des configurations
- Cache des données d'idempotence
- **⚠️ TTL (Time To Live) : Ces données expirent automatiquement**

### 2. Queues (Tâches en Arrière-plan)
- Queue `webhook-delivery` : Webhooks en attente d'envoi
- Queue des notifications
- **⚠️ Données temporaires de traitement**

### 3. Rate Limiting
- Compteurs de requêtes par IP/merchant
- **⚠️ Données temporaires**

## ❌ Ce que Redis Upstash NE Contient PAS

- ❌ **Utilisateurs** → Dans PostgreSQL
- ❌ **Transactions** → Dans PostgreSQL
- ❌ **Marchands** → Dans PostgreSQL
- ❌ **Données permanentes** → Toutes dans PostgreSQL

## 🔍 Comment Vérifier le Contenu de Redis Upstash

### Option 1 : Via la Console Upstash

1. Allez sur https://console.upstash.com
2. Sélectionnez votre base Redis `kryptpay`
3. Cliquez sur **"Data Browser"** ou **"CLI"**
4. Exécutez des commandes Redis :

```redis
# Voir toutes les clés
KEYS *

# Voir les clés de cache
KEYS cache:*

# Voir les clés d'idempotence
KEYS idempotency:*

# Voir les queues
KEYS bull:*

# Compter le nombre de clés
DBSIZE

# Voir le contenu d'une clé spécifique
GET cache:merchant:12345
```

### Option 2 : Via un Script Node.js

Créez un fichier `check-redis.js` :

```javascript
const Redis = require('ioredis');

// Remplacez par votre URL Redis Upstash
const redis = new Redis('rediss://default:VOTRE_TOKEN@civil-cub-33071.upstash.io:6379', {
  tls: {}
});

async function checkRedis() {
  try {
    // Compter les clés
    const size = await redis.dbsize();
    console.log(`📊 Nombre total de clés: ${size}`);
    
    // Lister toutes les clés
    const keys = await redis.keys('*');
    console.log(`\n🔑 Clés trouvées (${keys.length}):`);
    keys.forEach(key => console.log(`  - ${key}`));
    
    // Voir les clés par catégorie
    const cacheKeys = await redis.keys('cache:*');
    const idempotencyKeys = await redis.keys('idempotency:*');
    const queueKeys = await redis.keys('bull:*');
    
    console.log(`\n📦 Par catégorie:`);
    console.log(`  - Cache: ${cacheKeys.length} clés`);
    console.log(`  - Idempotence: ${idempotencyKeys.length} clés`);
    console.log(`  - Queues: ${queueKeys.length} clés`);
    
    // Voir un exemple de contenu
    if (keys.length > 0) {
      const example = await redis.get(keys[0]);
      console.log(`\n📄 Exemple de contenu (${keys[0]}):`);
      console.log(example);
    }
    
    await redis.quit();
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

checkRedis();
```

Exécutez :
```bash
node check-redis.js
```

## 🎯 Réponse à Votre Question

**Votre Redis Upstash contient-elle vos données ?**

- ✅ **Oui, mais uniquement des données temporaires** :
  - Cache (expire automatiquement)
  - Queues (tâches en traitement)
  - Rate limiting (compteurs temporaires)

- ❌ **Non pour les données permanentes** :
  - Utilisateurs → PostgreSQL
  - Transactions → PostgreSQL
  - Marchands → PostgreSQL

## ⚠️ Important

1. **Redis est vide au démarrage** - C'est normal
2. **Redis se remplit progressivement** - Au fur et à mesure de l'utilisation
3. **Les données expirent** - TTL automatique
4. **Vider Redis n'est pas grave** - Les données permanentes sont dans PostgreSQL

## 📊 État Actuel Probable

Si votre application vient de démarrer :
- Redis est probablement **vide ou presque vide**
- Il se remplira au fur et à mesure :
  - Quand des requêtes sont faites (cache)
  - Quand des webhooks sont envoyés (queues)
  - Quand des utilisateurs font des requêtes (rate limiting)

---

**💡 Conclusion** : Votre Redis Upstash contient des données temporaires (cache, queues), pas vos utilisateurs ou transactions qui sont dans PostgreSQL.
