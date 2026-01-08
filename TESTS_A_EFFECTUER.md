# 🧪 Tests à Effectuer Avant de Continuer

## 📋 Checklist des Tests d'Intégration

### ✅ **Tests Unitaires** - TERMINÉ
- ✅ Tous les tests unitaires passent (19/19)
- ✅ `idempotency.service.spec.ts` ✅
- ✅ `retry.service.spec.ts` ✅
- ✅ `boohpay.exception.spec.ts` ✅

---

### ⚠️ **Tests d'Intégration à Effectuer** (À FAIRE)

#### 1. **Idempotency avec Redis** 🔴 CRITIQUE
**État**: Code restauré mais **non testé en conditions réelles**

**Tests requis**:
- [ ] **Test 1**: Créer un paiement avec `Idempotency-Key` header
- [ ] **Test 2**: Répéter la même requête avec la même clé → doit retourner la même réponse
- [ ] **Test 3**: Utiliser la même clé avec un body différent → doit retourner 400 Bad Request
- [ ] **Test 4**: Vérifier que la réponse est stockée dans Redis (TTL 24h)

**Script nécessaire**: `test-idempotency-integration.sh`

**Prérequis**:
- ✅ Redis doit être démarré et accessible
- ✅ Variable `REDIS_URL` ou `REDIS_HOST`/`REDIS_PORT` configurée

---

#### 2. **Rate Limiting** 🔴 CRITIQUE
**État**: Code restauré mais **non testé en conditions réelles**

**Tests requis**:
- [ ] **Test 1**: Faire 100 requêtes normales → doit passer
- [ ] **Test 2**: Faire 101 requêtes rapides → la 101ème doit retourner 429 (Too Many Requests)
- [ ] **Test 3**: Attendre 1 minute → les requêtes doivent repasser
- [ ] **Test 4**: Tester avec `X-Forwarded-For` header (simulation proxy)

**Script nécessaire**: `test-rate-limiting.sh`

**Configuration actuelle**:
- TTL: 60 secondes (1 minute)
- Limit: 100 requêtes

---

#### 3. **Retry Logic dans les Providers** 🟡 IMPORTANT
**État**: Code restauré mais **non testé en conditions réelles**

**Tests requis**:
- [ ] **Test 1**: Simuler une erreur 500 sur Stripe → doit retry 3 fois
- [ ] **Test 2**: Simuler une erreur 429 sur Moneroo → doit retry avec backoff
- [ ] **Test 3**: Vérifier que les erreurs 4xx ne sont pas retry (sauf 429)
- [ ] **Test 4**: Vérifier le backoff exponentiel (délai croissant)

**Comment tester**:
- Utiliser un mock/stub pour les providers
- Ou utiliser un service de test externe qui simule les erreurs

**Script nécessaire**: `test-retry-logic.sh` (nécessite mocks)

---

#### 4. **Transactions Database** 🟡 IMPORTANT
**État**: Code corrigé mais **non vérifié**

**Tests requis**:
- [ ] **Test 1**: Créer un payout qui échoue → vérifier que la transaction rollback (pas de payout créé)
- [ ] **Test 2**: Créer un refund qui échoue → vérifier que la transaction rollback (pas de refund créé)
- [ ] **Test 3**: Vérifier l'atomicité : si le provider call échoue, le payment/refund/payout n'est pas créé en DB

**Comment tester**:
- Forcer une erreur dans le provider call
- Vérifier que rien n'est créé en DB

**Script nécessaire**: `test-transactions.sh`

---

#### 5. **Error Handling Standardisé** 🟢 BON À TESTER
**État**: Code restauré mais **non testé**

**Tests requis**:
- [ ] **Test 1**: Créer une requête invalide → vérifier le format de réponse standardisé
- [ ] **Test 2**: Tester ValidationException → format correct
- [ ] **Test 3**: Tester NotFoundException → format correct
- [ ] **Test 4**: Tester une erreur 500 → format correct avec timestamp et path

**Script nécessaire**: `test-error-handling.sh`

---

#### 6. **E2E Tests Complets** 🟢 BON À TESTER
**État**: Un seul test E2E basique existe

**Tests requis**:
- [ ] **Test 1**: Créer un paiement complet (de bout en bout)
- [ ] **Test 2**: Tester le webhook Stripe
- [ ] **Test 3**: Tester le webhook Moneroo
- [ ] **Test 4**: Tester un refund complet

**Fichier**: `test/payments.e2e-spec.ts` (à compléter)

---

## 🎯 Priorité des Tests

### 🔴 **Critique - À tester avant de continuer**
1. **Idempotency** - Fonctionnalité critique pour éviter les paiements en double
2. **Rate Limiting** - Protection essentielle contre les abus

### 🟡 **Important - Recommandé**
3. **Retry Logic** - Améliore la résilience mais peut attendre
4. **Transactions Database** - Important pour la cohérence des données

### 🟢 **Nice to Have**
5. **Error Handling** - Important pour le debugging
6. **E2E Tests** - Bon pour la validation globale

---

## 🚀 Scripts de Test à Créer

1. `test-idempotency-integration.sh` - Test idempotency avec Redis
2. `test-rate-limiting.sh` - Test rate limiting
3. `test-retry-logic.sh` - Test retry logic (nécessite mocks)
4. `test-transactions.sh` - Test atomicité transactions
5. `test-error-handling.sh` - Test format d'erreurs

---

## ⚡ Tests Rapides à Faire Maintenant

### Test 1: Vérifier que Redis est accessible
```bash
# Vérifier que Redis est démarré
docker ps | grep redis || redis-cli ping
```

### Test 2: Vérifier que l'application démarre avec toutes les nouvelles dépendances
```bash
npm run start:dev
# Vérifier qu'il n'y a pas d'erreurs au démarrage
```

### Test 3: Tester un appel API simple
```bash
# Test basique sans idempotency (devrait fonctionner)
curl -X POST http://localhost:3000/v1/payments \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"test-123","amount":1000,"currency":"USD","countryCode":"US","paymentMethod":"CARD"}'
```

---

## 📝 Recommandation

**Avant de continuer, tester au minimum**:
1. ✅ Vérifier que l'app démarre sans erreur
2. 🔴 Tester Idempotency (1-2 tests manuels rapides)
3. 🔴 Tester Rate Limiting (1 test rapide avec plusieurs requêtes)
4. 🟡 Vérifier Transactions (1 test de rollback)

Les autres tests peuvent être faits plus tard ou en continu.

