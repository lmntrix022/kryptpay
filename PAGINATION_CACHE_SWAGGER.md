# Pagination, Cache Redis, et Documentation Swagger

Ce document décrit les trois nouvelles fonctionnalités ajoutées à l'API BoohPay :

1. **Pagination complète**
2. **Cache Redis**
3. **Documentation API (Swagger)**

---

## 1. Pagination complète

### Vue d'ensemble

La pagination complète permet de naviguer à travers les listes de données (transactions, payouts, subscriptions, etc.) avec des métadonnées complètes sur la pagination.

### Utilisation

#### Paramètres de pagination

Les endpoints de liste acceptent maintenant les paramètres suivants :

- `page` : Numéro de page (commence à 1)
- `limit` : Nombre d'éléments par page (défaut: 20, max: 100)
- `offset` : Offset pour la pagination (alternative à `page`)

**Exemples :**

```bash
# Pagination par page
GET /v1/admin/transactions?page=1&limit=20

# Pagination par offset
GET /v1/admin/transactions?offset=0&limit=20

# Pagination avec filtres
GET /v1/admin/transactions?page=2&limit=50&gateway=STRIPE&status=SUCCEEDED
```

#### Format de réponse

Quand la pagination complète est utilisée, la réponse inclut :

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  },
  "totals": {
    "volumeMinor": 320000,
    "transactions": 150,
    "byGateway": {...},
    "byStatus": {...}
  }
}
```

### Rétrocompatibilité

Les endpoints continuent de supporter l'ancien format de réponse (avec `items` et `metadata`) pour la compatibilité :

```json
{
  "items": [...],
  "metadata": {
    "limit": 20,
    "returned": 20
  },
  "totals": {...}
}
```

### Endpoints mis à jour

- `GET /v1/admin/transactions` - Liste des transactions
- `GET /v1/payments` - Liste des paiements (à venir)
- `GET /v1/admin/payouts` - Liste des payouts (à venir)
- `GET /v1/admin/subscriptions` - Liste des abonnements (à venir)

---

## 2. Cache Redis

### Vue d'ensemble

Le cache Redis permet d'améliorer les performances en mettant en cache les résultats des requêtes fréquentes. Le cache est automatiquement invalidé quand les données changent.

### Service de cache

Le service `CacheService` est disponible globalement et peut être injecté dans n'importe quel service :

```typescript
import { CacheService } from '../../common/services/cache.service';

constructor(private readonly cacheService: CacheService) {}

// Récupérer du cache
const cached = await this.cacheService.get<MyType>('cache:key');

// Stocker dans le cache avec TTL
await this.cacheService.set('cache:key', data, CacheService.TTL.MEDIUM); // 5 minutes

// Supprimer du cache
await this.cacheService.delete('cache:key');

// Supprimer par pattern
await this.cacheService.deletePattern('payments:list:*');
```

### TTL disponibles

```typescript
CacheService.TTL.SHORT      // 60 secondes (1 minute)
CacheService.TTL.MEDIUM     // 300 secondes (5 minutes)
CacheService.TTL.LONG       // 1800 secondes (30 minutes)
CacheService.TTL.VERY_LONG  // 3600 secondes (1 heure)
CacheService.TTL.DAY        // 86400 secondes (24 heures)
```

### Génération de clés de cache

```typescript
const cacheKey = CacheService.generateKey(
  'payments:list',
  merchantId,
  gateway,
  status,
  page,
  limit
);
// Résultat: "payments:list:merchant123:STRIPE:SUCCEEDED:1:20"
```

### Mise en cache automatique

Les listes de paiements sont automatiquement mises en cache avec un TTL de 5 minutes. Le cache est invalidé automatiquement quand :
- Un nouveau paiement est créé
- Un paiement est mis à jour (via webhook)

### Configuration

Le cache Redis utilise la configuration existante :

- `REDIS_URL` : URL complète de Redis (ex: `redis://localhost:6379`)
- `REDIS_HOST` : Host Redis (défaut: `localhost`)
- `REDIS_PORT` : Port Redis (défaut: `6379`)
- `REDIS_PASSWORD` : Mot de passe Redis (optionnel)

---

## 3. Documentation API (Swagger)

### Vue d'ensemble

La documentation API est maintenant disponible via Swagger/OpenAPI, permettant aux développeurs d'explorer et de tester l'API directement depuis le navigateur.

### Accès à la documentation

Une fois l'application démarrée, la documentation Swagger est disponible à :

```
http://localhost:3000/api
```

### Authentification dans Swagger

Swagger supporte deux types d'authentification :

1. **JWT Bearer Token** : Pour l'authentification utilisateur
   - Cliquez sur "Authorize" en haut à droite
   - Sélectionnez "JWT-auth"
   - Entrez votre token JWT : `Bearer <your-token>`

2. **API Key** : Pour l'authentification marchand
   - Cliquez sur "Authorize"
   - Sélectionnez "api-key"
   - Entrez votre API key dans le champ `x-api-key`

### Tags disponibles

- **Payments** : Gestion des paiements
- **Admin** : Endpoints administrateurs (transactions, payouts, analytics)
- **Webhooks** : Réception des webhooks des fournisseurs
- **Providers** : Gestion des credentials et connectivité
- **Payouts** : Gestion des paiements sortants
- **Subscriptions** : Gestion des abonnements récurrents
- **Sandbox** : Simulation et test des webhooks
- **Filters** : Filtres sauvegardés
- **Notifications** : Préférences et historique

### Exemples d'utilisation

#### Tester un endpoint depuis Swagger

1. Accédez à `http://localhost:3000/api`
2. Authentifiez-vous avec votre JWT ou API key
3. Sélectionnez un endpoint (ex: `POST /v1/payments`)
4. Cliquez sur "Try it out"
5. Remplissez les champs requis
6. Cliquez sur "Execute"
7. Consultez la réponse

#### Export OpenAPI

Vous pouvez exporter la spécification OpenAPI pour l'utiliser avec d'autres outils :

```bash
curl http://localhost:3000/api-json > openapi.json
```

### Configuration

La configuration Swagger se trouve dans `src/main.ts` :

- **Titre** : BoohPay API
- **Version** : 1.0
- **Serveurs** :
  - Development : `http://localhost:3000`
  - Production : `https://api.boohpay.com`

---

## Prochaines étapes

### Pagination

- [ ] Mettre à jour `PayoutsService` pour utiliser la pagination complète
- [ ] Mettre à jour `SubscriptionsService` pour utiliser la pagination complète
- [ ] Ajouter la pagination aux endpoints d'analytics

### Cache

- [ ] Ajouter le cache aux endpoints d'analytics
- [ ] Mettre en cache les credentials des providers (avec TTL court)
- [ ] Mettre en cache les préférences de notifications

### Swagger

- [ ] Ajouter les décorateurs Swagger sur tous les contrôleurs
- [ ] Documenter tous les DTOs avec `@ApiProperty`
- [ ] Ajouter des exemples de requêtes/réponses

---

## Notes techniques

### Pagination

- Le calcul d'offset est automatique si `page` est fourni
- Si `offset` est fourni explicitement, il est utilisé tel quel
- Le `total` est calculé via `COUNT(*)` sur les mêmes filtres
- Les `totals` (volumeMinor, byGateway, etc.) sont calculés sur les résultats paginés (pour la compatibilité)

### Cache

- Le cache utilise JSON pour la sérialisation
- Les erreurs de cache sont loggées mais n'interrompent pas l'exécution
- Le cache est optionnel (si Redis n'est pas disponible, l'application fonctionne normalement)

### Swagger

- Les décorateurs Swagger sont optionnels et n'affectent pas le fonctionnement de l'API
- La documentation est générée automatiquement à partir des types TypeScript
- Les DTOs peuvent être enrichis avec `@ApiProperty` pour une meilleure documentation

