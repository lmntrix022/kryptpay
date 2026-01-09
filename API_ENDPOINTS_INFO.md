# 📋 API Endpoints - Informations

## 🔍 Endpoints Disponibles

### Health Check
- **GET** `/health` - Vérifie l'état de l'API
  - Réponse : `{ "status": "ok" }`
  - Exclu du préfixe `v1`

### Documentation API
- **GET** `/api` - Documentation Swagger/OpenAPI
  - Exclu du préfixe `v1`

### Métriques
- **GET** `/metrics` - Métriques Prometheus
  - Exclu du préfixe `v1`

### API Principale
Tous les autres endpoints sont préfixés par `/v1` :
- `/v1/payments/*` - Gestion des paiements
- `/v1/auth/*` - Authentification
- `/v1/webhooks/*` - Webhooks
- etc.

## ❌ Pourquoi 404 sur `/` ?

L'API n'a **pas de route définie pour `/`**. C'est normal et attendu.

Pour vérifier que l'API fonctionne, utilisez :
- **GET** `https://kryptpay-api.onrender.com/health` ✅
- **GET** `https://kryptpay-api.onrender.com/api` ✅ (Documentation Swagger)

## 🔧 Configuration

Le préfixe global est configuré dans `src/main.ts` :

```typescript
app.setGlobalPrefix('v1', {
  exclude: ['/metrics', '/health', '/api'],
});
```

Cela signifie que :
- `/health` → accessible directement
- `/api` → accessible directement  
- `/metrics` → accessible directement
- Tout le reste → nécessite le préfixe `/v1`

---

**Note** : La 404 sur `/` est normale. Utilisez `/health` pour vérifier que l'API fonctionne.
