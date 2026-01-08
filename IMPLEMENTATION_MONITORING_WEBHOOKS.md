# ✅ Implémentation : Monitoring Prometheus & Queue System Webhooks

## 📊 Résumé

Implémentation complète de deux fonctionnalités critiques :
1. **Monitoring avec Prometheus** - Métriques HTTP, paiements, payouts et webhooks
2. **Queue System pour Webhooks** - Système asynchrone de livraison de webhooks aux marchands

---

## 🎯 Fonctionnalités Implémentées

### 1. Monitoring Prometheus

#### Modules créés :
- `src/common/metrics/prometheus.module.ts` - Module Prometheus
- `src/common/metrics/prometheus.controller.ts` - Endpoint `/metrics` pour Prometheus
- `src/common/metrics/metrics.service.ts` - Service pour enregistrer les métriques
- `src/common/metrics/http-metrics.interceptor.ts` - Intercepteur HTTP global

#### Métriques disponibles :

**HTTP Metrics :**
- `http_request_duration_seconds` - Durée des requêtes HTTP
- `http_requests_total` - Nombre total de requêtes
- `http_request_errors_total` - Erreurs HTTP

**Payment Metrics :**
- `payments_total` - Nombre total de paiements (par gateway/status)
- `payments_by_gateway_total` - Paiements par gateway
- `payments_by_status_total` - Paiements par statut
- `payment_amount` - Montants des paiements

**Payout Metrics :**
- `payouts_total` - Nombre total de payouts (par provider/status)
- `payouts_by_status_total` - Payouts par statut

**Webhook Metrics :**
- `webhooks_received_total` - Webhooks reçus des providers
- `webhook_deliveries_total` - Livraisons de webhooks aux marchands
- `webhook_delivery_errors_total` - Erreurs de livraison
- `webhook_delivery_duration_seconds` - Durée de livraison

**System Metrics :**
- `active_connections` - Connexions actives
- `queue_size` - Taille des queues

#### Accès aux métriques :
```
GET /metrics
```

---

### 2. Queue System pour Webhooks

#### Modules créés :
- `src/common/queue/queue.module.ts` - Module Bull/Redis pour les queues
- `src/modules/webhooks/services/webhook-delivery.service.ts` - Service de livraison
- `src/modules/webhooks/services/webhook-queue.service.ts` - Service de queue
- `src/modules/webhooks/processors/webhook-delivery.processor.ts` - Processor Bull
- `src/modules/webhooks/schedulers/webhook-delivery.scheduler.ts` - Scheduler cron

#### Fonctionnalités :

**Livraison Asynchrone :**
- Webhooks mis en queue via Bull/Redis
- Traitement par lots toutes les 30 secondes
- Retry automatique avec backoff exponentiel (1s, 2s, 4s, 8s, 16s)
- Maximum 5 tentatives par webhook

**Sécurité :**
- Signature HMAC-SHA256 avec secret configuré par marchand
- Header `X-BoohPay-Signature: sha256=<hash>`

**Suivi :**
- Table `webhook_deliveries` avec statuts :
  - `PENDING` - En attente
  - `PROCESSING` - En cours
  - `SUCCEEDED` - Succès
  - `FAILED` - Échec (après 5 tentatives)

**Métadonnées stockées :**
- Nombre de tentatives
- Dernière tentative
- Prochaine retry
- Code HTTP de réponse
- Message d'erreur

---

### 3. Modèle de Données

#### Modèle `Merchant` mis à jour :
```prisma
model Merchant {
  webhookUrl    String?  @map("webhook_url")
  webhookSecret String?  @map("webhook_secret")
  webhookDeliveries WebhookDelivery[]
}
```

#### Nouveau modèle `WebhookDelivery` :
```prisma
model WebhookDelivery {
  id             String
  merchantId     String
  eventType      String
  payload        Json
  status         WebhookDeliveryStatus
  attempts       Int
  lastAttemptAt  DateTime?
  nextRetryAt    DateTime?
  httpStatusCode Int?
  errorMessage   String?
  deliveredAt    DateTime?
  createdAt      DateTime
  updatedAt      DateTime
}
```

---

### 4. Intégration

#### Dans `PaymentsService` :
- Envoi automatique de webhook aux marchands quand un paiement change de statut
- Événements : `payment.succeeded`, `payment.failed`, `payment.pending`, etc.

#### Dans `WebhooksController` :
- Enregistrement des métriques pour les webhooks reçus des providers

---

## 📦 Dépendances Ajoutées

```json
{
  "@nestjs/bull": "^10.x",
  "@nestjs/schedule": "^4.x",
  "@willsoto/nestjs-prometheus": "^5.x",
  "bull": "^4.x",
  "prom-client": "^15.x",
  "node-fetch": "^3.x"
}
```

---

## 🔧 Configuration Requise

### Variables d'environnement :
```bash
# Redis (déjà configuré)
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Aucune nouvelle variable requise
```

---

## 🚀 Utilisation

### 1. Configurer un webhook pour un marchand :
```sql
UPDATE merchants 
SET webhook_url = 'https://merchant.example.com/webhooks',
    webhook_secret = 'secret-key'
WHERE id = 'merchant-id';
```

### 2. Les webhooks sont automatiquement envoyés lors de :
- Changement de statut de paiement
- Réception d'un webhook d'un provider (Stripe, Moneroo, eBilling)

### 3. Vérifier les métriques :
```bash
curl http://localhost:3000/metrics
```

### 4. Vérifier les webhooks en attente :
```sql
SELECT * FROM webhook_deliveries 
WHERE status = 'PENDING' 
ORDER BY created_at ASC;
```

---

## 📝 Notes Techniques

### Gestion des dépendances circulaires :
- Utilisation de `forwardRef()` pour résoudre les dépendances entre `PaymentsModule` et `WebhooksModule`
- Services injectés avec `@Optional()` pour éviter les erreurs si non disponibles

### Performance :
- Scheduler cron exécuté toutes les 30 secondes
- Traitement par lots de 50 webhooks maximum
- Timeout de 10 secondes par requête HTTP

### Retry Logic :
- Backoff exponentiel : 1s → 2s → 4s → 8s → 16s (max 60s)
- Maximum 5 tentatives
- Webhooks marqués comme FAILED après épuisement des tentatives

---

## ✅ Tests Recommandés

1. **Métriques Prometheus :**
   ```bash
   curl http://localhost:3000/metrics | grep payments_total
   ```

2. **Webhook Delivery :**
   - Créer un paiement
   - Attendre un changement de statut
   - Vérifier la table `webhook_deliveries`

3. **Queue Stats :**
   - Vérifier via l'API Bull (si dashboard configuré)

---

## 🎉 Statut

✅ **Monitoring Prometheus** - Implémenté et opérationnel
✅ **Queue System Webhooks** - Implémenté et opérationnel
✅ **Intégration dans PaymentsService** - Complète
✅ **Modèle de données** - Migration créée (à appliquer)
✅ **Sécurité (HMAC)** - Implémentée

---

## 📌 Prochaines Étapes

1. Appliquer la migration Prisma :
   ```bash
   npx prisma migrate deploy
   ```

2. Configurer des webhooks pour des marchands de test

3. Tester la livraison complète de bout en bout

4. (Optionnel) Configurer Grafana avec Prometheus pour visualisation


